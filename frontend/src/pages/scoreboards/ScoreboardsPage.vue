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
          <div class="user-rank-section">
            <p class="user-rank">Your rank: {{ userRanks.wins || 'Not ranked' }}</p>
            <button 
              v-if="userRanks.wins && userRanks.wins !== 'Not ranked' && userRanks.wins !== 'N/A' && userRanks.wins !== 0" 
              class="go-to-rank-btn"
              @click="goToUserRank"
              :disabled="isLoadingUserPage"
            >
              <span v-if="isLoadingUserPage">Loading...</span>
              <span v-else>Go to my rank</span>
            </button>
          </div>
          <div class="leaderboard-list">
            <div 
              v-for="(player, index) in globalStats.data" 
              :key="player.id"
              class="leaderboard-item"
              :class="{ 
                'first': (globalStats.current_page - 1) * globalStats.per_page + index === 0, 
                'second': (globalStats.current_page - 1) * globalStats.per_page + index === 1, 
                'third': (globalStats.current_page - 1) * globalStats.per_page + index === 2,
                'highlight-user': player.id === personalStats.user_id && userHighlighted 
              }"
            >
              <div class="rank">{{ (globalStats.current_page - 1) * globalStats.per_page + index + 1 }}</div>
              <div class="player-info">
                <div class="player-name">
                  {{ player.nickname || player.name }}
                  <span v-if="player.id === personalStats.user_id" class="you-badge">(You)</span>
                </div>
                <div class="player-stats">{{ player.matches_won_count || 0 }} wins</div>
              </div>
              <div class="trophy">
                <span v-if="(globalStats.current_page - 1) * globalStats.per_page + index === 0">🥇</span>
                <span v-else-if="(globalStats.current_page - 1) * globalStats.per_page + index === 1">🥈</span>
                <span v-else-if="(globalStats.current_page - 1) * globalStats.per_page + index === 2">🥉</span>
                <span v-else>{{ (globalStats.current_page - 1) * globalStats.per_page + index + 1 }}</span>
              </div>
            </div>
          </div>
          <!-- PAGINATION -->
          <div class="pagination">
            <button 
              class="page-btn" 
              :disabled="globalStats.current_page <= 1"
              @click="changePage(globalStats.current_page - 1)"
            >
              Previous
            </button>
            <span class="page-info">Page {{ globalStats.current_page }} of {{ globalStats.last_page }}</span>
            <button 
              class="page-btn" 
              :disabled="globalStats.current_page >= globalStats.last_page"
              @click="changePage(globalStats.current_page + 1)"
            >
              Next
            </button>
          </div>
        </div>

        <!-- LEADERBOARD POR MOEDAS -->
        <div v-if="globalFilter === 'coins'" class="leaderboard">
          <h3 class="leaderboard-title">Top Players by Coins</h3>
          <div class="user-rank-section">
            <p class="user-rank">Your rank: {{ userRanks.coins || 'Not ranked' }}</p>
            <button 
              v-if="userRanks.coins && userRanks.coins !== 'Not ranked' && userRanks.coins !== 'N/A' && userRanks.coins !== 0" 
              class="go-to-rank-btn"
              @click="goToUserRank"
              :disabled="isLoadingUserPage"
            >
              <span v-if="isLoadingUserPage">Loading...</span>
              <span v-else>Go to my rank</span>
            </button>
          </div>
          <div class="leaderboard-list">
            <div 
              v-for="(player, index) in globalStats.data" 
              :key="player.id"
              class="leaderboard-item"
              :class="{ 
                'first': (globalStats.current_page - 1) * globalStats.per_page + index === 0, 
                'second': (globalStats.current_page - 1) * globalStats.per_page + index === 1, 
                'third': (globalStats.current_page - 1) * globalStats.per_page + index === 2,
                'highlight-user': player.id === personalStats.user_id && userHighlighted 
              }"
            >
              <div class="rank">{{ (globalStats.current_page - 1) * globalStats.per_page + index + 1 }}</div>
              <div class="player-info">
                <div class="player-name">
                  {{ player.nickname || player.name }}
                  <span v-if="player.id === personalStats.user_id" class="you-badge">(You)</span>
                </div>
                <div class="player-stats">{{ player.coins_balance || 0 }} coins</div>
              </div>
              <div class="trophy">
                <span v-if="(globalStats.current_page - 1) * globalStats.per_page + index === 0">💰</span>
                <span v-else-if="(globalStats.current_page - 1) * globalStats.per_page + index === 1">💵</span>
                <span v-else-if="(globalStats.current_page - 1) * globalStats.per_page + index === 2">💸</span>
                <span v-else>🪙</span>
              </div>
            </div>
          </div>
          <!-- PAGINATION -->
          <div class="pagination">
            <button 
              class="page-btn" 
              :disabled="globalStats.current_page <= 1"
              @click="changePage(globalStats.current_page - 1)"
            >
              Previous
            </button>
            <span class="page-info">Page {{ globalStats.current_page }} of {{ globalStats.last_page }}</span>
            <button 
              class="page-btn" 
              :disabled="globalStats.current_page >= globalStats.last_page"
              @click="changePage(globalStats.current_page + 1)"
            >
              Next
            </button>
          </div>
        </div>

        <!-- LEADERBOARD POR ACHIEVEMENTS -->
        <div v-if="globalFilter === 'achievements'" class="leaderboard">
          <h3 class="leaderboard-title">Top Players by Achievements</h3>
          <div class="user-rank-section">
            <p class="user-rank">Your rank: {{ userRanks.achievements || 'Not ranked' }}</p>
            <button 
              v-if="userRanks.achievements && userRanks.achievements !== 'Not ranked' && userRanks.achievements !== 'N/A' && userRanks.achievements !== 0" 
              class="go-to-rank-btn"
              @click="goToUserRank"
              :disabled="isLoadingUserPage"
            >
              <span v-if="isLoadingUserPage">Loading...</span>
              <span v-else>Go to my rank</span>
            </button>
          </div>
          <div class="leaderboard-list">
            <div 
              v-for="(player, index) in globalStats.data" 
              :key="player.id"
              class="leaderboard-item"
              :class="{ 
                'first': (globalStats.current_page - 1) * globalStats.per_page + index === 0, 
                'second': (globalStats.current_page - 1) * globalStats.per_page + index === 1, 
                'third': (globalStats.current_page - 1) * globalStats.per_page + index === 2,
                'highlight-user': player.id === personalStats.user_id && userHighlighted 
              }"
            >
              <div class="rank">{{ (globalStats.current_page - 1) * globalStats.per_page + index + 1 }}</div>
              <div class="player-info">
                <div class="player-name">
                  {{ player.nickname || player.name }}
                  <span v-if="player.id === personalStats.user_id" class="you-badge">(You)</span>
                </div>
                <div class="player-stats">{{ player.achievements_count || 0 }} achievements</div>
              </div>
              <div class="trophy">
                <span v-if="(globalStats.current_page - 1) * globalStats.per_page + index === 0">🏆</span>
                <span v-else-if="(globalStats.current_page - 1) * globalStats.per_page + index === 1">🎖️</span>
                <span v-else-if="(globalStats.current_page - 1) * globalStats.per_page + index === 2">🎗️</span>
                <span v-else>⭐</span>
              </div>
            </div>
          </div>
          <!-- PAGINATION -->
          <div class="pagination">
            <button 
              class="page-btn" 
              :disabled="globalStats.current_page <= 1"
              @click="changePage(globalStats.current_page - 1)"
            >
              Previous
            </button>
            <span class="page-info">Page {{ globalStats.current_page }} of {{ globalStats.last_page }}</span>
            <button 
              class="page-btn" 
              :disabled="globalStats.current_page >= globalStats.last_page"
              @click="changePage(globalStats.current_page + 1)"
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
import { ref, onMounted, inject, watch, nextTick } from "vue";
import axios from "axios";

const apiBaseURL = inject('apiBaseURL');
const activeTab = ref('personal');
const globalFilter = ref('wins');
const loading = ref(false);
const error = ref(null);
const isLoadingUserPage = ref(false);
const userHighlighted = ref(false);

const personalStats = ref({
  user_id: null,
  total_matches: 0,
  won_matches: 0,
  lost_matches: 0,
  win_rate: 0,
  capote_count: 0,
  bandeira_count: 0,
  coins_balance: 0
});

const globalStats = ref({
  data: [],
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0
});

const userRanks = ref({
  wins: 0,
  coins: 0,
  achievements: 0
});

const currentPage = ref(1);

const loadPersonalStats = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await axios.get(`${apiBaseURL}/scoreboard/personal`);
    personalStats.value = response.data;
    
    // Carregar ranks do usuário
    await loadUserRanks();
  } catch (err) {
    console.error('Error loading personal stats:', err);
    error.value = 'Failed to load personal statistics';
  } finally {
    loading.value = false;
  }
};

const loadGlobalStats = async (page = 1) => {
  loading.value = true;
  error.value = null;
  userHighlighted.value = false; // Reset highlight quando muda página
  
  try {
    const response = await axios.get(`${apiBaseURL}/scoreboard/global`, {
      params: {
        filter: globalFilter.value,
        page: page,
        per_page: globalStats.value.per_page
      }
    });
    
    globalStats.value = {
      data: response.data.data || [],
      current_page: response.data.current_page || 1,
      last_page: response.data.last_page || 1,
      per_page: response.data.per_page || 10,
      total: response.data.total || 0
    };
    
    currentPage.value = page;
  } catch (err) {
    console.error('Error loading global stats:', err);
    error.value = 'Failed to load global leaderboard';
  } finally {
    loading.value = false;
  }
};

const loadUserRanks = async () => {
  try {
    const [winsRes, coinsRes, achievementsRes] = await Promise.all([
      axios.get(`${apiBaseURL}/scoreboard/user-rank`, { 
        params: { 
          category: 'wins', 
          user_id: personalStats.value.user_id 
        } 
      }),
      axios.get(`${apiBaseURL}/scoreboard/user-rank`, { 
        params: { 
          category: 'coins', 
          user_id: personalStats.value.user_id 
        } 
      }),
      axios.get(`${apiBaseURL}/scoreboard/user-rank`, { 
        params: { 
          category: 'achievements', 
          user_id: personalStats.value.user_id 
        } 
      })
    ]);
    
    userRanks.value.wins = winsRes.data.rank || 'Not ranked';
    userRanks.value.coins = coinsRes.data.rank || 'Not ranked';
    userRanks.value.achievements = achievementsRes.data.rank || 'Not ranked';
  } catch (err) {
    console.error('Error loading user ranks:', err);
    userRanks.value = { wins: 'N/A', coins: 'N/A', achievements: 'N/A' };
  }
};

const changeFilter = (filter) => {
  globalFilter.value = filter;
  currentPage.value = 1;
  loadGlobalStats(1);
};

const changePage = (page) => {
  if (page < 1 || page > globalStats.value.last_page) return;
  loadGlobalStats(page);
};

const goToUserRank = async () => {
  if (!personalStats.value.user_id) return;
  
  isLoadingUserPage.value = true;
  userHighlighted.value = false;
  
  try {
    // Obter o rank atual do usuário
    const currentRank = userRanks.value[globalFilter.value];
    
    if (!currentRank || currentRank === 'Not ranked' || currentRank === 'N/A' || currentRank === 0) {
      return;
    }
    
    // Calcular em qual página o usuário está
    const userPage = Math.ceil(currentRank / globalStats.value.per_page);
    
    // Se já estiver na página correta, apenas destaca
    if (userPage === globalStats.value.current_page) {
      highlightUserRow();
    } else {
      // Ir para a página do usuário
      await loadGlobalStats(userPage);
      
      // Aguardar renderização e destacar
      await nextTick();
      highlightUserRow();
    }
    
  } catch (err) {
    console.error('Error going to user rank:', err);
    error.value = 'Failed to navigate to your rank';
  } finally {
    isLoadingUserPage.value = false;
  }
};

const highlightUserRow = () => {
  userHighlighted.value = true;
  
  // Scroll para a linha do usuário se estiver visível
  setTimeout(() => {
    const userElement = document.querySelector('.highlight-user');
    if (userElement) {
      userElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Remover highlight após 5 segundos
      setTimeout(() => {
        userHighlighted.value = false;
      }, 5000);
    }
  }, 100);
};

watch(activeTab, (newTab) => {
  if (newTab === 'personal') {
    loadPersonalStats();
  } else if (newTab === 'global') {
    loadGlobalStats(currentPage.value);
  }
});

watch(globalFilter, () => {
  currentPage.value = 1;
  loadGlobalStats(1);
});

onMounted(() => {
  loadPersonalStats();
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
  margin-bottom: 10px;
  color: #2c3e50;
  text-align: center;
}

.user-rank-section {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.user-rank {
  font-size: 16px;
  color: #007bff;
  font-weight: bold;
  margin: 0;
}

.go-to-rank-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #4caf50, #2e7d32);
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
  font-size: 14px;
}

.go-to-rank-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #43a047, #1b5e20);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

.go-to-rank-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
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
  transition: all 0.3s;
  position: relative;
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

/* Highlight para o usuário */
.leaderboard-item.highlight-user {
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9) !important;
  border-left: 5px solid #4caf50 !important;
  animation: pulse-highlight 2s ease-in-out;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.3);
}

@keyframes pulse-highlight {
  0% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
  }
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
  display: flex;
  align-items: center;
  gap: 5px;
}

.you-badge {
  font-size: 12px;
  color: #4caf50;
  font-weight: bold;
  background: #e8f5e9;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid #c8e6c9;
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

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
  padding: 15px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.page-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #007bff;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.page-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.page-btn:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-2px);
}

.page-info {
  font-weight: bold;
  color: #2c3e50;
}
</style>