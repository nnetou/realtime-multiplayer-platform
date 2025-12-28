<template>
  <!-- Adiciona um v-if no topo para só renderizar quando o estado básico existir -->
  <div v-if="store.gameState.id" class="game-page">
    <!-- ÁREA DO OPONENTE -->
    <div class="top-section opponent-hand-area">
      <div class="player-info" v-if="opponent">
        <h3>{{ opponent.nickname }}</h3>
      </div>
      <div v-if="store.gameState.botHand" class="hand-container opponent-hand">
        <div
          v-for="n in store.gameState.botHand.length"
          :key="n"
          class="card-slot facedown-card"
        >
          <img :src="cardBackUrl" alt="Opponent Card" />
        </div>
      </div>
    </div>

    <!-- ÁREA DO MEIO (Mesa, Baralho, Pontuação) -->
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
        <div class="deck-container" v-else-if="store.gameState.trunfo">
          <img
            :src="store.gameState.trunfo.imageUrl"
            class="trump-card-solo"
            alt="Trunfo"
          />
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
        <!-- Usa as novas propriedades computadas para o placar -->
        <div class="score-board" v-if="player && opponent">
          <p>{{ player.nickname }}: {{ store.gameState.playerScore }}</p>
          <p>{{ opponent.nickname }}: {{ store.gameState.botScore }}</p>
        </div>
      </div>
    </div>

    <!-- ÁREA DO JOGADOR -->
    <div class="bottom-section">
      <!-- Overlay de Fim de Jogo (simplificado para multiplayer) -->
      <div v-if="store.gameState.gameFinished" class="overlay">
        <h1>JOGO TERMINADO</h1>
        <h2 style="color: #f1c40f; font-size: 2rem">
          {{ store.gameState.playerScore }} - {{ store.gameState.botScore }}
        </h2>
        <h3 style="margin-bottom: 20px">{{ store.lastGameResult }}</h3>
        <div class="overlay-buttons">
          <button @click="router.push({ name: 'lobby' })" class="btn-next">
            Voltar ao Lobby
          </button>
        </div>
      </div>

      <div class="player-info" v-if="player">
        <h3>{{ player.nickname }} (You)</h3>
      </div>
      <!-- Usa a nova propriedade 'myHand' -->
      <div v-if="store.gameState.playerHand" class="hand-container player-hand">
        <div v-if="store.moveError" class="error-msg">
          {{ store.moveError }}
        </div>
        <div class="cards-row">
          <GameCard
            v-for="card in store.gameState.playerHand"
            :key="card.rank.name + card.suit"
            :card="card"
            :isPlayable="isMyTurn"
            :isProcessing="store.gameState.isProcessingMove"
            @play-card="store.playCard"
          />
          {{
            console.log(
              "Is my turn:",
              isMyTurn,
              "Is processing:",
              store.gameState.isProcessingMove
            )
          }}
        </div>
      </div>
    </div>
  </div>
  <!-- Ecrã de carregamento enquanto o estado não chega -->
  <div v-else class="loading-screen">
    <h1>Connecting to game...</h1>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useGameStore } from "../../stores/gameStore";
import { useAuthStore } from "@/stores/auth";
import GameCard from "../../components/game/GameCard.vue";
import { toast } from "vue-sonner";

const store = useGameStore();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const API_URL = "http://localhost:8000";
const cardBackUrl = `${API_URL}/images/cartas/playing-cards-master/cardflipped.png`;

const isPlayer1 = computed(() => {
  if (!authStore.currentUser || !store.gameState.player1) return false;
  return store.gameState.player1.id === authStore.currentUser.id;
});

// O objeto do jogador local
const player = computed(() =>
  isPlayer1.value ? store.gameState.player1 : store.gameState.player2
);

// O objeto do oponente
const opponent = computed(() =>
  isPlayer1.value ? store.gameState.player2 : store.gameState.player1
);

// Determina se é a vez do jogador local
const isMyTurn = computed(() => {
  // Garante que os dados necessários existem antes de fazer a verificação
  if (!player.value.id || !authStore.currentUser) {
    return false;
  }
  return player.value.id === authStore.currentUser.id;
});

console.log(
  "[MultiPlayerGamePage] isProcessingMove:",
  store.gameState.isProcessingMove
);

onMounted(() => {
  console.log(
    `[MultiPlayerGamePage] Mounted for game ID: ${store.gameState.id}.`
  );

  // Verifica se o estado do jogo na store corresponde ao ID da rota.
  // Se não corresponder, significa que o utilizador deu refresh ou entrou por um link direto.
  if (!store.gameState.id) {
    toast.error("Game state not found. Returning to lobby.");
    router.push({ name: "lobby" });
    return;
  }

  //VER SE ESTÁ CORRETO
  if (store.gameState.deck.length === 0 && !store.gameState.gameFinished) {
    store.startGame();
  }
  // A página está pronta. A socketStore já está a ouvir os eventos do jogo.
});

// try {
//   await apiStore.postGame(gamePayload);
//   if (playMode.value === "match")
//     toast.success("Match guardado. Derrota por desistência.");
//   else toast.success("Jogo guardado.");
// } catch (error) {
//   console.error("Erro ao guardar jogo:", error);
//   toast.error("Erro ao comunicar com a API.");
// } finally {
//   router.push("/");
// }
</script>

<style scoped>
:root {
  --card-width: 95px;
  --card-height: 135px;
}

.game-page {
  background-color: #1e8449;
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 10px;
  box-sizing: border-box;
  color: white;
  overflow: hidden;
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

.trump-card-solo {
  width: 95px;
  height: 135px;
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
  background: rgba(0, 0, 0, 0.2);
  padding: 10px;
  border-radius: 5px;
  text-align: right;
}

.bottom-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 10px;
}

.hand-container.player-hand {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* CSS ORIGINAL: Cartas em linha com flex-wrap */
.cards-row {
  display: flex;
  justify-content: center;
  gap: 5px;
  flex-wrap: wrap; /* Se forem muitas, passam para a linha de baixo */
}

.error-msg {
  color: #ff6b6b;
  font-weight: bold;
  margin-bottom: 5px;
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 10px;
  border-radius: 4px;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.overlay-buttons {
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: center;
}

.btn-next {
  padding: 10px 20px;
  font-size: 1.2rem;
  background: #f1c40f;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  min-width: 250px;
}

.btn-forfeit {
  padding: 10px 20px;
  font-size: 1.2rem;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  min-width: 250px;
  transition: background 0.2s;
}

.btn-forfeit:hover {
  background: #c0392b;
}

/* Botões do Modo de Jogo */
.btn-mode {
  padding: 20px 40px;
  font-size: 1.5rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.2s;
}

.btn-mode:hover {
  transform: scale(1.05);
  background: #2980b9;
}

.mode-desc {
  font-size: 0.9rem;
  margin-top: 5px;
  opacity: 0.8;
}
</style>
