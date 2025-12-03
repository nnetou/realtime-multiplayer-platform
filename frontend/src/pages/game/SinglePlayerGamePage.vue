<template>
  <div class="game-page">
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
          <p>Player: {{ store.playerMatchScore }}</p>
          <p>Bot: {{ store.botMatchScore }}</p>
        </div>
      </div>
    </div>

    <div class="bottom-section">
      <div v-if="store.gameState.gameFinished" class="overlay">
        <h1>JOGO TERMINADO</h1>

        <h2 style="color: #f1c40f; font-size: 2rem">
          {{ store.gameState.playerScore }} - {{ store.gameState.botScore }}
        </h2>

        <h3 style="margin-bottom: 20px">{{ store.lastGameResult }}</h3>

        <button @click="store.startNextGame" class="btn-next">
          Próximo Jogo (Match: {{ store.playerMatchScore }}-{{
            store.botMatchScore
          }})
        </button>
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
            @play-card="store.handlePlayerCardPlayed"
          />
        </div>
      </div>
    </div>

    <div v-if="store.gameState.gameFinished" class="overlay">
      <h1>Jogo Terminado</h1>
      <button @click="store.startNextGame" class="btn-next">
        Próximo Jogo
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useGameStore } from "../../stores/gameStore";
import GameCard from "../../components/game/GameCard.vue";

const store = useGameStore();

// Definimos o URL base da API manualmente, tal como fizeste no Card.js
const API_URL = "http://localhost:8000";

const cardBackUrl = `${API_URL}/images/cartas/playing-cards-master/cardflipped.png`;

onMounted(() => {
  if (store.gameState.deck.length === 0 && !store.gameState.gameFinished) {
    store.startNextGame();
  }
});
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
  justify-content: space-between; /* Espaça Topo, Meio, Fundo */
  padding: 10px;
  box-sizing: border-box;
  color: white;
  overflow: hidden; /* Evita scrollbars */
}

/* ============ ESTILOS GERAIS DE CARTAS ============ */
.card-slot {
  width: 95px; /* Ajusta se o teu componente GameCard tiver outro tamanho */
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

/* ============ SEÇÃO SUPERIOR (BOT) ============ */
.top-section {
  height: 150px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.hand-container.opponent-hand {
  display: flex;
  flex-direction: row;
  gap: 5px; /* Espaço pequeno entre as cartas do bot */
}

/* Efeito de "leque" ligeiro para o bot (opcional) */
.opponent-hand .facedown-card {
  margin-left: -40px; /* As cartas sobrepõem-se */
}
.opponent-hand .facedown-card:first-child {
  margin-left: 0;
}

/* ============ SEÇÃO DO MEIO (MESA) ============ */
.middle-section {
  flex-grow: 1; /* Ocupa o espaço disponível no meio */
  display: flex;
  align-items: center; /* Centra verticalmente */
  justify-content: space-between; /* Separa Esquerda, Centro, Direita */
  padding: 0 20px;
}

/* --- Área do Deck e Trunfo (Esquerda) --- */
.deck-trump-area {
  flex: 1; /* Ocupa 1/3 do espaço */
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.deck-container {
  position: relative;
  width: 120px; /* Um pouco mais largo para caber o trunfo deslocado */
  height: 135px;
}

/* O Deck virado para baixo */
.deck-card-top {
  position: absolute;
  top: 0;
  left: 0;
  width: 95px;
  height: 135px;
  z-index: 10; /* Fica por cima */
  border-radius: 8px;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.5);
}

/* O Trunfo por baixo */
.trump-card-under {
  position: absolute;
  /* Deslocamento para aparecer embaixo e à direita, como na bisca */
  top: 20px;
  left: 25px;
  width: 95px;
  height: 135px;
  z-index: 5; /* Fica por baixo */
  border-radius: 8px;
  /* Opcional: rodar o trunfo 90 graus como em alguns jogos físicos */
  /* transform: rotate(90deg);  */
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

/* --- Área Central das Cartas Jogadas --- */
.table-cards-center {
  flex: 2; /* Ocupa 2/3 do espaço no centro */
  display: flex;
  justify-content: center;
  gap: 30px; /* Espaço entre as duas cartas jogadas */
}

.table-slot {
  /* Placeholder visual se não houver carta */
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 8px;
}

/* --- Área Direita (Espaçador/Score) --- */
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

/* ============ SEÇÃO INFERIOR (JOGADOR) ============ */
.bottom-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 10px;
}

.turn-indicator {
  margin-bottom: 10px;
  text-align: center;
}
.turn-indicator h2 {
  margin: 0;
  font-size: 1.5rem;
  text-transform: uppercase;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
}

.hand-container.player-hand {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cards-row {
  display: flex;
  justify-content: center;
  gap: 5px; /* Espaço entre as cartas do jogador */
  flex-wrap: wrap;
}

/* Mensagens de erro e Overlay */
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
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 100;
}
.btn-next {
  padding: 10px 20px;
  font-size: 1.2rem;
  background: #f1c40f;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
</style>
