<template>
  <div class="game-page" :style="{ backgroundColor: tableColor }">
    <div class="top-section bot-hand-area">
      <div class="hand-container opponent-hand">
        <div
          v-for="n in store.gameState.botHand.length"
          :key="n"
          class="card-slot facedown-card"
        >
          <img :src="cardBackUrl" alt="Opponent Card" />
        </div>
      </div>
    </div>

    <div class="middle-section">
      <div class="deck-trump-area">
        <div class="deck-container" v-if="store.gameState.deck.length > 0">
          <img
            v-if="store.gameState.trunfo"
            :src="store.gameState.trunfo.imageUrl"
            class="trump-card-under"
            alt="Trunfo"
          />
          <img :src="cardBackUrl" class="deck-card-top" alt="Deck" />
          <span class="deck-count">{{ store.gameState.deck.length }}</span>
        </div>
      </div>

      <div class="table-cards-center">
        <div class="card-slot table-slot">
          <GameCard
            v-if="store.gameState.tableCards[0]"
            :card="store.gameState.tableCards[0]"
            :isMyTurn="false"
          />
        </div>
        <div class="card-slot table-slot">
          <GameCard
            v-if="store.gameState.tableCards[1]"
            :card="store.gameState.tableCards[1]"
            :isMyTurn="false"
          />
        </div>
      </div>

      <div class="right-spacer">
        <div class="score-board">
          <p class="text-yellow-400 font-bold">
            Tu: {{ store.playerMatchScore }} ({{
              store.gameState.playerScore
            }}
            pts)
          </p>
          <p class="text-red-400 font-bold">
            Oponente: {{ store.botMatchScore }} ({{
              store.gameState.botScore
            }}
            pts)
          </p>
        </div>
      </div>
    </div>

    <div class="bottom-section">
      <div class="hand-container player-hand">
        <div v-if="store.moveError" class="error-msg">
          {{ store.moveError }}
        </div>

        <div
          v-if="!store.gameState.playerTurn && !store.gameState.gameFinished"
          class="text-yellow-300 mb-2 animate-pulse font-bold bg-black/30 px-3 py-1 rounded"
        >
          À espera do oponente...
        </div>
        <div
          v-if="store.gameState.playerTurn && !store.gameState.gameFinished"
          class="text-green-300 mb-2 font-bold bg-black/30 px-3 py-1 rounded"
        >
          A tua vez!
        </div>

        <div class="cards-row">
          <GameCard
            v-for="card in store.gameState.playerHand"
            :key="card.rank.name + card.suit"
            :card="card"
            :isMyTurn="store.gameState.playerTurn"
            :isProcessing="store.gameState.isProcessingMove"
            @play-card="handlePlayCard"
          />
        </div>
      </div>
    </div>

    <!-- Modal de Resultados -->
    <GameResultModal
      :show="showResultModal"
      :playerScore="store.gameState.playerScore"
      :opponentScore="store.gameState.botScore"
      :playerMarks="store.playerMatchScore"
      :opponentMarks="store.botMatchScore"
      :isMatchMode="isMatchMode"
      :isMatchOver="store.isMatchOver"
      :matchWinner="store.matchWinner"
      :allowForfeit="!store.isMatchOver"
      :awaitingOpponent="store.awaitingOpponent"
      @next-game="handleNextGame"
      @forfeit="showQuitModal = true"
      @back-to-menu="router.push('/')"
    />

    <!-- Modal de Confirmação de Desistência -->
    <QuitConfirmationModal
      :show="showQuitModal"
      :betAmount="currentBet"
      @confirm="handleForfeit"
      @cancel="showQuitModal = false"
    />

    <!-- Botão de Desistir (apenas durante jogo ativo) -->
    <div v-if="!store.gameState.gameFinished" class="fixed bottom-6 left-6 z-50">
      <button
        @click="showQuitModal = true"
        class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg flex items-center gap-2 border-2 border-red-800"
      >
        <span>🏳️ Desistir</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, inject } from "vue";
import { useRouter, onBeforeRouteLeave } from "vue-router";
import { useGameStore } from "../../stores/gameStore";
import { useAuthStore } from "../../stores/auth";
import { useSocketStore } from "../../stores/socket";
import GameCard from "../../components/game/GameCard.vue";
import GameResultModal from "../../components/game/GameResultModal.vue";
import QuitConfirmationModal from "../../components/game/QuitConfirmationModal.vue";

const store = useGameStore();
const authStore = useAuthStore();
const socketStore = useSocketStore();
const socket = inject("socket");
const serverBaseURL = inject("serverBaseURL");
const router = useRouter();

const showResultModal = ref(false);
const showQuitModal = ref(false);

const cardBackUrl = computed(
  () =>
    `${serverBaseURL}/api/card-image-proxy/${
      authStore.user?.custom?.equipped_card || "cardflipped.png"
    }`
);

const tableColor = computed(() => {
  const equipped = authStore.user?.custom?.equipped_table || "green";
  const colors = {
    green: "#1E8449",
    red: "#922B21",
    blue: "#1F618D",
    black: "#17202A",
  };
  return colors[equipped] || "#1E8449";
});

const currentBet = computed(
  () => store.multiplayerGame?.betAmount || store.gameState?.betAmount || 0
);

const isMatchMode = computed(() => store.gameState.playMode === 'match');

const handlePlayCard = (card) => {
  store.playCard(card, socket);
};

// ========================================
// OBSERVAÇÃO DO ESTADO DO JOGO
// ========================================

// Observar quando o jogo termina (servidor envia game_ended)
watch(() => store.gameState.gameFinished, (finished) => {
  if (finished && isMatchMode.value) {
    // Mostrar modal de resultados
    showResultModal.value = true;
  }
});

// Fechar modal apenas quando ambos estão prontos para novo jogo
watch(() => store.gameEnded, (ended) => {
  if (!ended) {
    // Próximo jogo iniciou, fechar modal
    showResultModal.value = false;
  }
});

// ========================================
// HANDLERS DOS BOTÕES
// ========================================

const handleNextGame = () => {
  // Solicitar próximo jogo (emite socket e fica aguardando oponente)
  store.requestNextGame(socket);
};

const handleForfeit = () => {
  showQuitModal.value = false;
  // Chamar forfeit no store (emite socket e chama API)
  store.forfeitMatch(socket, currentBet.value);
};

// ========================================
// INICIALIZAÇÃO
// ========================================

onMounted(() => {
  // Vincular socket à store
  store.bindSocket(socket);
  
  // Configurar listeners de socket (game_ended, opponent_forfeit, start_next_round)
  store.setupSocketListeners(socket);
});

// Impedir saída durante jogo ativo sem confirmação
onBeforeRouteLeave((to, from, next) => {
  if (store.gameState.gameFinished || store.isMatchOver) {
    next();
    return;
  }

  showQuitModal.value = true;
  next(false); // Bloqueia navegação
});
</script>

<style scoped>
.game-page {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 10px;
  box-sizing: border-box;
  color: white;
  overflow: hidden;
  position: relative;
}
:root {
  --card-width: 95px;
  --card-height: 135px;
}
.card-slot {
  width: 95px;
  height: 135px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.card-slot img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
}
.top-section {
  height: 150px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
.hand-container.opponent-hand {
  display: flex;
  flex-direction: row;
  gap: 5px;
}
.opponent-hand .facedown-card {
  margin-left: -40px;
}
.opponent-hand .facedown-card:first-child {
  margin-left: 0;
}
.middle-section {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}
.deck-trump-area {
  flex: 1;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}
.deck-container {
  position: relative;
  width: 120px;
  height: 135px;
}
.deck-card-top {
  position: absolute;
  top: 0;
  left: 0;
  width: 95px;
  height: 135px;
  z-index: 10;
  border-radius: 8px;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.5);
}
.trump-card-under {
  position: absolute;
  top: 20px;
  left: 25px;
  width: 95px;
  height: 135px;
  z-index: 5;
  border-radius: 8px;
}
.deck-count {
  position: absolute;
  top: -10px;
  left: -10px;
  background: red;
  color: white;
  border-radius: 50%;
  width: 25px;
  height: 25px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  z-index: 15;
}
.table-cards-center {
  flex: 2;
  display: flex;
  justify-content: center;
  gap: 30px;
}
.table-slot {
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 8px;
}
.right-spacer {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
}
.score-board {
  background: rgba(0, 0, 0, 0.4);
  padding: 15px;
  border-radius: 8px;
  text-align: right;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.bottom-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 20px;
}
.hand-container.player-hand {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.cards-row {
  display: flex;
  justify-content: center;
  gap: 5px;
  flex-wrap: wrap;
}
.error-msg {
  color: #ff6b6b;
  font-weight: bold;
  margin-bottom: 5px;
  background: rgba(0, 0, 0, 0.8);
  padding: 4px 12px;
  border-radius: 4px;
}
</style>
