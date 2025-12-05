<template>
  <div class="page">
    <h1 class="title">Match History</h1>

    <!-- FILTROS -->
    <div class="filters-section">
      <div class="filters">
        <button 
          class="filter-btn" 
          :class="{ active: typeFilter === 'all' }"
          @click="typeFilter = 'all'; applyFilters()"
        >
          All Types
        </button>
        <button 
          class="filter-btn" 
          :class="{ active: typeFilter === '3' }"
          @click="typeFilter = '3'; applyFilters()"
        >
          Bisca de 3
        </button>
        <button 
          class="filter-btn" 
          :class="{ active: typeFilter === '9' }"
          @click="typeFilter = '9'; applyFilters()"
        >
          Bisca de 9
        </button>
        <button 
          class="filter-btn" 
          :class="{ active: resultFilter === 'win' }"
          @click="toggleResultFilter('win')"
        >
          Wins
        </button>
        <button 
          class="filter-btn" 
          :class="{ active: resultFilter === 'loss' }"
          @click="toggleResultFilter('loss')"
        >
          Losses
        </button>
        <button 
          class="filter-btn" 
          :class="{ active: resultFilter === 'draw' }"
          @click="toggleResultFilter('draw')"
        >
          Draws
        </button>
      </div>
      
      <div class="date-filter">
        <input 
          type="date" 
          v-model="dateFrom" 
          @change="applyFilters"
          class="date-input"
          placeholder="From date"
        />
        <button @click="clearDateFilter" class="clear-date-btn">Clear Date</button>
      </div>
    </div>

    <!-- LOADING & ERROR -->
    <div v-if="loading" class="loading">Loading...</div>

    <div v-if="error" class="error">
      {{ error }}
      <button @click="loadHistory" class="retry-btn">Tentar Novamente</button>
    </div>

    <!-- STATS SUMMARY -->
    <div v-if="!loading && !error && matches.length > 0 && !selectedMatch && !selectedGame" class="stats-summary">
      <div class="stat-card">
        <div class="stat-value">{{ totalMatches }}</div>
        <div class="stat-label">Total Matches</div>
      </div>
      <div class="stat-card win">
        <div class="stat-value">{{ wonMatches }}</div>
        <div class="stat-label">Wins</div>
      </div>
      <div class="stat-card loss">
        <div class="stat-value">{{ lostMatches }}</div>
        <div class="stat-label">Losses</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ winRate }}%</div>
        <div class="stat-label">Win Rate</div>
      </div>
    </div>

    <!-- MATCH LIST -->
    <div v-if="!loading && !selectedMatch && !selectedGame" class="section">
      <div v-if="matches.length === 0 && !loading" class="empty-text">
        Ainda não tens partidas registadas.
      </div>

      <div class="match-list">
        <div
          v-for="match in matches"
          :key="match.id"
          class="card"
          @click="selectMatch(match)"
        >
          <div class="card-left">
            <div class="card-title">Match #{{ match.id }}</div>
            <div class="card-subtitle">
              <span class="match-type" :class="match.type === '3' ? 'type-3' : 'type-9'">
                {{ match.type === '3' ? 'Bisca de 3' : 'Bisca de 9' }}
              </span>
              • {{ formatDate(match.ended_at || match.began_at) }}
            </div>
          </div>

          <div class="card-middle">
            <div class="score">
              {{ match.player1_marks || 0 }} - {{ match.player2_marks || 0 }}
            </div>
            <div class="duration">
              {{ formatDuration(match.total_time) }}
            </div>
          </div>

          <div class="card-right">
            <div
              class="badge"
              :class="getMatchResult(match) === 'win' ? 'win' : getMatchResult(match) === 'loss' ? 'loss' : 'draw'"
            >
              {{ getMatchResultLabel(match) }}
            </div>
            <div class="coins" :class="getCoinsClass(match)">
              {{ formatCoins(match) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- GAMES IN MATCH -->
    <div v-if="selectedMatch && !selectedGame" class="section">
      <button class="back-btn" @click="selectedMatch = null">← Back to Matches</button>
      <h2 class="subtitle">Games in Match #{{ selectedMatch.id }}</h2>
      
      <div class="match-header">
        <div class="header-info">
          <div class="info-row">
            <span class="info-label">Date:</span>
            <span class="info-value">{{ formatDate(selectedMatch.ended_at || selectedMatch.began_at) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Type:</span>
            <span class="info-value">{{ selectedMatch.type === '3' ? 'Bisca de 3' : 'Bisca de 9' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Duration:</span>
            <span class="info-value">{{ formatDuration(selectedMatch.total_time) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Final Score:</span>
            <span class="info-value">{{ selectedMatch.player1_marks || 0 }} - {{ selectedMatch.player2_marks || 0 }}</span>
          </div>
        </div>
      </div>

      <div v-if="!selectedMatch.games || selectedMatch.games.length === 0" class="empty-text">
        Sem detalhes de jogos disponíveis.
      </div>

      <div class="games-list">
        <div
          v-for="(game, index) in (selectedMatch.games || [])"
          :key="game.id || index"
          class="card"
          @click="selectGame(game)"
        >
          <div class="card-left">
            <div class="card-title">Game {{ index + 1 }}</div>
            <div v-if="game.ended_at" class="card-subtitle">
              {{ formatDate(game.ended_at) }}
            </div>
          </div>

          <div class="card-middle score">
            {{ game.player1_points || 0 }} - {{ game.player2_points || 0 }}
          </div>

          <div
            class="card-right badge"
            :class="getGameResult(game) === 'win' ? 'win' : getGameResult(game) === 'loss' ? 'loss' : 'draw'"
          >
            {{ getGameResultLabel(game) }}
          </div>
        </div>
      </div>
    </div>

    <!-- GAME DETAILS -->
    <div v-if="selectedGame" class="section">
      <button class="back-btn" @click="selectedGame = null">← Back to Games</button>
      <h2 class="subtitle">Game Details</h2>

      <div class="game-header">
        <div class="header-info">
          <div class="info-row">
            <span class="info-label">Game Type:</span>
            <span class="info-value">{{ selectedGame.type === '3' ? 'Bisca de 3' : 'Bisca de 9' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Duration:</span>
            <span class="info-value">{{ formatDuration(selectedGame.total_time) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Played on:</span>
            <span class="info-value">{{ formatDate(selectedGame.ended_at || selectedGame.began_at) }}</span>
          </div>
        </div>
      </div>

      <div class="score-display">
        <div class="player-score player">
          <div class="label">Player</div>
          <div class="value">{{ selectedGame.player1_points || 0 }}</div>
        </div>
        <div class="separator">-</div>
        <div class="player-score bot">
          <div class="label">Bot</div>
          <div class="value">{{ selectedGame.player2_points || 0 }}</div>
        </div>
      </div>

      <div class="result-summary">
        <div 
          class="result-badge"
          :class="getGameResult(selectedGame) === 'win' ? 'win-badge' : getGameResult(selectedGame) === 'loss' ? 'loss-badge' : 'draw-badge'"
        >
          {{ getGameResultLabel(selectedGame) }}
        </div>
        <div class="result-details">
          Diferença: {{ Math.abs((selectedGame.player1_points || 0) - (selectedGame.player2_points || 0)) }} pontos
        </div>
      </div>

      <!-- ACHIEVEMENTS -->
      <div v-if="hasAchievements(selectedGame)" class="achievements-section">
        <h3 class="subtitle2">Achievements</h3>
        <div class="achievements-list">
          <div v-if="selectedGame.player1_points >= 120" class="achievement-item bandeira">
            <span class="achievement-icon">🚩</span>
            <span class="achievement-text">Bandeira (120 points)</span>
          </div>
          <div v-if="selectedGame.player1_points >= 91 && selectedGame.player1_points < 120" class="achievement-item capote">
            <span class="achievement-icon">🎯</span>
            <span class="achievement-text">Capote (≥91 points)</span>
          </div>
        </div>
      </div>

      <h3 class="subtitle2">Tricks (Rodadas)</h3>

      <div class="tricks-summary">
        <div class="tricks-count">
          Total de Tricks: {{ tricks.length }}
        </div>
        <div class="tricks-stats">
          <div class="stat player-stat">
            <span class="stat-label">Player:</span>
            <span class="stat-value">{{ playerWins }} ganhas</span>
          </div>
          <div class="stat bot-stat">
            <span class="stat-label">Bot:</span>
            <span class="stat-value">{{ botWins }} ganhas</span>
          </div>
        </div>
      </div>

      <div v-if="tricks.length === 0" class="empty-text">
        Sem detalhes de tricks disponíveis.
      </div>

      <div class="tricks-list">
        <div
          v-for="(trick, index) in tricks"
          :key="index"
          class="trick-item"
          :class="trickWinnerClass(trick)"
        >
          <div class="trick-header">
            <div class="trick-title">
              <span class="trick-num">Trick {{ trick.trick || index + 1 }}</span>
              <span class="trick-points">
                <span class="points-label">Pontos:</span>
                <span class="points-value">{{ trick.points || 0 }}</span>
              </span>
            </div>
            <div class="trick-winner">
              <span class="winner-label">Vencedor:</span>
              <span 
                class="winner-name"
                :class="trickWinnerNameClass(trick)"
              >
                {{ getTrickWinnerName(trick) }}
              </span>
            </div>
          </div>

          <!-- ÁREA DO RESULTADO DA RODADA - MELHORADA -->
          <div class="trick-result-container">
            <div class="result-message">
              <span class="result-icon" :class="getResultIconClass(trick)">🏆</span>
              <span class="result-text">
                <strong class="winner-highlight" :class="getWinnerHighlightClass(trick)">
                  {{ getTrickWinnerName(trick) }}
                </strong>
                <span class="result-action"> ganhou </span>
                <strong class="points-highlight">{{ trick.points || 0 }} pontos</strong>
                <span class="result-action"> nesta rodada</span>
              </span>
            </div>
            <div v-if="trick.game_index" class="game-index">
              <span class="game-icon">🎮</span>
              Game {{ trick.game_index }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch } from "vue";
import axios from "axios";

const apiBaseURL = inject('apiBaseURL');
const matches = ref([]);
const loading = ref(false);
const error = ref(null);
const selectedMatch = ref(null);
const selectedGame = ref(null);
const typeFilter = ref('all');
const resultFilter = ref(null);
const dateFrom = ref('');

// Computed properties
const tricks = computed(() => {
  if (!selectedGame.value || !selectedGame.value.custom) return [];
  return selectedGame.value.custom.trick_breakdown || selectedGame.value.custom.tricks || [];
});

const playerWins = computed(() => {
  return tricks.value.filter(t => 
    t.winner && t.winner.toLowerCase() === 'player'
  ).length;
});

const botWins = computed(() => {
  return tricks.value.filter(t => 
    t.winner && t.winner.toLowerCase() === 'bot'
  ).length;
});

const totalMatches = computed(() => matches.value.length);

const wonMatches = computed(() => {
  return matches.value.filter(match => {
    const p1Marks = match.player1_marks || 0;
    const p2Marks = match.player2_marks || 0;
    return p1Marks > p2Marks;
  }).length;
});

const lostMatches = computed(() => {
  return matches.value.filter(match => {
    const p1Marks = match.player1_marks || 0;
    const p2Marks = match.player2_marks || 0;
    return p1Marks < p2Marks;
  }).length;
});

const winRate = computed(() => {
  if (totalMatches.value === 0) return 0;
  return Math.round((wonMatches.value / totalMatches.value) * 100);
});

// Methods
const loadHistory = async () => {
  loading.value = true;
  error.value = null;
  matches.value = [];

  try {
    const params = {};
    if (resultFilter.value) {
      params.result = resultFilter.value;
    }
    if (dateFrom.value) {
      params.date_from = dateFrom.value;
    }
    
    console.log('Fetching matches from API with params:', params);
    const response = await axios.get(`${apiBaseURL}/history/matches`, { params });
    console.log('API Response received, status:', response.status);
    
    if (response.data && Array.isArray(response.data)) {
      let filteredMatches = response.data;
      
      // Apply type filter locally
      if (typeFilter.value !== 'all') {
        filteredMatches = filteredMatches.filter(match => match.type === typeFilter.value);
      }
      
      matches.value = filteredMatches;
      console.log(`Loaded ${matches.value.length} matches`);
      
    } else {
      console.warn('Unexpected response format:', response.data);
      error.value = "Formato de dados inesperado da API";
    }
  } catch (err) {
    console.error('Error loading history:', err);
    
    if (err.response) {
      console.error('Response error:', err.response.status, err.response.data);
      if (err.response.status === 401) {
        error.value = "Não autenticado. Faz login novamente.";
      } else if (err.response.status === 404) {
        error.value = "Rota não encontrada. Verifica a configuração da API.";
      } else if (err.response.status === 500) {
        error.value = "Erro interno do servidor. Tenta mais tarde.";
      } else {
        error.value = `Erro ${err.response.status}: ${err.response.data?.message || 'Erro desconhecido'}`;
      }
    } else if (err.request) {
      console.error('Request error:', err.request);
      error.value = "Não foi possível contactar a API. Verifica a ligação.";
    } else {
      console.error('Config error:', err.message);
      error.value = "Erro ao configurar o pedido.";
    }
  } finally {
    loading.value = false;
  }
};

const applyFilters = () => {
  loadHistory();
};

const clearDateFilter = () => {
  dateFrom.value = '';
  loadHistory();
};

const toggleResultFilter = (result) => {
  if (resultFilter.value === result) {
    resultFilter.value = null;
  } else {
    resultFilter.value = result;
  }
  loadHistory();
};

const selectMatch = (match) => {
  selectedMatch.value = match;
  selectedGame.value = null;
  console.log('Selected match:', match);
};

const selectGame = (game) => {
  selectedGame.value = game;
  console.log('Selected game:', game);
  console.log('Game tricks:', tricks.value);
};

const getMatchResult = (match) => {
  if (!match || match.player1_marks === undefined || match.player2_marks === undefined) {
    return 'unknown';
  }
  const p1Marks = match.player1_marks || 0;
  const p2Marks = match.player2_marks || 0;
  if (p1Marks > p2Marks) return 'win';
  if (p1Marks < p2Marks) return 'loss';
  return 'draw';
};

const getMatchResultLabel = (match) => {
  const result = getMatchResult(match);
  switch(result) {
    case 'win': return 'WIN';
    case 'loss': return 'LOSS';
    case 'draw': return 'DRAW';
    default: return 'N/A';
  }
};

const getGameResult = (game) => {
  if (!game || game.player1_points === undefined || game.player2_points === undefined) {
    return 'unknown';
  }
  const p1Points = game.player1_points || 0;
  const p2Points = game.player2_points || 0;
  if (p1Points > p2Points) return 'win';
  if (p1Points < p2Points) return 'loss';
  return 'draw';
};

const getGameResultLabel = (game) => {
  const result = getGameResult(game);
  switch(result) {
    case 'win': return 'WIN';
    case 'loss': return 'LOSS';
    case 'draw': return 'DRAW';
    default: return 'N/A';
  }
};

const hasAchievements = (game) => {
  if (!game || game.player1_points === undefined) return false;
  return game.player1_points >= 91;
};

const getCoins = (match) => {
  if (!match) return 0;
  
  if (match.custom && match.custom.coins_change !== undefined) {
    return match.custom.coins_change;
  }
  
  const stake = Math.abs(match.stake || 0);
  const isWin = getMatchResult(match) === 'win';
  return isWin ? stake : -stake;
};

const formatCoins = (match) => {
  const coins = getCoins(match);
  if (coins > 0) return `+${coins}`;
  if (coins < 0) return `${coins}`;
  return `0`;
};

const getCoinsClass = (match) => {
  const coins = getCoins(match);
  if (coins > 0) return 'coins-positive';
  if (coins < 0) return 'coins-negative';
  return 'coins-neutral';
};

const getTrickWinnerName = (trick) => {
  if (!trick || !trick.winner) return 'Desconhecido';
  return trick.winner.toLowerCase() === 'player' ? 'PLAYER' : 'BOT';
};

const trickWinnerClass = (trick) => {
  if (!trick || !trick.winner) return 'unknown-win';
  return trick.winner.toLowerCase() === 'player' ? 'player-win' : 'bot-win';
};

const trickWinnerNameClass = (trick) => {
  if (!trick || !trick.winner) return 'unknown-winner';
  return trick.winner.toLowerCase() === 'player' ? 'player-winner' : 'bot-winner';
};

const getResultIconClass = (trick) => {
  if (!trick || !trick.winner) return 'unknown-icon';
  return trick.winner.toLowerCase() === 'player' ? 'player-icon' : 'bot-icon';
};

const getWinnerHighlightClass = (trick) => {
  if (!trick || !trick.winner) return 'unknown-highlight';
  return trick.winner.toLowerCase() === 'player' ? 'player-highlight' : 'bot-highlight';
};

const formatDate = (date) => {
  if (!date) return "N/A";
  try {
    const d = new Date(date);
    return d.toLocaleDateString('pt-PT') + ' ' + d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return "Data inválida";
  }
};

const formatDuration = (seconds) => {
  if (!seconds) return "N/A";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

onMounted(() => {
  console.log('HistoryPage mounted, API Base:', apiBaseURL);
  loadHistory();
});
</script>

<style scoped>
.page {
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

/* FILTERS */
.filters-section {
  margin-bottom: 25px;
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 10px 20px;
  border: 2px solid #007bff;
  border-radius: 25px;
  background: white;
  color: #007bff;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.filter-btn.active {
  background: #007bff;
  color: white;
  box-shadow: 0 3px 8px rgba(0,123,255,0.3);
}

.filter-btn:hover:not(.active) {
  background: #e6f2ff;
  transform: translateY(-2px);
}

.date-filter {
  display: flex;
  gap: 10px;
  align-items: center;
}

.date-input {
  padding: 10px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  flex: 1;
  max-width: 200px;
}

.clear-date-btn {
  padding: 10px 15px;
  border: 2px solid #dc3545;
  border-radius: 8px;
  background: white;
  color: #dc3545;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.clear-date-btn:hover {
  background: #dc3545;
  color: white;
}

/* LOADING & ERROR */
.loading {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #666;
}

.error {
  color: #d93030;
  padding: 20px;
  background: #ffe6e6;
  border-radius: 12px;
  margin-bottom: 20px;
  text-align: center;
  border: 2px solid #ffcccc;
}

.retry-btn {
  margin-top: 15px;
  padding: 10px 20px;
  background: #d93030;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s;
}

.retry-btn:hover {
  background: #b82525;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

/* STATS SUMMARY */
.stats-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 25px;
}

@media (min-width: 768px) {
  .stats-summary {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 3px 10px rgba(0,0,0,0.1);
  border: 2px solid #e0e0e0;
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
  font-size: 32px;
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

/* CARDS */
.card {
  background: white;
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 3px 10px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid #e0e0e0;
}

.card:hover {
  background: #f8f9fa;
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.12);
  border-color: #007bff;
}

.card-left {
  flex: 1;
}

.card-title {
  font-size: 18px;
  font-weight: bold;
  color: #2c3e50;
}

.card-subtitle {
  font-size: 14px;
  color: #7f8c8d;
  margin-top: 5px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.match-type {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.type-3 {
  background: #e3f2fd;
  color: #1976d2;
  border: 1px solid #90caf9;
}

.type-9 {
  background: #f3e5f5;
  color: #7b1fa2;
  border: 1px solid #ce93d8;
}

.card-middle {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 15px;
}

.card-middle .score {
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
}

.card-middle .duration {
  font-size: 12px;
  color: #95a5a6;
  margin-top: 3px;
}

.card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  margin-left: 10px;
}

.badge {
  padding: 6px 14px;
  border-radius: 20px;
  color: white;
  font-weight: bold;
  font-size: 13px;
  min-width: 70px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.win {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
}

.loss {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
}

.draw {
  background: linear-gradient(135deg, #f39c12, #d35400);
}

.coins {
  font-weight: bold;
  font-size: 14px;
  padding: 5px 12px;
  border-radius: 20px;
  min-width: 70px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.coins-positive {
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}

.coins-negative {
  background: linear-gradient(135deg, #ffebee, #ffcdd2);
  color: #c62828;
  border: 1px solid #ef9a9a;
}

.coins-neutral {
  background: linear-gradient(135deg, #f5f5f5, #e0e0e0);
  color: #666;
  border: 1px solid #bdbdbd;
}

/* MATCH HEADER */
.match-header, .game-header {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 3px 10px rgba(0,0,0,0.1);
  border: 2px solid #e0e0e0;
}

.header-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

@media (min-width: 768px) {
  .header-info {
    grid-template-columns: repeat(4, 1fr);
  }
}

.info-row {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 14px;
  color: #7f8c8d;
  margin-bottom: 3px;
}

.info-value {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

/* SCORE DISPLAY */
.score-display {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 30px;
  margin: 25px 0;
  padding: 25px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  border: 2px solid #e0e0e0;
}

.player-score {
  text-align: center;
  padding: 20px;
  border-radius: 15px;
  min-width: 140px;
  background: #f8f9fa;
  box-shadow: 0 3px 8px rgba(0,0,0,0.1);
}

.player-score .label {
  font-size: 16px;
  color: #666;
  margin-bottom: 10px;
  font-weight: 600;
}

.player-score .value {
  font-size: 42px;
  font-weight: bold;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.1);
}

.player-score.player .value {
  color: #2ecc71;
  text-shadow: 0 2px 4px rgba(46, 204, 113, 0.3);
}

.player-score.bot .value {
  color: #e74c3c;
  text-shadow: 0 2px 4px rgba(231, 76, 60, 0.3);
}

.separator {
  font-size: 42px;
  font-weight: bold;
  color: #666;
  margin: 0 15px;
}

/* RESULT SUMMARY */
.result-summary {
  background: white;
  border-radius: 16px;
  padding: 25px;
  margin: 25px 0;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  border: 2px solid #e0e0e0;
}

.result-badge {
  padding: 15px 30px;
  border-radius: 30px;
  font-weight: bold;
  font-size: 20px;
  display: inline-block;
  margin-bottom: 15px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.win-badge {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: white;
}

.loss-badge {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
}

.draw-badge {
  background: linear-gradient(135deg, #f39c12, #d35400);
  color: white;
}

.result-details {
  font-size: 18px;
  color: #666;
  font-weight: 500;
}

/* ACHIEVEMENTS */
.achievements-section {
  background: white;
  border-radius: 16px;
  padding: 25px;
  margin: 25px 0;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  border: 2px solid #e0e0e0;
}

.achievements-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.achievement-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  border-radius: 12px;
  font-size: 18px;
  font-weight: bold;
}

.achievement-item.bandeira {
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  color: #1976d2;
  border: 2px solid #90caf9;
}

.achievement-item.capote {
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
  color: #ff9800;
  border: 2px solid #ffb300;
}

.achievement-icon {
  font-size: 28px;
}

/* TRICKS SUMMARY */
.tricks-summary {
  background: white;
  border-radius: 16px;
  padding: 25px;
  margin: 25px 0;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  border: 2px solid #e0e0e0;
}

.tricks-count {
  font-weight: bold;
  margin-bottom: 20px;
  font-size: 20px;
  color: #2c3e50;
  text-align: center;
}

.tricks-stats {
  display: flex;
  gap: 20px;
}

.stat {
  flex: 1;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 3px 10px rgba(0,0,0,0.1);
}

.player-stat {
  background: linear-gradient(135deg, #f0f9f4, #e0f2e9);
  border: 2px solid #2ecc71;
}

.bot-stat {
  background: linear-gradient(135deg, #fef5f5, #fce4e4);
  border: 2px solid #e74c3c;
}

.stat-label {
  display: block;
  font-weight: bold;
  margin-bottom: 10px;
  font-size: 16px;
}

.player-stat .stat-label {
  color: #2ecc71;
}

.bot-stat .stat-label {
  color: #e74c3c;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
}

/* TRICK ITEMS */
.trick-item {
  background: white;
  border-radius: 16px;
  padding: 25px;
  margin-bottom: 20px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  border-left: 10px solid #ddd;
  border: 2px solid #e0e0e0;
}

.trick-item.player-win {
  border-left-color: #2ecc71;
  background: linear-gradient(135deg, #f9fdfa, #e8f5e9);
  border-color: #a5d6a7;
}

.trick-item.bot-win {
  border-left-color: #e74c3c;
  background: linear-gradient(135deg, #fff9f9, #ffebee);
  border-color: #ef9a9a;
}

.trick-item.unknown-win {
  border-left-color: #95a5a6;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-color: #bdc3c7;
}

.trick-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 2px solid #eee;
}

.trick-title {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.trick-num {
  font-weight: bold;
  font-size: 20px;
  color: #2c3e50;
}

.trick-points {
  display: flex;
  gap: 10px;
  align-items: center;
}

.points-label {
  font-size: 16px;
  color: #7f8c8d;
}

.points-value {
  font-size: 26px;
  font-weight: bold;
  color: #3498db;
  text-shadow: 0 2px 4px rgba(52, 152, 219, 0.3);
}

.trick-winner {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
}

.winner-label {
  font-size: 16px;
  color: #7f8c8d;
}

.winner-name {
  padding: 10px 25px;
  border-radius: 25px;
  font-weight: bold;
  font-size: 16px;
  box-shadow: 0 3px 10px rgba(0,0,0,0.15);
}

.player-winner {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: white;
}

.bot-winner {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
}

.unknown-winner {
  background: linear-gradient(135deg, #95a5a6, #7f8c8d);
  color: white;
}

/* TRICK RESULT CONTAINER - MENSAGEM MELHORADA */
.trick-result-container {
  margin-top: 25px;
  padding: 25px;
  border-radius: 15px;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  text-align: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border: 2px solid #e9ecef;
}

.result-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.result-icon {
  font-size: 35px;
  animation: bounce 0.8s ease infinite alternate;
}

@keyframes bounce {
  0% { transform: translateY(0); }
  100% { transform: translateY(-5px); }
}

.player-icon {
  color: #2ecc71;
  text-shadow: 0 3px 6px rgba(46, 204, 113, 0.4);
  filter: drop-shadow(0 2px 4px rgba(46, 204, 113, 0.3));
}

.bot-icon {
  color: #e74c3c;
  text-shadow: 0 3px 6px rgba(231, 76, 60, 0.4);
  filter: drop-shadow(0 2px 4px rgba(231, 76, 60, 0.3));
}

.unknown-icon {
  color: #95a5a6;
  text-shadow: 0 3px 6px rgba(149, 165, 166, 0.4);
}

.result-text {
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.5;
}

.winner-highlight {
  font-size: 22px;
  padding: 6px 15px;
  border-radius: 12px;
  margin: 0 8px;
  box-shadow: 0 3px 8px rgba(0,0,0,0.15);
}

.player-highlight {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: white;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.bot-highlight {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.unknown-highlight {
  background: linear-gradient(135deg, #95a5a6, #7f8c8d);
  color: white;
}

.points-highlight {
  font-size: 24px;
  color: #3498db;
  margin: 0 8px;
  text-shadow: 0 2px 4px rgba(52, 152, 219, 0.3);
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  padding: 6px 15px;
  border-radius: 12px;
  box-shadow: 0 3px 8px rgba(52, 152, 219, 0.2);
}

.result-action {
  color: #2c3e50;
  font-weight: 500;
}

.game-index {
  margin-top: 20px;
  padding: 12px 25px;
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  border-radius: 25px;
  display: inline-block;
  font-size: 16px;
  color: #1976d2;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2);
  border: 1px solid #90caf9;
}

.game-icon {
  margin-right: 10px;
  font-size: 18px;
}

/* BACK BUTTON */
.back-btn {
  background: linear-gradient(135deg, #007bff, #0056b3);
  border: none;
  font-size: 16px;
  margin-bottom: 20px;
  cursor: pointer;
  color: white;
  padding: 12px 25px;
  border-radius: 30px;
  font-weight: bold;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(0,123,255,0.3);
}

.back-btn:hover {
  background: linear-gradient(135deg, #0056b3, #003d82);
  transform: translateY(-3px);
  box-shadow: 0 6px 15px rgba(0,123,255,0.4);
}

/* EMPTY TEXT */
.empty-text {
  padding: 30px;
  color: #7f8c8d;
  text-align: center;
  font-style: italic;
  font-size: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* SECTION */
.section {
  margin-top: 25px;
}

.subtitle {
  font-size: 24px;
  margin-bottom: 20px;
  color: #2c3e50;
  text-align: center;
}

.subtitle2 {
  font-size: 22px;
  margin-top: 30px;
  margin-bottom: 20px;
  color: #2c3e50;
  text-align: center;
}

.match-list,
.games-list,
.tricks-list {
  margin-top: 20px;
}
</style>