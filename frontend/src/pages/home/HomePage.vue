<template>
  <div class="min-h-screen bg-[#1e8449] p-5 flex flex-col items-center">
    <div v-if="authStore.user" class="home-page-card flex">
      <div class="flex items-center gap-3">
        <img
          :src="getUserAvatar()"
          alt="User Avatar"
          class="h-10 w-10 rounded-full border-2 bg-white object-cover"
          @error="handleImageError"
        />
        <div class="flex items-baseline gap-2">
          <span class="text-xl text-gray-600">Welcome,</span>
          <p class="font-bold text-xl text-[#2c3e50]">
            {{ authStore.user?.nickname || authStore.user?.name || "Jogador" }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- <Button
          @click="router.push({ name: 'profile' })"
          size="sm"
          variant="outline"
        >
          Profile
        </Button> -->
        <div class="flex items-baseline gap-3">
          <span class="text-xl text-gray-600">Coins</span>
          <p class="font-bold text-xl text-[#2c3e50]">
            {{ authStore.user?.coins_balance || 0 }} 🪙
          </p>
        </div>
      </div>
    </div>

    <div class="w-full max-w-4xl mb-10 home-page-card">
      <h2 class="text-3xl font-bold text-[#2c3e50] text-center mb-6">
        Play a Game
      </h2>
      <div class="flex flex-col lg:flex-row gap-5 w-full">
        <Card
          class="flex flex-col w-full shadow-lg border-2 border-gray-200 rounded-xl"
        >
          <CardHeader class="text-center">
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
                authStore.isAuthenticated ? 'home-btn' : 'login-necessary-btn'
              "
              @click="enterLobby"
              size="lg"
              variant="secondary"
            >
              {{
                authStore.isAuthenticated ? "Go to Lobby" : "Login Necessary"
              }}
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
          <CardDescription class="text-base text-[#7f8c8d] pt-1">
            {{
              authStore.type === "P"
                ? "Review your multiplayer past games!"
                : "Review all of the games!"
            }}</CardDescription
          >
        </CardHeader>
        <CardContent class="flex justify-center gap-4 mt-auto pt-6">
          <Button
            :class="
              authStore.isAuthenticated ? 'home-btn' : 'login-necessary-btn'
            "
            @click="
              authStore.isAuthenticated
                ? goToHistory()
                : router.push({ name: 'login' })
            "
            size="lg"
            variant="secondary"
          >
            {{ authStore.isAuthenticated ? "History" : "Login Necessary" }}
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
            :class="
              authStore.isAuthenticated ? 'home-btn' : 'login-necessary-btn'
            "
            @click="
              authStore.isAuthenticated && router.push({ name: 'scoreboards' })
            "
            size="lg"
            variant="secondary"
          >
            {{
              authStore.isAuthenticated ? "View Rankings" : "Login Necessary"
            }}
          </Button>
        </CardContent>
      </Card>

      <Card
        v-if="authStore.type === 'A'"
        class="flex flex-1 flex-col w-full shadow-lg border-2 border-purple-300 rounded-xl bg-purple-50"
      >
        <CardHeader class="text-center">
          <CardTitle class="text-3xl font-bold text-purple-700"
            >Admin Panel 🔧</CardTitle
          >
          <CardDescription class="text-base text-purple-600 pt-1"
            >Manage users and platform settings</CardDescription
          >
        </CardHeader>
        <CardContent class="flex justify-center gap-4 mt-auto pt-6">
          <Button
            size="lg"
            variant="secondary"
            class="home-btn bg-purple-600 hover:bg-purple-700 text-white"
            @click="router.push({ name: 'admin-users' })"
          >
            Manage Users
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
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth.js";
import { useGameStore } from "@/stores/gameStore";
import { inject } from "vue"; // <--- IMPORTANTE

const router = useRouter();
const authStore = useAuthStore();
const gameStore = useGameStore();

// Injeta o URL base que definiste no main.js
const serverBaseURL = inject("serverBaseURL");

// --- FUNÇÃO DE AVATAR ---
const getUserAvatar = () => {
  const user = authStore.user;
  const photoName = user?.photo_avatar_filename;

  if (!photoName) {
    return `https://ui-avatars.com/api/?name=${
      user?.nickname || "User"
    }&background=random&color=fff`;
  }

  // Se já for um URL completo, usa-o
  if (photoName.startsWith("http")) return photoName;

  // Constrói o URL usando o serverBaseURL injetado
  // Resultado esperado: http://localhost:8000/storage/photos_avatars/nome.jpg
  return `${serverBaseURL}/storage/photos_avatars/${photoName}`;
};

const handleImageError = (e) => {
  e.target.src = `https://ui-avatars.com/api/?name=${
    authStore.user?.nickname || "User"
  }&background=random&color=fff`;
};

const goToHistory = () => {
  if (authStore.user.type === "P") {
    router.push({ name: "history" });
  } else {
    router.push({ name: "admin-history" });
  }
};

const enterLobby = () => {
  if (authStore.isAuthenticated) {
    router.push({ name: "lobby" });
  } else {
    router.push({ name: "login" });
  }
};
const startGame = (mode) => {
  gameStore.resetForNewPlay();
  gameStore.playMode = mode;
  if (mode === "single_game") {
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
  cursor: not-allowed;
}

:deep(.login-necessary-btn:hover) {
  background-color: #374151;
  color: white;
  transform: scale(1.05);
}
</style>
