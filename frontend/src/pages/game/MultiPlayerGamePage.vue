<template>
  <div class="game-page">
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
          <p class="text-yellow-400 font-bold">Tu: {{ store.playerMatchScore }} ({{ store.gameState.playerScore }} pts)</p>
          <p class="text-red-400 font-bold">Oponente: {{ store.botMatchScore }} ({{ store.gameState.botScore }} pts)</p>
        </div>
      </div>
    </div>

    <div class="bottom-section">
      <div class="hand-container player-hand">
        <div v-if="store.moveError" class="error-msg">
          {{ store.moveError }}
        </div>
        
        <div v-if="!store.gameState.playerTurn && !store.gameState.gameFinished" class="text-yellow-300 mb-2 animate-pulse">
            À espera do oponente...
        </div>
        <div v-if="store.gameState.playerTurn && !store.gameState.gameFinished" class="text-green-300 mb-2 font-bold">
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
  </div>
</template>

<script setup>
import { onMounted, inject } from "vue";
import { useGameStore } from "../../stores/gameStore";
import GameCard from "../../components/game/GameCard.vue";

const store = useGameStore();
const socket = inject('socket'); // INJETAR O SOCKET

const API_URL = "http://localhost:8000";
const cardBackUrl = `${API_URL}/images/cartas/playing-cards-master/cardflipped.png`;

// Wrapper para passar o socket
const handlePlayCard = (card) => {
    store.playCard(card, socket);
}

onMounted(() => {
  store.bindSocket(socket);
    console.log("Multiplayer Page Mounted. Mode:", store.isMultiplayer ? "Multi" : "Single");
});
</script>

<style scoped>
/* Estilos mantidos iguais */
:root { --card-width: 95px; --card-height: 135px; }
.game-page { background-color: #1e8449; height: 100vh; width: 100vw; display: flex; flex-direction: column; justify-content: space-between; padding: 10px; box-sizing: border-box; color: white; overflow: hidden; }
.card-slot { width: 95px; height: 135px; display: flex; justify-content: center; align-items: center; }
.card-slot img { width: 100%; height: 100%; object-fit: contain; border-radius: 8px; box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3); }
.top-section { height: 150px; display: flex; justify-content: center; align-items: flex-start; }
.hand-container.opponent-hand { display: flex; flex-direction: row; gap: 5px; }
.opponent-hand .facedown-card { margin-left: -40px; }
.opponent-hand .facedown-card:first-child { margin-left: 0; }
.middle-section { flex-grow: 1; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; }
.deck-trump-area { flex: 1; display: flex; justify-content: flex-start; align-items: center; }
.deck-container { position: relative; width: 120px; height: 135px; }
.deck-card-top { position: absolute; top: 0; left: 0; width: 95px; height: 135px; z-index: 10; border-radius: 8px; box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.5); }
.trump-card-under { position: absolute; top: 20px; left: 25px; width: 95px; height: 135px; z-index: 5; border-radius: 8px; }
.deck-count { position: absolute; top: -10px; left: -10px; background: red; color: white; border-radius: 50%; width: 25px; height: 25px; display: flex; justify-content: center; align-items: center; font-weight: bold; z-index: 15; }
.table-cards-center { flex: 2; display: flex; justify-content: center; gap: 30px; }
.table-slot { border: 2px dashed rgba(255, 255, 255, 0.3); border-radius: 8px; }
.right-spacer { flex: 1; display: flex; justify-content: flex-end; align-items: flex-start; }
.score-board { background: rgba(0, 0, 0, 0.2); padding: 10px; border-radius: 5px; text-align: right; }
.bottom-section { display: flex; flex-direction: column; align-items: center; padding-bottom: 10px; }
.hand-container.player-hand { display: flex; flex-direction: column; align-items: center; }
.cards-row { display: flex; justify-content: center; gap: 5px; flex-wrap: wrap; }
.error-msg { color: #ff6b6b; font-weight: bold; margin-bottom: 5px; background: rgba(0, 0, 0, 0.5); padding: 2px 10px; border-radius: 4px; }
</style>