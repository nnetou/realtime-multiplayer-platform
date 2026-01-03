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
            @click="globalFilter = 'wins'"
          >
            Most Wins
          </button>
          <button 
            class="filter-btn" 
            :class="{ active: globalFilter === 'coins' }"
            @click="globalFilter = 'coins'"
          >
            Most Coins
          </button>
          <button 
            class="filter-btn" 
            :class="{ active: globalFilter === 'achievements' }"
            @click="globalFilter = 'achievements'"
          >
            Most Achievements
          </button>
        </div>

        <!-- LEADERBOARD POR VITÓRIAS -->
        <div v-if="globalFilter === 'wins'" class="leaderboard">
          <h3 class="leaderboard-title">Top 10 Players by Wins</h3>
          <div class="leaderboard-list">
            <div 
              v-for="(player, index) in globalStats.most_wins" 
              :key="player.id"
              class="leaderboard-item"
              :class="{ 'first': index === 0, 'second': index === 1, 'third': index === 2 }"
            >
              <div class="rank">{{ index + 1 }}</div>
              <div class="player-info">
                <div class="player-name">{{ player.nickname || player.name }}</div>
                <div class="player-stats">{{ player.matches_won_count || 0 }} wins</div>
              </div>
              <div class="trophy">
                <span v-if="index === 0">🥇</span>
                <span v-else-if="index === 1">🥈</span>
                <span v-else-if="index === 2">🥉</span>
                <span v-else>{{ index + 1 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- LEADERBOARD POR MOEDAS -->
        <div v-if="globalFilter === 'coins'" class="leaderboard">
          <h3 class="leaderboard-title">Top 10 Players by Coins</h3>
          <div class="leaderboard-list">
            <div 
              v-for="(player, index) in globalStats.most_coins" 
              :key="player.id"
              class="leaderboard-item"
              :class="{ 'first': index === 0, 'second': index === 1, 'third': index === 2 }"
            >
              <div class="rank">{{ index + 1 }}</div>
              <div class="player-info">
                <div class="player-name">{{ player.nickname || player.name }}</div>
                <div class="player-stats">{{ player.coins_balance || 0 }} coins</div>
              </div>
              <div class="trophy">
                <span v-if="index === 0">💰</span>
                <span v-else-if="index === 1">💵</span>
                <span v-else-if="index === 2">💸</span>
                <span v-else>🪙</span>
              </div>
            </div>
          </div>
        </div>

        <!-- LEADERBOARD POR ACHIEVEMENTS -->
        <div v-if="globalFilter === 'achievements'" class="leaderboard">
          <h3 class="leaderboard-title">Top 10 Players by Achievements</h3>
          <div class="leaderboard-list">
            <div 
              v-for="(player, index) in globalStats.most_achievements" 
              :key="player.id"
              class="leaderboard-item"
              :class="{ 'first': index === 0, 'second': index === 1, 'third': index === 2 }"
            >
              <div class="rank">{{ index + 1 }}</div>
              <div class="player-info">
                <div class="player-name">{{ player.nickname || player.name }}</div>
                <div class="player-stats">{{ player.achievements_count || 0 }} achievements</div>
              </div>
              <div class="trophy">
                <span v-if="index === 0">🏆</span>
                <span v-else-if="index === 1">🎖️</span>
                <span v-else-if="index === 2">🎗️</span>
                <span v-else>⭐</span>
              </div>
            </div>
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

const loadGlobalStats = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await axios.get(`${apiBaseURL}/scoreboard/global`);
    globalStats.value = response.data;
    console.log('Global stats loaded:', globalStats.value);
  } catch (err) {
    console.error('Error loading global stats:', err);
    error.value = err.response?.data?.message || "Erro ao carregar estatísticas globais";
  } finally {
    loading.value = false;
  }
};

watch(activeTab, (newTab) => {
  if (newTab === 'personal') {
    loadPersonalStats();
  } else if (newTab === 'global') {
    loadGlobalStats();
  }
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
</style>