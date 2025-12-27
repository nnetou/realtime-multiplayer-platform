<template>
  <div class="container mx-auto p-4">
    <div class="max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle class="text-lg">Create New Game</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div>
            <label class="text-sm font-medium mb-2 block"
              >Choose Difficulty</label
            >
            <div class="grid grid-cols-3 gap-2">
              <Button
                v-for="level in gameStore.difficulties"
                :key="level.value"
                size="sm"
                @click="selectedDifficulty = level.value"
                :variant="
                  selectedDifficulty === level.value ? 'default' : 'outline'
                "
                class="flex flex-col py-3 h-16"
              >
                <span class="font-semibold">{{ level.label }}</span>
                <span class="text-xs opacity-70">{{ level.description }}</span>
              </Button>
            </div>
          </div>

          <Button @click="createNewGame" class="w-full">Create Game</Button>
        </CardContent>
      </Card>

      <Card class="border-2 border-blue-500">
        <CardHeader>
          <CardTitle class="text-lg">Waiting for Opponent...</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div
            class="bg-blue-50 p-4 rounded-lg flex items-center justify-between"
            v-for="game of gameStore.myGames"
            :key="game"
          >
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <div class="animate-pulse text-3xl">⏳</div>
                <Badge variant="outline"
                  >Difficulty: {{ game.difficulty }}</Badge
                >
              </div>
            </div>

            <Button @click="cancelGame(game)" variant="outline" size="sm"
              >Cancel Game</Button
            >
            <Button
              v-if="game.player2"
              @click="startGame(game)"
              variant="outline"
              size="sm"
              >Start</Button
            >
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-lg"
            >Available Games ({{ gameStore.availableGames.length }})
            <Button @click="refreshGamesList" variant="outline" size="sm"
              >Refresh</Button
            >
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            v-if="gameStore.availableGames.length === 0"
            class="text-center py-8 text-gray-500"
          >
            <div class="text-4xl mb-2">🎮</div>
            <p>No games available</p>
            <p class="text-sm mt-1">Create a new game to get started!</p>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="game of gameStore.availableGames"
              :key="game"
              class="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ game.creator }}'s Game</span>
                  <Badge variant="outline"
                    >Difficulty: {{ game.difficulty }}</Badge
                  >
                </div>
              </div>
              <Button @click="joinGame(game)" size="sm"> Join Game </Button>
              <Button
                v-if="game.player2 == authStore.currentUserID"
                @click="startGame(game)"
                size="sm"
              >
                Start
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useGameStore } from "@/stores/gameStore";
import { useAuthStore } from "@/stores/auth";
import { useSocketStore } from "@/stores/socket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "vue-router";
const router = useRouter();

const gameStore = useGameStore();
const authStore = useAuthStore();
const socketStore = useSocketStore();

const selectedDifficulty = ref("medium");

const createNewGame = () => {
  gameStore.createGame(selectedDifficulty.value);
};

const joinGame = (game) => {
  socketStore.emitJoinGame(game);
};
const startGame = (game) => {
  gameStore.multiplayerGame = game;
  router.push({ name: "multiplayer" });
};

onMounted(() => {
  socketStore.emitGetGames();
});
</script>
