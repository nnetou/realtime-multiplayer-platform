<template>
  {{ console.log("Rendering ProfilePage.vue") }}
  <div
    class="min-h-screen bg-[#1e8449] p-4 md:p-8 flex justify-center items-start"
  >
    <div class="flex flex-col gap-6 w-full max-w-5xl">
      <Card
        class="w-full shadow-xl border-none overflow-hidden bg-white rounded-xl"
      >
        <div class="px-6 pb-6 relative">
          <div class="flex flex-col md:flex-row gap-6 items-start mt-6">
            <div class="relative shrink-0">
              <img
                :src="getUserAvatar()"
                alt="Avatar"
                class="w-32 h-32 md:w-40 md:h-40 rounded-lg object-cover border-4 border-gray-200 shadow-md bg-white"
                @error="handleImageError"
              />
            </div>

            <div class="flex-1 pt-0 w-full">
              <div
                class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div>
                  <div class="flex items-center gap-3">
                    <h1 class="text-3xl font-bold text-gray-900 leading-tight">
                      {{ currentUser.name }}
                    </h1>
                  </div>

                  <p class="text-gray-500 font-medium text-lg">
                    @{{ currentUser.nickname }}
                  </p>

                  <p
                    class="text-gray-600 text-sm mt-1 max-w-md"
                    :class="{
                      'italic text-gray-500': !currentUser.description,
                    }"
                  >
                    {{
                      currentUser.description ||
                      "Add a description to your profile"
                    }}
                  </p>

                  <div
                    class="mt-2 text-sm text-gray-600 italic flex items-center gap-2"
                  >
                    <span
                      class="w-2 h-2 rounded-full bg-green-500 inline-block"
                    ></span>
                    Online now
                  </div>
                </div>

                <Button
                  @click="router.push({ name: 'profile-edit' })"
                  class="bg-[#1e8449] hover:bg-[#145a32] text-white shadow-sm"
                >
                  Edit Profile
                </Button>
              </div>

              <div
                class="mt-6 flex flex-wrap gap-6 text-sm text-gray-600 border-t border-gray-100 pt-4"
              >
                <div class="flex flex-col">
                  <span class="font-bold text-gray-900 text-lg">{{
                    currentUser.coins_balance || 0
                  }}</span>
                  <span>Coins</span>
                </div>
                <div class="flex flex-col">
                  <span class="font-bold text-gray-900 text-lg">Email</span>
                  <span
                    class="truncate max-w-[150px]"
                    :title="currentUser.email"
                    >{{ currentUser.email }}</span
                  >
                </div>
                <div class="flex flex-col">
                  <span class="font-bold text-gray-900 text-lg">Joined at</span>
                  <span>{{ joinedAt }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <!-- Statistics Card -->
      <Card class="w-full shadow-xl border-none bg-white rounded-xl">
        <CardHeader>
          <CardTitle
            class="text-2xl font-bold text-[#2c3e50] flex items-center gap-2"
          >
            <span
              class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400 mr-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                class="w-6 h-6 text-black"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 21h8M12 17v4m-6-4a6 6 0 1112 0H6zm0 0V5a2 2 0 012-2h8a2 2 0 012 2v12"
                />
              </svg>
            </span>
            Statistics
          </CardTitle>
          <CardDescription
            >Your profile statistics and achievements</CardDescription
          >
        </CardHeader>
        <CardContent>
          <div class="mb-4">
            <h3 class="font-semibold text-lg mb-2">General Statistics</h3>
            <ul class="space-y-1 text-base">
              <li>
                <strong>Total Matches:</strong>
                {{ currentUser.statistics?.total_matches ?? 0 }}
              </li>
              <li>
                <strong>Total Wins:</strong>
                {{ currentUser.statistics?.total_wins ?? 0 }}
              </li>
              <li>
                <strong>Bisca of 3 wins:</strong>
                {{ currentUser.statistics?.bisca_3_wins ?? 0 }}
              </li>
              <li>
                <strong>Bisca of 9 wins:</strong>
                {{ currentUser.statistics?.bisca_9_wins ?? 0 }}
              </li>
            </ul>
          </div>
          <div>
            <h3 class="font-semibold text-lg mb-2">Achievements</h3>
            <ul class="space-y-1 text-base">
              <li>
                <strong>Capote:</strong>
                {{
                  achievements.filter((a) => a.type.toLowerCase() === "capote")
                    .length
                }}
              </li>
              <li>
                <strong>Bandeira:</strong>
                {{
                  achievements.filter(
                    (a) => a.type.toLowerCase() === "bandeira"
                  ).length
                }}
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
const serverBaseURL = inject("serverBaseURL");
// IMPORTANTE: Adicionei estes imports de volta porque são usados no card de Achievements
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const router = useRouter();
const authStore = useAuthStore();

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
const currentUser = ref({});
const achievements = ref([]);
const achievementDescription = ref("");

const joinedAt = computed(() => {
  if (!currentUser.value.created_at) return "N/A";
  const date = new Date(currentUser.value.created_at);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push({ name: "login" });
    return;
  }

  currentUser.value = { ...authStore.user };

  // Buscar estatísticas atualizadas
  try {
    const statsResponse = await fetch(
      "http://localhost:8000/api/me/statistics",
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      currentUser.value.statistics = stats;
    }
  } catch (error) {
    console.error("Failed to fetch statistics:", error);
  }

  // Fetch achievements
  try {
    const response = await fetch("http://localhost:8000/api/me/achievements", {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    });
    if (response.ok) {
      achievements.value = await response.json();
      // Compute description
      const capoteCount = achievements.value.filter(
        (a) => a.type.toLowerCase() === "capote"
      ).length;
      const bandeiraCount = achievements.value.filter(
        (a) => a.type.toLowerCase() === "bandeira"
      ).length;
      const jogosGanhos = achievements.value.length; // Assuming each achievement is a win
      achievementDescription.value = `Capote: ${capoteCount} Bandeira: ${bandeiraCount} Jogos ganhos: ${jogosGanhos}`;
    }
  } catch (error) {
    console.error("Failed to fetch achievements:", error);
  }
});

const logout = async () => {
  await authStore.logout();
  router.push({ name: "login" });
};

const getAchievementIcon = (type) => {
  const icons = {
    first_win: "🏆",
    sharpshooter: "🎯",
    champion: "🌟",
    capote: "🃏",
    legend: "🔒",
  };
  return icons[type.toLowerCase()] || "🏅";
};

const getAchievementTitle = (type) => {
  const titles = {
    first_win: "First Win",
    sharpshooter: "Sharpshooter",
    champion: "Champion",
    capote: "Capote",
    legend: "Legend",
  };
  return titles[type.toLowerCase()] || type;
};
</script>
