<template>
  <div
    v-if="store.gameState && store.gameState.botHand"
    class="game-page"
    :style="{ backgroundColor: tableColor }"
  >
    <div class="top-section bot-hand-area">
      <div class="hand-container opponent-hand">
        <div
          v-for="n in store.gameState.botHand.length"
          :key="n"
          class="card-slot facedown-card"
        >
          <img :src="cardBackUrl" alt="Bot Card" />
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
            v-if="store.gameState.tableCards && store.gameState.tableCards[0]"
            :card="store.gameState.tableCards[0]"
            :isMyTurn="false"
          />
        </div>

        <div class="card-slot table-slot">
          <GameCard
            v-if="store.gameState.tableCards && store.gameState.tableCards[1]"
            :card="store.gameState.tableCards[1]"
            :isMyTurn="false"
          />
        </div>
      </div>

      <div class="right-spacer">
        <div class="score-board">
          <p>Player: {{ store.playerMatchScore }}</p>
          <p>Bot: {{ store.botMatchScore }}</p>
        </div>
      </div>
    </div>

    <div class="bottom-section">
      <div
        v-if="
          showModeSelection ||
          (!store.gameState.deck.length && !store.gameState.gameFinished)
        "
        class="overlay"
      >
        <h1>NOVO JOGO</h1>
        <h3 style="margin-bottom: 30px">Escolhe o modo de jogo:</h3>

        <div class="overlay-buttons">
          <button @click="selectMode('3')" class="btn-mode">
            BISCA DE 3
            <span class="mode-desc">(3 cartas na mão)</span>
          </button>

          <button @click="selectMode('9')" class="btn-mode">
            BISCA DE 9
            <span class="mode-desc">(9 cartas na mão)</span>
          </button>
        </div>
      </div>

      <div
        v-if="store.gameState.gameFinished && !showModeSelection"
        class="overlay"
      >
        <h1>JOGO TERMINADO</h1>
        <h2 style="color: #f1c40f; font-size: 2rem">
          {{ store.gameState.playerScore }} - {{ store.gameState.botScore }}
        </h2>
        <h3 style="margin-bottom: 20px">{{ store.lastGameResult }}</h3>

        <div v-if="playMode === 'match'" class="overlay-buttons">
          <button @click="store.resetForNewPlay" class="btn-next">
            Próximo Jogo (Match: {{ store.playerMatchScore }}-{{
              store.botMatchScore
            }})
          </button>
          <button @click="handleForfeit" class="btn-forfeit">
            Sair / Desistir
          </button>
        </div>
        <div v-else class="overlay-buttons">
          <button @click="store.resetForNewPlay" class="btn-next">
            Novo Jogo
          </button>
          <button @click="router.push('/')" class="btn-next">
            Voltar ao Menu Principal
          </button>
        </div>
      </div>

      <div class="hand-container player-hand">
        <div v-if="store.moveError" class="error-msg">
          {{ store.moveError }}
        </div>

        <div class="cards-row">
          <GameCard
            v-for="card in store.gameState.playerHand"
            :key="card.rank.name + card.suit"
            :card="card"
            :isMyTurn="store.gameState.playerTurn"
            :isProcessing="store.gameState.isProcessingMove"
            @play-card="store.playCard"
          />
        </div>
      </div>
    </div>
  </div>
  <div
    v-else
    class="h-screen w-full flex items-center justify-center text-white"
    :style="{ backgroundColor: tableColor }"
  >
    <h2 class="text-2xl font-bold animate-pulse">A carregar jogo...</h2>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, inject } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useGameStore } from "../../stores/gameStore";
import { useAPIStore } from "../../stores/api";
import { useAuthStore } from "../../stores/auth"; // <--- NOVO IMPORT
import GameCard from "../../components/game/GameCard.vue";
import { toast } from "vue-sonner";

const store = useGameStore();
const apiStore = useAPIStore();
const authStore = useAuthStore(); // <--- INSTANCIAR STORE
const router = useRouter();
const route = useRoute();
const serverBaseURL = inject("serverBaseURL"); // <--- INJETAR BASE URL

// --- LÓGICA DE CUSTOMIZAÇÃO (NOVO) ---
const cardBackUrl = computed(() => {
  const filename = authStore.user?.custom?.equipped_card || "cardflipped.png";
  // Usa a rota proxy da API para buscar a imagem correta
  return `${serverBaseURL}/api/card-image-proxy/${filename}`;
});

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
// -------------------------------------

const playMode = computed(() => route.meta.playMode);
const showModeSelection = ref(false);

const selectMode = (mode) => {
  store.gameState.matchType = mode;
  store.startSinglePlayerGame();
  showModeSelection.value = false;
};

const handleForfeit = async () => {
  if (typeof store.forfeitMatch === "function") store.forfeitMatch();
  store.resetForNewPlay();

  const durationSeconds = 10;
  const gamePayload = {
    type: store.gameState.matchType || "3",
    player_score: store.playerMatchScore,
    opponent_score: 4,
    winner: "bot",
    duration_seconds: durationSeconds,
    custom: { trick_breakdown: [], coins_change: -2 },
  };

  try {
    await apiStore.postGame(gamePayload);
    toast.success("Jogo terminado.");
  } catch (error) {
    console.error("Erro API:", error);
  } finally {
    router.push("/");
  }
};

onMounted(() => {
  if (playMode.value) store.playMode = playMode.value;
  if (!store.gameState || !store.gameState.deck) {
    store.resetForNewPlay();
  }
  if (!store.gameState.deck || store.gameState.deck.length === 0) {
    showModeSelection.value = true;
  }
});
</script>

<style scoped>
:root {
  --card-width: 95px;
  --card-height: 135px;
}

/* REMOVIDO: background-color: #1e8449; */
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
}
/* ... resto do CSS igual ... */
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
