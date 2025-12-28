<template>
  <div class="min-h-screen bg-[#1e8449] p-5 flex flex-col items-center">
    <h1 class="text-4xl font-bold text-white text-center mb-8">
      Multiplayer Lobby
    </h1>

    <div class="w-full max-w-4xl space-y-8">
      <Card class="shadow-lg border-2 border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle class="text-2xl font-bold text-[#2c3e50]"
            >Create a New Game</CardTitle
          >
        </CardHeader>
        <CardContent class="space-y-4">
          <div>
            <label class="text-sm font-medium mb-2 block text-gray-600"
              >Choose Play Mode</label
            >
            <div class="grid grid-cols-2 gap-4">
              <Button
                v-for="mode in modes"
                :key="mode.playMode"
                @click="selectedPlayMode = mode.playMode"
                :variant="
                  selectedPlayMode === mode.playMode ? 'default' : 'outline'
                "
                class="flex flex-col py-3 h-16 text-base"
              >
                <span class="font-semibold">{{ mode.label }}</span>
                <span class="text-xs opacity-70">{{ mode.description }}</span>
              </Button>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium mb-2 block text-gray-600"
              >Choose Match Type</label
            >
            <div class="grid grid-cols-2 gap-4">
              <Button
                v-for="type in types"
                :key="type.biscaType"
                @click="selectedBiscaType = type.biscaType"
                :variant="
                  selectedBiscaType === type.biscaType ? 'default' : 'outline'
                "
                class="flex flex-col py-3 h-16 text-base"
              >
                <span class="font-semibold">{{ type.label }}</span>
                <span class="text-xs opacity-70">{{ type.description }}</span>
              </Button>
            </div>
          </div>
          <Button @click="createNewGame" class="w-full home-btn" size="lg"
            >Create Game</Button
          >
        </CardContent>
      </Card>

      <!-- Secção dos Meus Jogos em Espera -->
      <Card
        v-if="gameStore.myGames.length > 0"
        class="shadow-lg border-2 border-blue-400 rounded-xl"
      >
        <CardHeader>
          <CardTitle class="text-2xl font-bold text-[#2c3e50]"
            >My Open Games</CardTitle
          >
        </CardHeader>
        <CardContent class="space-y-3">
          <div
            v-for="game in gameStore.myGames"
            :key="game.id"
            class="bg-blue-50 p-4 rounded-lg flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div class="animate-spin text-2xl">⏳</div>
              <div>
                <p class="font-semibold">Waiting for an opponent...</p>
                <Badge variant="secondary" class="bg-gray-300">
                  {{
                    game.playMode === "single_game"
                      ? "Quick Game"
                      : "Full Match"
                  }}</Badge
                >
                <Badge variant="secondary" class="bg-gray-400 ml-2">
                  {{
                    game.biscaType === "9" ? "Bisca de 9" : "Bisca de 3"
                  }}</Badge
                >
              </div>
            </div>
            <Button @click="cancelGame(game.id)" variant="destructive" size="sm"
              >Cancel</Button
            >
          </div>
        </CardContent>
      </Card>

      <!-- Secção de Jogos Disponíveis -->
      <Card class="shadow-lg border-2 border-gray-200 rounded-xl">
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0"
        >
          <CardTitle class="text-2xl font-bold text-[#2c3e50]"
            >Available Games ({{ gameStore.availableGames.length }})</CardTitle
          >
          <Button @click="refreshGamesList" variant="outline" size="sm">
            <span class="mr-2">⟳</span> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div
            v-if="gameStore.availableGames.length === 0"
            class="text-center py-10 text-gray-500"
          >
            <div class="text-5xl mb-3">🎮</div>
            <p class="font-semibold">No games available right now.</p>
            <p class="text-sm mt-1">Why not create a new one?</p>
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="game in gameStore.availableGames"
              :key="game.id"
              class="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <img
                  :src="game.player1.photo_url"
                  class="h-10 w-10 rounded-full"
                />
                <div>
                  <span class="font-medium"
                    >{{ game.player1.nickname }}'s Game</span
                  >
                  <Badge variant="secondary" class="bg-gray-300 ml-2">
                    {{
                      game.playMode === "single_game"
                        ? "Quick Game"
                        : "Full Match"
                    }}</Badge
                  >
                  <Badge variant="secondary" class="bg-gray-400 ml-2">
                    {{
                      game.biscaType === "9" ? "Bisca de 9" : "Bisca de 3"
                    }}</Badge
                  >
                </div>
              </div>
              <Button @click="joinGame(game.id)" size="sm" class="home-btn">
                Join Game
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from "vue";
import { useGameStore } from "@/stores/gameStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const gameStore = useGameStore();

// Opções para criar o jogo
const modes = ref([
  {
    playMode: "single_game",
    label: "Quick Game",
    description: "Single game.",
  },
  {
    playMode: "match",
    label: "Full Match",
    description: "First to 4 games wins.",
  },
]);

const types = ref([
  {
    biscaType: "3",
    label: "Bisca de 3",
    description: "Play with 3 cards each.",
  },
  {
    biscaType: "9",
    label: "Bisca de 9",
    description: "Play with 9 cards each.",
  },
]);

const selectedBiscaType = ref("9"); // '9'
const selectedPlayMode = ref("match"); // 'match' por defeito (é corretamente preenchida quando se clica no botão)

// --- Funções que emitem eventos para o servidor ---

const createNewGame = () => {
  gameStore.setGameType("multiPlayer");
  gameStore.createGame(selectedPlayMode.value, selectedBiscaType.value);
};

const joinGame = (gameId) => {
  console.log(
    `[MultiplayerLobbyPage] Joining game with ID: ${gameId} and I'm going to the gameStore.joinGame()`
  );
  gameStore.joinGame(gameId);
};

const cancelGame = (gameId) => {
  gameStore.cancelGame(gameId);
};

const refreshGamesList = () => {
  gameStore.refreshGamesList();
};

onMounted(() => {
  // Ao entrar na página, pede a lista de jogos
  refreshGamesList();
});
</script>

<style scoped>
/* Estilos para os botões, para manter a consistência com a HomePage */
:deep(.home-btn) {
  font-size: 1rem;
  background-color: #007bff;
  color: white;
  transition: all 0.2s ease-in-out;
}

:deep(.home-btn:hover) {
  transform: scale(1.05);
  background-color: #0056b3;
}
</style>
