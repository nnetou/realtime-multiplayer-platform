<template>
  <div class="min-h-screen bg-slate-50 p-4 md:p-8">
    <div class="max-w-6xl mx-auto space-y-6">
      <div class="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 class="text-3xl font-bold text-[#1e8449]">Estatísticas</h1>
          <p class="text-gray-500">
            {{
              isAdmin
                ? "Painel de Administração"
                : "Consulta o teu desempenho e dados globais"
            }}
          </p>
        </div>

        <div
          class="bg-white p-1 rounded-lg shadow-sm border border-gray-300 flex"
        >
          <button
            @click="currentTab = 'personal'"
            :class="getTabClass('personal')"
          >
            Pessoal
          </button>
          <button @click="currentTab = 'global'" :class="getTabClass('global')">
            Global
          </button>
        </div>
      </div>

      <div v-if="currentTab === 'personal'" class="space-y-6">
        <div
          v-if="isAdmin && !selectedUserId"
          class="bg-white rounded-xl shadow-md border border-gray-300 overflow-hidden p-6"
        >
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold text-gray-800">
              Selecionar Utilizador
            </h2>
            <input
              v-model="searchQuery"
              @input="fetchUserList"
              placeholder="Pesquisar..."
              class="border border-gray-300 p-2 rounded w-64 focus:border-[#1e8449] outline-none"
            />
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead
                class="bg-gray-100 text-gray-700 uppercase text-xs font-bold border-b border-gray-300"
              >
                <tr>
                  <th class="p-3">User</th>
                  <th class="p-3">Email</th>
                  <th class="p-3 text-right">Saldo</th>
                  <th class="p-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr
                  v-for="u in userList"
                  :key="u.id"
                  class="hover:bg-gray-50 transition-colors"
                >
                  <td class="p-3 flex items-center gap-2">
                    <img
                      :src="getAvatarUrl(u.photo_avatar_filename)"
                      class="w-8 h-8 rounded-full bg-gray-200 border border-gray-300"
                    />
                    <span class="font-bold text-gray-700">{{
                      u.nickname
                    }}</span>
                  </td>
                  <td class="p-3 text-sm text-gray-600">{{ u.email }}</td>
                  <td class="p-3 text-right font-mono text-gray-800">
                    {{ u.coins_balance }} 🪙
                  </td>
                  <td class="p-3 text-center">
                    <button
                      @click="viewUserStats(u.id)"
                      class="text-blue-600 hover:text-blue-800 hover:underline text-sm font-bold"
                    >
                      Ver Stats
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mt-4 flex justify-center gap-2" v-if="lastPage > 1">
            <button
              @click="changePage(currentPage - 1)"
              :disabled="currentPage <= 1"
              class="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-100"
            >
              Ant
            </button>
            <span class="px-3 py-1 text-sm text-gray-700 font-medium"
              >Pág {{ currentPage }} de {{ lastPage }}</span
            >
            <button
              @click="changePage(currentPage + 1)"
              :disabled="currentPage >= lastPage"
              class="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-100"
            >
              Prox
            </button>
          </div>
        </div>

        <div v-else class="space-y-6">
          <div v-if="isAdmin" class="flex items-center gap-2 mb-4">
            <button
              @click="selectedUserId = null"
              class="bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 text-sm font-bold text-gray-700"
            >
              ← Voltar à Lista
            </button>
            <span class="font-bold text-lg ml-2 text-gray-700"
              >A ver:
              <span class="text-[#1e8449]">{{
                statsData.user?.nickname
              }}</span></span
            >
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              class="bg-white p-4 rounded-xl shadow border border-gray-200 border-l-4 border-l-blue-500"
            >
              <p class="text-xs text-gray-500 uppercase font-bold">
                Total Jogos
              </p>
              <p class="text-2xl font-bold text-gray-800">
                {{ statsData.total_matches }}
              </p>
            </div>
            <div
              class="bg-white p-4 rounded-xl shadow border border-gray-200 border-l-4 border-l-green-500"
            >
              <p class="text-xs text-gray-500 uppercase font-bold">Vitórias</p>
              <p class="text-2xl font-bold text-gray-800">
                {{ statsData.wins ?? 0 }}
              </p>
            </div>
            <div
              class="bg-white p-4 rounded-xl shadow border border-gray-200 border-l-4 border-l-yellow-500"
            >
              <p class="text-xs text-gray-500 uppercase font-bold">Win Rate</p>
              <p class="text-2xl font-bold text-gray-800">
                {{ statsData.win_rate }}%
              </p>
            </div>
            <div
              class="bg-white p-4 rounded-xl shadow border border-gray-200 border-l-4 border-l-purple-500"
            >
              <p class="text-xs text-gray-500 uppercase font-bold">Saldo</p>
              <p class="text-2xl font-bold text-gray-800">
                {{ statsData.user?.coins_balance }} 🪙
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white p-6 rounded-xl shadow border border-gray-300">
              <h3
                class="font-bold text-gray-700 mb-4 border-b border-gray-200 pb-2"
              >
                Ganhos vs Perdas
              </h3>
              <div
                class="flex items-end justify-center gap-12 h-48 pt-4 border-b-2 border-gray-400"
              >
                <div class="text-center w-24 group relative">
                  <div
                    class="bg-green-500 w-full rounded-t transition-all duration-500 hover:bg-green-400 min-h-[4px]"
                    :style="{ height: getBarHeight(statsData.coins_won) }"
                  ></div>
                  <p class="mt-2 font-bold text-green-700 text-lg">
                    +{{ statsData.coins_won }}
                  </p>
                  <p class="text-xs text-gray-600 font-bold">Ganhas</p>
                </div>
                <div class="text-center w-24 group relative">
                  <div
                    class="bg-red-500 w-full rounded-t transition-all duration-500 hover:bg-red-400 min-h-[4px]"
                    :style="{ height: getBarHeight(statsData.coins_lost) }"
                  ></div>
                  <p class="mt-2 font-bold text-red-700 text-lg">
                    -{{ statsData.coins_lost }}
                  </p>
                  <p class="text-xs text-gray-600 font-bold">Perdidas</p>
                </div>
              </div>
            </div>

            <div
              class="bg-white p-6 rounded-xl shadow border border-gray-300 flex flex-col items-center justify-center"
            >
              <h3
                class="font-bold text-gray-700 mb-6 w-full text-left border-b border-gray-200 pb-2"
              >
                Performance
              </h3>
              <div
                class="relative w-48 h-48 rounded-full shadow-inner ring-4 ring-gray-100"
                :style="{
                  background: `conic-gradient(#1e8449 0% ${statsData.win_rate}%, #e5e7eb ${statsData.win_rate}% 100%)`,
                }"
              >
                <div
                  class="absolute inset-0 m-auto w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-sm"
                >
                  <span class="text-2xl font-bold text-[#1e8449]"
                    >{{ statsData.win_rate }}%</span
                  >
                </div>
              </div>
              <div class="mt-6 flex gap-6 text-sm font-bold">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 bg-[#1e8449] rounded-full"></span>
                  <span class="text-gray-700"
                    >Vitórias: {{ statsData.wins }}</span
                  >
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="w-3 h-3 bg-gray-200 rounded-full border border-gray-300"
                  ></span>
                  <span class="text-gray-500"
                    >Derrotas: {{ statsData.losses }}</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="currentTab === 'global'" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            class="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg border border-blue-700 transform hover:scale-105 transition"
          >
            <p class="text-blue-100 text-sm font-bold uppercase mb-1">
              Total Jogadores
            </p>
            <p class="text-4xl font-bold">{{ globalData.total_users }}</p>
          </div>

          <div
            class="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg border border-green-700 transform hover:scale-105 transition"
          >
            <p class="text-green-100 text-sm font-bold uppercase mb-1">
              Jogos Realizados
            </p>
            <p class="text-4xl font-bold">{{ globalData.total_games }}</p>
          </div>

          <div
            class="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-6 rounded-xl shadow-lg border border-yellow-700 transform hover:scale-105 transition"
          >
            <p class="text-yellow-100 text-sm font-bold uppercase mb-1">
              Moedas em Jogo
            </p>
            <p class="text-4xl font-bold">{{ globalData.total_coins }} 🪙</p>
          </div>

          <div
            class="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg border border-purple-700 transform hover:scale-105 transition"
          >
            <p class="text-purple-100 text-sm font-bold uppercase mb-1">
              Total Depositado
            </p>
            <p class="text-4xl font-bold">
              {{ safeNumber(globalData.total_eur) }} €
            </p>
          </div>
        </div>

        <div v-if="isAdmin" class="space-y-6 animate-fade-in">
          <h2
            class="text-2xl font-bold text-gray-800 border-l-4 border-[#1e8449] pl-3"
          >
            Analytics Avançado
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              class="bg-white p-6 rounded-xl shadow border border-gray-300 h-80 flex flex-col"
            >
              <h3 class="font-bold text-gray-700 mb-4">
                Vendas (€) - Últimos 6 Meses
              </h3>
              <div class="flex-1 relative w-full">
                <Bar
                  v-if="loaded"
                  :data="salesChartConfig"
                  :options="chartOptions"
                />
              </div>
            </div>

            <div
              class="bg-white p-6 rounded-xl shadow border border-gray-300 h-80 flex flex-col"
            >
              <h3 class="font-bold text-gray-700 mb-4">
                Jogos por Dia - Última Semana
              </h3>
              <div class="flex-1 relative w-full">
                <Bar
                  v-if="loaded"
                  :data="gamesChartConfig"
                  :options="chartOptions"
                />
              </div>
            </div>
          </div>
        </div>

        <div
          v-else-if="!isAdmin"
          class="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg text-center"
        >
          <p>
            Apenas administradores têm acesso a dados financeiros detalhados e
            séries temporais.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, inject } from "vue";
import { useAuthStore } from "@/stores/auth";
import axios from "axios";
import { toast } from "vue-sonner";

// --- IMPORTAÇÕES DO CHART.JS ---
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { Bar } from "vue-chartjs";

// Regista os componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const authStore = useAuthStore();
const serverBaseURL = inject("serverBaseURL");

const currentTab = ref("personal");
const isAdmin = computed(() => authStore.user?.type === "A");

const userList = ref([]);
const currentPage = ref(1);
const lastPage = ref(1);
const searchQuery = ref("");
const selectedUserId = ref(null);
const statsData = ref({
  win_rate: 0,
  coins_won: 0,
  coins_lost: 0,
  total_matches: 0,
  wins: 0,
  losses: 0,
});
const globalData = ref({});
const loaded = ref(false);

// --- DADOS PARA OS GRÁFICOS (REATIVOS) ---
const salesChartConfig = ref({ labels: [], datasets: [] });
const gamesChartConfig = ref({ labels: [], datasets: [] });

// Configuração Visual Limpa
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#1f2937",
      padding: 10,
      cornerRadius: 8,
      displayColors: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: "#f3f4f6" },
      ticks: { font: { size: 11 } },
    },
    x: {
      grid: { display: false },
      ticks: { font: { size: 11, weight: "bold" } },
    },
  },
};

// --- FUNÇÃO DE SEGURANÇA (IMPORTANTE) ---
const safeNumber = (val) => {
  if (val === null || val === undefined) return 0;
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
};

// Processa dados para Chart.js
const prepareCharts = () => {
  // 1. VENDAS (6 Meses Reais)
  const salesLabels = [];
  const salesValues = [];
  const rawSales = globalData.value.admin_charts?.purchases || [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const isoMonth = `${year}-${month}`;
    const display = d
      .toLocaleString("pt-PT", { month: "short" })
      .toUpperCase()
      .replace(".", "");

    salesLabels.push(display);

    // Procura dados (compatível com '2025-12' ou '2025-12-01')
    const found = rawSales.find(
      (item) => item.month && item.month.startsWith(isoMonth)
    );
    salesValues.push(found ? safeNumber(found.total) : 0);
  }

  salesChartConfig.value = {
    labels: salesLabels,
    datasets: [
      {
        label: "Vendas (€)",
        data: salesValues,
        backgroundColor: "#3b82f6", // Azul
        borderRadius: 6,
        barThickness: 25,
        hoverBackgroundColor: "#2563eb",
      },
    ],
  };

  // 2. JOGOS (7 Dias Reais)
  const gamesLabels = [];
  const gamesValues = [];
  const rawGames = globalData.value.admin_charts?.games_activity || [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const isoDate = `${year}-${month}-${day}`;
    const display = `${day}/${month}`;

    gamesLabels.push(display);

    const found = rawGames.find(
      (item) => item.date && item.date.startsWith(isoDate)
    );
    gamesValues.push(found ? safeNumber(found.count) : 0);
  }

  gamesChartConfig.value = {
    labels: gamesLabels,
    datasets: [
      {
        label: "Jogos Realizados",
        data: gamesValues,
        backgroundColor: "#22c55e", // Verde
        borderRadius: 6,
        barThickness: 25,
        hoverBackgroundColor: "#16a34a",
      },
    ],
  };

  loaded.value = true;
};

const getTabClass = (tab) =>
  `px-6 py-2 rounded-md font-medium transition-all ${
    currentTab.value === tab
      ? "bg-[#1e8449] text-white shadow-md"
      : "text-gray-600 hover:bg-gray-100"
  }`;
const getAvatarUrl = (f) =>
  f
    ? `${serverBaseURL}/storage/photos_avatars/${f}`
    : "https://ui-avatars.com/api/?name=User";

const getBarHeight = (val) => {
  const v = safeNumber(val);
  const max =
    Math.max(
      safeNumber(statsData.value.coins_won),
      safeNumber(statsData.value.coins_lost)
    ) || 1;
  const pct = (v / max) * 100;
  return Math.max(pct, 2) + "%";
};

const fetchUserList = async () => {
  try {
    const res = await axios.get(`${serverBaseURL}/api/admin/users`, {
      params: { page: currentPage.value, search: searchQuery.value },
    });
    userList.value = res.data.data;
    lastPage.value = res.data.last_page;
  } catch (e) {
    console.error(e);
  }
};

const changePage = (p) => {
  if (p >= 1 && p <= lastPage.value) {
    currentPage.value = p;
    fetchUserList();
  }
};

const viewUserStats = async (id) => {
  selectedUserId.value = id;
  await fetchStats(id);
};

const fetchStats = async (id = null) => {
  try {
    const url = id
      ? `${serverBaseURL}/api/admin/users/${id}/stats`
      : `${serverBaseURL}/api/me/statistics`;

    const res = await axios.get(url);
    statsData.value = res.data;
  } catch (e) {
    console.error(e);
    toast.error("Erro ao carregar dados.");
  }
};

const fetchGlobal = async () => {
  try {
    const res = await axios.get(`${serverBaseURL}/api/statistics/global`);
    globalData.value = res.data;
    // Importante: Preparar os gráficos apenas depois de receber os dados
    prepareCharts();
  } catch (e) {
    console.error(e);
  }
};

onMounted(() => {
  if (isAdmin.value) {
    fetchUserList();
    fetchGlobal();
  } else {
    fetchStats();
    fetchGlobal();
  }
});
</script>
