<template>
  <div class="min-h-screen bg-[#1e8449] p-5 flex flex-col items-center">
    <div v-if="authStore.currentUser" class="home-page-card flex">
      <div class="flex items-center gap-3">
        <img
          :src="authStore.currentUser?.photo_url"
          alt="User"
          class="h-10 w-10 rounded-full border-2"
        />
        <div class="flex items-baseline gap-2">
          <span class="text-xl text-gray-600">Welcome,</span>
          <p class="font-bold text-xl text-[#2c3e50]">
            {{ authStore.currentUser?.nickname || authStore.currentUser?.name }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="coins-icon">🪙</div>
        <div class="flex items-baseline gap-3">
          <span class="text-xl text-gray-600">Coins</span>
          <p class="font-bold text-xl text-[#2c3e50]">
            {{ authStore.currentUser?.coins_balance }}
          </p>
        </div>
      </div>
    </div>

    <!-- <div
      class="mb-10 flex flex-col lg:flex-row gap-5 w-full max-w-md lg:max-w-4xl home-page-card"
    >  -->
    <div class="w-full max-w-4xl mb-10 home-page-card">
      <h2 class="text-3xl font-bold text-[#2c3e50] text-center mb-6">
        Play a Game
      </h2>
      <div class="flex flex-col lg:flex-row gap-5 w-full">
        <Card
          class="flex flex-col w-full shadow-lg border-2 border-gray-200 rounded-xl"
        >
          <CardHeader class="text-center">
            <!-- 3. Títulos e descrições estilizados com classes -->
            <CardTitle class="text-3xl font-bold text-[#2c3e50]"
              >Single Player</CardTitle
            >
            <CardDescription class="text-base text-[#7f8c8d] pt-1"
              >Play alone against a bot!</CardDescription
            >
          </CardHeader>
          <CardContent class="flex justify-center gap-4 mt-auto pt-6">
            <Button
              @click="startGame('single_game')"
              size="lg"
              variant="secondary"
              class="home-btn"
            >
              Start Game
            </Button>
            <Button
              @click="startGame('match')"
              size="lg"
              variant="secondary"
              class="home-btn"
            >
              Start Match
            </Button>
          </CardContent>
        </Card>

        <!-- Card de Multi Player -->
        <Card
          class="flex flex-col w-full shadow-lg border-2 border-gray-200 rounded-xl"
        >
          <CardHeader class="text-center">
            <CardTitle class="text-3xl font-bold text-[#2c3e50]"
              >Multi Player</CardTitle
            >
            <CardDescription class="text-base text-[#7f8c8d] pt-1"
              >Play against other players!</CardDescription
            >
          </CardHeader>
          <CardContent class="flex justify-center gap-4 mt-auto pt-6">
            <Button
              :class="
                authStore.currentUser ? 'home-btn' : 'login-necessary-btn'
              "
              @click="router.push({ name: 'lobby' })"
              size="lg"
              variant="secondary"
            >
              {{ authStore.currentUser ? "Go to Lobby" : "Login Necessary" }}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>

    <div
      class="mb-10 flex flex-col lg:flex-row gap-5 w-full max-w-md lg:max-w-4xl"
    >
      <Card
        class="flex flex-1 flex-col w-full shadow-lg border-2 border-gray-200 rounded-xl"
      >
        <CardHeader class="text-center">
          <CardTitle class="text-3xl font-bold text-[#2c3e50]"
            >Game History 📜</CardTitle
          >
          <CardDescription class="text-base text-[#7f8c8d] pt-1"
            >Review your multiplayer past games!</CardDescription
          >
        </CardHeader>
        <CardContent class="flex justify-center gap-4 mt-auto pt-6">
          <Button
            :class="authStore.currentUser ? 'home-btn' : 'login-necessary-btn'"
            @click="router.push({ name: 'history' })"
            size="lg"
            variant="secondary"
          >
            {{ authStore.currentUser ? "History" : "Login Necessary" }}
          </Button>
        </CardContent>
      </Card>

      <Card
        class="flex flex-1 flex-col w-full shadow-lg border-2 border-gray-200 rounded-xl"
      >
        <CardHeader class="text-center">
          <CardTitle class="text-3xl font-bold text-[#2c3e50]"
            >Leaderboard 🏆</CardTitle
          >
          <CardDescription class="text-base text-[#7f8c8d] pt-1"
            >Check your ranking or the global leaderboard!</CardDescription
          >
        </CardHeader>
        <CardContent class="flex justify-center gap-4 mt-auto pt-6">
          <Button
            :class="authStore.currentUser ? 'home-btn' : 'login-necessary-btn'"
            @click="router.push({ name: 'scoreboards' })"
            size="lg"
            variant="secondary"
          >
            {{ authStore.currentUser ? "View Rankings" : "Login Necessary" }}
          </Button>
        </CardContent>
      </Card>

      <Card
        class="flex flex-1 flex-col w-full shadow-lg border-2 border-gray-200 rounded-xl"
      >
        <CardHeader class="text-center">
          <CardTitle class="text-3xl font-bold text-[#2c3e50]"
            >About us</CardTitle
          >
        </CardHeader>
        <CardContent class="flex justify-center gap-4 mt-auto pt-6">
          <Button
            size="lg"
            variant="secondary"
            class="home-btn"
            @click="router.push({ name: 'about' })"
          >
            Learn More
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth.js";
import { useGameStore } from "@/stores/gameStore";
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const gameStore = useGameStore();
const startGame = (mode) => {
  // 1. Reinicia qualquer estado de jogo anterior
  gameStore.resetForNewPlay();
  // 2. Define o modo de jogo (single_game ou match)
  gameStore.setPlayMode(mode);
  // 2. Navega para a rota correspondente
  if (gameStore.playMode === "single_game") {
    router.push({ name: "quick-game" });
  } else {
    router.push({ name: "full-match" });
  }
};
</script>

<style scoped>
.home-page-card {
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 56rem;
  padding: 1rem;
  margin-bottom: 2.5rem;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  border-radius: 0.75rem;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  border: 1px solid rgba(229, 231, 235, 0.5);
}

:deep(.home-btn) {
  font-size: 1rem;
  padding: 0.75rem 1.5rem;
  background-color: #f3f4f6;
  color: #1f2937;
  transition: all 0.2s ease-in-out;
}

:deep(.home-btn:hover) {
  background-color: #007bff;
  color: white;
  transform: scale(1.05);
}

:deep(.login-necessary-btn) {
  font-size: 1rem;
  padding: 0.75rem 1.5rem;
  background-color: #9ca3af;
  color: black;
}

:deep(.login-necessary-btn:hover) {
  background-color: #374151;
  color: white;
  transform: scale(1.05);
}
</style>
