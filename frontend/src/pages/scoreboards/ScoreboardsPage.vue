<template>
  <div class="scoreboards-page">
    <h1 class="title">Leaderboards</h1>
    
    <div class="tabs">
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'personal' }"
        @click="activeTab = 'personal'"
      >
        Personal
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'global' }"
        @click="activeTab = 'global'"
      >
        Global
      </button>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <!-- TAB PERSONAL -->
    <div v-if="activeTab === 'personal' && !loading" class="tab-content">
      <div class="personal-stats">
        <h2 class="subtitle">Your Statistics</h2>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ personalStats.total_matches || 0 }}</div>
            <div class="stat-label">Total Matches</div>
          </div>
          
          <div class="stat-card win">
            <div class="stat-value">{{ personalStats.won_matches || 0 }}</div>
            <div class="stat-label">Won Matches</div>
          </div>
          
          <div class="stat-card loss">
            <div class="stat-value">{{ personalStats.lost_matches || 0 }}</div>
            <div class="stat-label">Lost Matches</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-value">{{ personalStats.win_rate || 0 }}%</div>
            <div class="stat-label">Win Rate</div>
          </div>
        </div>

        <div class="achievements-section">
          <h3 class="section-title">Achievements</h3>
          <div class="achievements-grid">
            <div class="achievement-card capote">
              <div class="achievement-icon">🎯</div>
              <div class="achievement-info">
                <div class="achievement-name">Capote</div>
                <div class="achievement-count">{{ personalStats.capote_count || 0 }}</div>
              </div>
            </div>
            
            <div class="achievement-card bandeira">
              <div class="achievement-icon">🚩</div>
              <div class="achievement-info">
                <div class="achievement-name">Bandeira</div>
                <div class="achievement-count">{{ personalStats.bandeira_count || 0 }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="coins-section">
          <div class="coins-card">
            <div class="coins-icon">🪙</div>
            <div class="coins-info">
              <div class="coins-label">Coins Balance</div>
              <div class="coins-value">{{ personalStats.coins_balance || 0 }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB GLOBAL -->
    <div v-if="activeTab === 'global' && !loading" class="tab-content">
      <div class="global-stats">
        <h2 class="subtitle">Global Rankings</h2>
        
        <div class="leaderboard-filters">
          <button 
            class="filter-btn" 
            :class="{ active: globalFilter === 'wins' }"
            @click="changeFilter('wins')"
          >
            Most Wins
          </button>
          <button 
            class="filter-btn" 
            :class="{ active: globalFilter === 'coins' }"
            @click="changeFilter('coins')"
          >
            Most Coins
          </button>
          <button 
            class="filter-btn" 
            :class="{ active: globalFilter === 'achievements' }"
            @click="changeFilter('achievements')"
          >
            Most Achievements
          </button>
        </div>

        <!-- LEADERBOARD POR VITÓRIAS -->
        <div v-if="globalFilter === 'wins'" class="leaderboard">
          <h3 class="leaderboard-title">Top Players by Wins</h3>
          <div class="leaderboard-list">
            <div 
              v-for="(player, index) in globalStats.most_wins" 
              :key="player.id"
              class="leaderboard-item"
              :class="{ 'first': pagination.current_page === 1 && index === 0, 'second': pagination.current_page === 1 && index === 1, 'third': pagination.current_page === 1 && index === 2, 'current-user': player.id === currentUserId }"
            >
              <div class="rank">{{ (pagination.current_page - 1) * pagination.per_page + index + 1 }}</div>
              <div class="player-info">
                <div class="player-name">{{ player.nickname || player.name }}</div>
                <div class="player-stats">{{ player.matches_won_count || 0 }} wins</div>
              </div>
              <div class="trophy">
                <span v-if="pagination.current_page === 1 && index === 0">🥇</span>
                <span v-else-if="pagination.current_page === 1 && index === 1">🥈</span>
                <span v-else-if="pagination.current_page === 1 && index === 2">🥉</span>
                <span v-else>{{ (pagination.current_page - 1) * pagination.per_page + index + 1 }}</span>
              </div>
            </div>
          </div>
          <!-- PAGINATION CONTROLS -->
          <div class="pagination">
            <button 
              class="page-btn" 
              :disabled="!pagination.has_pages || pagination.current_page === 1"
              @click="changePage(pagination.current_page - 1)"
            >
              Previous
            </button>
            <span class="page-info">Page {{ pagination.current_page }} of {{ pagination.last_page }}</span>
            <button 
              class="page-btn" 
              :disabled="!pagination.has_more_pages"
              @click="changePage(pagination.current_page + 1)"
            >
              Next
            </button>
          </div>
        </div>

        <!-- LEADERBOARD POR MOEDAS -->
        <div v-if="globalFilter === 'coins'" class="leaderboard">
          <h3 class="leaderboard-title">Top Players by Coins</h3>
          <div class="leaderboard-list">
            <div 
              v-for="(player, index) in globalStats.most_coins" 
              :key="player.id"
              class="leaderboard-item"
              :class="{ 'first': paginationCoins.current_page === 1 && index === 0, 'second': paginationCoins.current_page === 1 && index === 1, 'third': paginationCoins.current_page === 1 && index === 2, 'current-user': player.id === currentUserId }"
            >
              <div class="rank">{{ (paginationCoins.current_page - 1) * paginationCoins.per_page + index + 1 }}</div>
              <div class="player-info">
                <div class="player-name">{{ player.nickname || player.name }}</div>
                <div class="player-stats">{{ player.coins_balance || 0 }} coins</div>
              </div>
              <div class="trophy">
                <span v-if="paginationCoins.current_page === 1 && index === 0">💰</span>
                <span v-else-if="paginationCoins.current_page === 1 && index === 1">💵</span>
                <span v-else-if="paginationCoins.current_page === 1 && index === 2">💸</span>
                <span v-else>🪙</span>
              </div>
            </div>
          </div>
          <!-- PAGINATION CONTROLS -->
          <div class="pagination">
            <button 
              class="page-btn" 
              :disabled="!paginationCoins.has_pages || paginationCoins.current_page === 1"
              @click="changePage(paginationCoins.current_page - 1)"
            >
              Previous
            </button>
            <span class="page-info">Page {{ paginationCoins.current_page }} of {{ paginationCoins.last_page }}</span>
            <button 
              class="page-btn" 
              :disabled="!paginationCoins.has_more_pages"
              @click="changePage(paginationCoins.current_page + 1)"
            >
              Next
            </button>
          </div>
        </div>

        <!-- LEADERBOARD POR ACHIEVEMENTS -->
        <div v-if="globalFilter === 'achievements'" class="leaderboard">
          <h3 class="leaderboard-title">Top Players by Achievements</h3>
          <div class="leaderboard-list">
            <div 
              v-for="(player, index) in globalStats.most_achievements" 
              :key="player.id"
              class="leaderboard-item"
              :class="{ 'first': paginationAchievements.current_page === 1 && index === 0, 'second': paginationAchievements.current_page === 1 && index === 1, 'third': paginationAchievements.current_page === 1 && index === 2, 'current-user': player.id === currentUserId }"
            >
              <div class="rank">{{ (paginationAchievements.current_page - 1) * paginationAchievements.per_page + index + 1 }}</div>
              <div class="player-info">
                <div class="player-name">{{ player.nickname || player.name }}</div>
                <div class="player-stats">{{ player.achievements_count || 0 }} achievements</div>
              </div>
              <div class="trophy">
                <span v-if="paginationAchievements.current_page === 1 && index === 0">🏆</span>
                <span v-else-if="paginationAchievements.current_page === 1 && index === 1">🎖️</span>
                <span v-else-if="paginationAchievements.current_page === 1 && index === 2">🎗️</span>
                <span v-else>⭐</span>
              </div>
            </div>
          </div>
          <!-- PAGINATION CONTROLS -->
          <div class="pagination">
            <button 
              class="page-btn" 
              :disabled="!paginationAchievements.has_pages || paginationAchievements.current_page === 1"
              @click="changePage(paginationAchievements.current_page - 1)"
            >
              Previous
            </button>
            <span class="page-info">Page {{ paginationAchievements.current_page }} of {{ paginationAchievements.last_page }}</span>
            <button 
              class="page-btn" 
              :disabled="!paginationAchievements.has_more_pages"
              @click="changePage(paginationAchievements.current_page + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject, watch } from "vue";
import axios from "axios";

const apiBaseURL = inject('apiBaseURL');
const activeTab = ref('personal');
const globalFilter = ref('wins');
const loading = ref(false);
const error = ref(null);
const currentUserId = ref(null); // Assume this is set from auth, e.g., from a store or API
const userRank = ref(null);
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  has_pages: false,
  has_more_pages: false
});
const paginationCoins = ref({
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  has_pages: false,
  has_more_pages: false
});
const paginationAchievements = ref({
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  has_pages: false,
  has_more_pages: false
});

const personalStats = ref({
  total_matches: 0,
  won_matches: 0,
  lost_matches: 0,
  win_rate: 0,
  capote_count: 0,
  bandeira_count: 0,
  coins_balance: 0
});

const globalStats = ref({
  most_wins: [],
  most_coins: [],
  most_achievements: []
});

// Function to get current user ID (implement based on your auth system)
const getCurrentUserId = async () => {
  try {
    const response = await axios.get(`${apiBaseURL}/user`); // Assuming an endpoint to get current user
    currentUserId.value = response.data.id;
  } catch (err) {
    console.error('Error getting current user:', err);
    currentUserId.value = null;
  }
};

const loadPersonalStats = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await axios.get(`${apiBaseURL}/scoreboard/personal`);
    personalStats.value = response.data;
    console.log('Personal stats loaded:', personalStats.value);
  } catch (err) {
    console.error('Error loading personal stats:', err);
    error.value = err.response?.data?.message || "Erro ao carregar estatísticas pessoais";
  } finally {
    loading.value = false;
  }
};

const getUserRank = async (category) => {
  if (!currentUserId.value) return;
  try {
    const response = await axios.get(`${apiBaseURL}/scoreboard/user-rank?category=${category}&user_id=${currentUserId.value}`);
    userRank.value = response.data.rank;
  } catch (err) {
    console.error('Error getting user rank:', err);
    userRank.value = null;
  }
};

const loadGlobalStats = async (page = 1) => {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await axios.get(`${apiBaseURL}/scoreboard/global?page=${page}`);
    globalStats.value.most_wins = response.data.most_wins.data;
    globalStats.value.most_coins = response.data.most_coins.data;
    globalStats.value.most_achievements = response.data.most_achievements.data;
    pagination.value = {
      current_page: response.data.most_wins.current_page,
      last_page: response.data.most_wins.last_page,
      per_page: response.data.most_wins.per_page,
      total: response.data.most_wins.total,
      has_pages: response.data.most_wins.current_page > 1 || response.data.most_wins.last_page > 1,
      has_more_pages: response.data.most_wins.current_page < response.data.most_wins.last_page,
    };
    paginationCoins.value = {
      current_page: response.data.most_coins.current_page,
      last_page: response.data.most_coins.last_page,
      per_page: response.data.most_coins.per_page,
      total: response.data.most_coins.total,
      has_pages: response.data.most_coins.current_page > 1 || response.data.most_coins.last_page > 1,
      has_more_pages: response.data.most_coins.current_page < response.data.most_coins.last_page,
    };
    paginationAchievements.value = {
      current_page: response.data.most_achievements.current_page,
      last_page: response.data.most_achievements.last_page,
      per_page: response.data.most_achievements.per_page,
      total: response.data.most_achievements.total,
      has_pages: response.data.most_achievements.current_page > 1 || response.data.most_achievements.last_page > 1,
      has_more_pages: response.data.most_achievements.current_page < response.data.most_achievements.last_page,
    };
    console.log('Global stats loaded:', globalStats.value);
  } catch (err) {
    console.error('Error loading global stats:', err);
    error.value = err.response?.data?.message || "Erro ao carregar estatísticas globais";
  } finally {
    loading.value = false;
  }
};

const changeFilter = async (filter) => {
  globalFilter.value = filter;
  if (!currentUserId.value) await getCurrentUserId();
  if (filter === 'wins') {
    await loadGlobalStats(1); // Load page 1 first to get pagination
    await getUserRank('wins');
    if (userRank.value && userRank.value > 0) {
      const page = Math.ceil(userRank.value / pagination.value.per_page);
      if (page !== pagination.value.current_page) {
        await loadGlobalStats(page);
      }
    }
  } else {
    await loadGlobalStats(1); // For coins and achievements, load page 1
  }
};

const changePage = async (page) => {
  await loadGlobalStats(page);
};

watch(activeTab, async (newTab) => {
  if (newTab === 'personal') {
    await loadPersonalStats();
  } else if (newTab === 'global') {
    await changeFilter(globalFilter.value);
  }
});

onMounted(async () => {
  await getCurrentUserId();
  await loadPersonalStats();
});
</script>

<style scoped>
.scoreboards-page {
  padding: 20px;
  background: #f3f3f3;
  min-height: 100vh;
}

.title {
  margin-bottom: 20px;
  font-size: 28px;
  font-weight: bold;
  text-align: center;
  color: #2c3e50;
}

.tabs {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 30px;
}

.tab-button {
  padding: 12px 30px;
  border: none;
  border-radius: 25px;
  background: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.tab-button.active {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  box-shadow: 0 4px 12px rgba(0,123,255,0.3);
}

.tab-button:hover:not(.active) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.loading {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #666;
}

.error {
  color: #d93030;
  padding: 15px;
  background: #ffe6e6;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
}

.subtitle {
  font-size: 24px;
  margin-bottom: 20px;
  color: #2c3e50;
  text-align: center;
}

/* PERSONAL STATS */
.personal-stats {
  max-width: 800px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

@media (min-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-card {
  background: white;
  border-radius: 15px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  transition: transform 0.3s;
  border: 2px solid #e0e0e0;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
}

.stat-card.win {
  border-color: #2ecc71;
  background: linear-gradient(135deg, #f0f9f4, #e0f2e9);
}

.stat-card.loss {
  border-color: #e74c3c;
  background: linear-gradient(135deg, #fef5f5, #fce4e4);
}

.stat-value {
  font-size: 36px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 5px;
}

.stat-card.win .stat-value {
  color: #2ecc71;
}

.stat-card.loss .stat-value {
  color: #e74c3c;
}

.stat-label {
  font-size: 14px;
  color: #7f8c8d;
  font-weight: 600;
}

.section-title {
  font-size: 20px;
  margin: 30px 0 15px;
  color: #2c3e50;
  text-align: center;
}

.achievements-section {
  margin-bottom: 30px;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.achievement-card {
  background: white;
  border-radius: 15px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  border: 3px solid;
}

.achievement-card.capote {
  border-color: #f39c12;
  background: linear-gradient(135deg, #fff8e1, #ffe0b2);
}

.achievement-card.bandeira {
  border-color: #3498db;
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
}

.achievement-icon {
  font-size: 40px;
}

.achievement-info {
  flex: 1;
}

.achievement-name {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
  color: #2c3e50;
}

.achievement-count {
  font-size: 28px;
  font-weight: bold;
}

.achievement-card.capote .achievement-count {
  color: #f39c12;
}

.achievement-card.bandeira .achievement-count {
  color: #3498db;
}

.coins-section {
  display: flex;
  justify-content: center;
}

.coins-card {
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
  border-radius: 15px;
  padding: 25px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  border: 3px solid #ffb300;
  min-width: 300px;
}

.coins-icon {
  font-size: 50px;
}

.coins-info {
  flex: 1;
}

.coins-label {
  font-size: 16px;
  color: #666;
  margin-bottom: 5px;
}

.coins-value {
  font-size: 32px;
  font-weight: bold;
  color: #ff9800;
}

/* GLOBAL STATS */
.global-stats {
  max-width: 800px;
  margin: 0 auto;
}

.leaderboard-filters {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 20px;
  background: white;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.filter-btn.active {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  box-shadow: 0 4px 12px rgba(0,123,255,0.3);
}

.filter-btn:hover:not(.active) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.leaderboard-title {
  font-size: 20px;
  margin-bottom: 20px;
  color: #2c3e50;
  text-align: center;
}

.leaderboard-list {
  background: white;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.leaderboard-item {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  transition: background 0.3s;
}

.leaderboard-item:hover {
  background: #f8f9fa;
}

.leaderboard-item.first {
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
  border-left: 5px solid #ff9800;
}

.leaderboard-item.second {
  background: linear-gradient(135deg, #f5f5f5, #e0e0e0);
  border-left: 5px solid #9e9e9e;
}

.leaderboard-item.third {
  background: linear-gradient(135deg, #ffecb3, #ffcc80);
  border-left: 5px solid #ff9800;
}

.rank {
  width: 40px;
  font-size: 18px;
  font-weight: bold;
  color: #666;
}

.player-info {
  flex: 1;
}

.player-name {
  font-size: 16px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 3px;
}

.player-stats {
  font-size: 14px;
  color: #7f8c8d;
}

.trophy {
  font-size: 24px;
  width: 40px;
  text-align: center;
}

/* Add styles for pagination and current user highlight */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
}

.page-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  background: #007bff;
  color: white;
  cursor: pointer;
  transition: background 0.3s;
}

.page-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.page-btn:hover:not(:disabled) {
  background: #0056b3;
}

.page-info {
  font-size: 14px;
  color: #666;
}

.leaderboard-item.current-user {
  background: linear-gradient(135deg, #e1f5fe, #b3e5fc);
  border-left: 5px solid #2196f3;
  font-weight: bold;
}
</style>