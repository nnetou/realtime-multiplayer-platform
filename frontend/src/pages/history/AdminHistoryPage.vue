<template>
  <div class="admin-page">
    <h1 class="title">Admin Dashboard - Player Histories</h1>

    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <div class="stat-value">{{ totalPlayers }}</div>
          <div class="stat-label">Total Players</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🎮</div>
        <div class="stat-content">
          <div class="stat-value">{{ totalMatches }}</div>
          <div class="stat-label">Total Matches</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏆</div>
        <div class="stat-content">
          <div class="stat-value">{{ totalGames }}</div>
          <div class="stat-label">Total Games</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-value">{{ totalCoins }}</div>
          <div class="stat-label">Total Coins</div>
        </div>
      </div>
    </div>

    <div class="filters-section">
      <div class="filter-group">
        <label>Search Player:</label>
        <input 
          v-model="searchQuery"
          type="text"
          placeholder="Search by name, nickname or email..."
          class="search-input"
          @input="applyFilters"
        />
      </div>

      <div class="filter-row">
        <div class="filter-group">
          <label>Player:</label>
          <select v-model="selectedPlayerId" class="filter-select" @change="applyFilters">
            <option value="">All Players</option>
            <option v-for="player in filteredPlayers" :key="player.id" :value="player.id">
              {{ player.nickname || player.name }} ({{ player.email }})
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label>Match Type:</label>
          <select v-model="selectedType" class="filter-select" @change="applyFilters">
            <option value="">All Types</option>
            <option value="3">Bisca de 3</option>
            <option value="9">Bisca de 9</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Result:</label>
          <select v-model="selectedResult" class="filter-select" @change="applyFilters">
            <option value="">All Results</option>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="draw">Draw</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Date From:</label>
          <input 
            type="date" 
            v-model="dateFrom" 
            class="date-input"
            @change="applyFilters"
          />
        </div>

        <div class="filter-group">
          <label>Date To:</label>
          <input 
            type="date" 
            v-model="dateTo" 
            class="date-input"
            @change="applyFilters"
          />
        </div>

        <button @click="clearFilters" class="clear-btn">
          Clear Filters
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <div>Loading data...</div>
    </div>

    <div v-if="error" class="error">
      {{ error }}
      <button @click="loadData" class="retry-btn">Try Again</button>
    </div>

    <div v-if="!loading && !error" class="content-section">
      <div class="section-header">
        <h2>All Matches ({{ filteredMatches.length }})</h2>
        <div class="table-actions">
          <button @click="exportToCSV" class="export-btn">
            Export to CSV
          </button>
          <button @click="refreshData" class="refresh-btn">
            Refresh
          </button>
        </div>
      </div>

      <div v-if="filteredMatches.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>No matches found</h3>
        <p>Try changing your filters or check if there are any matches in the system.</p>
      </div>

      <div v-else class="table-container">
        <table class="matches-table">
          <thead>
            <tr>
              <th @click="sortBy('id')" class="sortable">
                ID 
                <span v-if="sortField === 'id'" class="sort-icon">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th @click="sortBy('began_at')" class="sortable">
                Date
                <span v-if="sortField === 'began_at'" class="sort-icon">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th @click="sortBy('type')" class="sortable">
                Type
                <span v-if="sortField === 'type'" class="sort-icon">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th>Player 1</th>
              <th>Player 2</th>
              <th @click="sortBy('player1_marks')" class="sortable">
                Score
                <span v-if="sortField === 'player1_marks'" class="sort-icon">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th>Result</th>
              <th @click="sortBy('total_time')" class="sortable">
                Duration
                <span v-if="sortField === 'total_time'" class="sort-icon">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th>Coins</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="match in paginatedMatches" :key="match.id">
              <td class="match-id">#{{ match.id }}</td>
              <td class="date-cell">
                <div class="date">{{ formatDate(match.began_at) }}</div>
                <div class="time">{{ formatTime(match.began_at) }}</div>
              </td>
              <td>
                <span class="type-badge" :class="match.type === '3' ? 'type-3' : 'type-9'">
                  {{ match.type === '3' ? 'Bisca de 3' : 'Bisca de 9' }}
                </span>
              </td>
              <td>
                <div class="player-cell">
                  <div class="player-name">{{ getPlayerName(match.player1_user_id) }}</div>
                  <div class="player-id">ID: {{ match.player1_user_id }}</div>
                </div>
              </td>
              <td>
                <div class="player-cell">
                  <div class="player-name">{{ getPlayerName(match.player2_user_id) }}</div>
                  <div class="player-id">ID: {{ match.player2_user_id }}</div>
                </div>
              </td>
              <td class="score-cell">
                <div class="score-display">
                  {{ match.player1_marks || 0 }} - {{ match.player2_marks || 0 }}
                </div>
              </td>
              <td>
                <span class="result-badge" :class="getResultClass(match)">
                  {{ getResultText(match) }}
                </span>
              </td>
              <td>{{ formatDuration(match.total_time) }}</td>
              <td>
                <span class="coins-badge" :class="getCoinsClass(match)">
                  {{ getCoinsText(match) }}
                </span>
              </td>
              <td>
                <button @click="viewMatchDetails(match)" class="view-btn">Details</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="pagination" v-if="totalPages > 1">
          <button @click="prevPage" :disabled="currentPage === 1">Previous</button>
          <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
          <button @click="nextPage" :disabled="currentPage === totalPages">Next</button>
          <select v-model="itemsPerPage" @change="itemsPerPageChanged" class="page-select">
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="selectedMatch" class="modal-overlay" @click.self="selectedMatch = null">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Match #{{ selectedMatch.id }} Details</h3>
          <button @click="selectedMatch = null" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <div class="match-info-grid">
            <div class="info-item">
              <span class="info-label">Match ID:</span>
              <span class="info-value">#{{ selectedMatch.id }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Type:</span>
              <span class="info-value">{{ selectedMatch.type === '3' ? 'Bisca de 3' : 'Bisca de 9' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Status:</span>
              <span class="info-value">{{ selectedMatch.status || 'Ended' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Stake:</span>
              <span class="info-value">{{ selectedMatch.stake || 0 }} coins</span>
            </div>
            <div class="info-item">
              <span class="info-label">Started:</span>
              <span class="info-value">{{ formatDateTime(selectedMatch.began_at) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Ended:</span>
              <span class="info-value">{{ formatDateTime(selectedMatch.ended_at) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Duration:</span>
              <span class="info-value">{{ formatDuration(selectedMatch.total_time) }}</span>
            </div>
          </div>

          <div class="players-section">
            <h4>Players</h4>
            <div class="players-grid">
              <div class="player-card" :class="getPlayerCardClass(selectedMatch, 'player1')">
                <div class="player-header">
                  <span class="player-title">Player 1</span>
                  <span v-if="selectedMatch.winner_user_id === selectedMatch.player1_user_id" class="winner-indicator">Winner</span>
                </div>
                <div class="player-details">
                  <div><strong>ID:</strong> {{ selectedMatch.player1_user_id }}</div>
                  <div><strong>Name:</strong> {{ getPlayerName(selectedMatch.player1_user_id) }}</div>
                  <div><strong>Marks:</strong> {{ selectedMatch.player1_marks || 0 }}</div>
                  <div><strong>Points:</strong> {{ selectedMatch.player1_points || 0 }}</div>
                </div>
              </div>
              
              <div class="player-card" :class="getPlayerCardClass(selectedMatch, 'player2')">
                <div class="player-header">
                  <span class="player-title">Player 2</span>
                  <span v-if="selectedMatch.winner_user_id === selectedMatch.player2_user_id" class="winner-indicator">Winner</span>
                </div>
                <div class="player-details">
                  <div><strong>ID:</strong> {{ selectedMatch.player2_user_id }}</div>
                  <div><strong>Name:</strong> {{ getPlayerName(selectedMatch.player2_user_id) }}</div>
                  <div><strong>Marks:</strong> {{ selectedMatch.player2_marks || 0 }}</div>
                  <div><strong>Points:</strong> {{ selectedMatch.player2_points || 0 }}</div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedMatch.games && selectedMatch.games.length > 0" class="games-section">
            <h4>Games ({{ selectedMatch.games.length }})</h4>
            <div class="games-list">
              <div v-for="(game, index) in selectedMatch.games" :key="game.id" class="game-card">
                <div class="game-header">
                  <span class="game-number">Game {{ index + 1 }}</span>
                  <span class="game-score">{{ game.player1_points || 0 }} - {{ game.player2_points || 0 }}</span>
                  <span class="game-result" :class="getGameResultClass(game)">
                    {{ getGameResultText(game) }}
                  </span>
                </div>
                <div class="game-details">
                  <div><strong>Duration:</strong> {{ formatDuration(game.total_time) }}</div>
                  <div><strong>Played:</strong> {{ formatDateTime(game.ended_at || game.began_at) }}</div>
                  <div v-if="game.custom && game.custom.trick_breakdown">
                    <strong>Tricks:</strong> {{ game.custom.trick_breakdown.length }}
                  </div>
                </div>
                <button @click="viewGameDetails(game)" class="game-details-btn">View Game Details</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedGame" class="modal-overlay" @click.self="selectedGame = null">
      <div class="modal-content game-modal">
        <div class="modal-header">
          <h3>Game Details</h3>
          <button @click="selectedGame = null" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <div class="game-score-display">
            <div class="score-player">
              <div class="score-label">{{ getPlayerName(selectedGame.player1_user_id) }}</div>
              <div class="score-value">{{ selectedGame.player1_points || 0 }}</div>
            </div>
            <div class="score-separator">-</div>
            <div class="score-player">
              <div class="score-label">{{ getPlayerName(selectedGame.player2_user_id) }}</div>
              <div class="score-value">{{ selectedGame.player2_points || 0 }}</div>
            </div>
          </div>

          <div v-if="selectedGame.custom && selectedGame.custom.trick_breakdown" class="tricks-section">
            <h4>Tricks ({{ selectedGame.custom.trick_breakdown.length }})</h4>
            <div class="tricks-list">
              <div v-for="(trick, index) in selectedGame.custom.trick_breakdown" :key="index" class="trick-card">
                <div class="trick-header">
                  <span class="trick-number">Trick {{ trick.trick || index + 1 }}</span>
                  <span class="trick-points">{{ trick.points || 0 }} points</span>
                  <span class="trick-winner" :class="trick.winner === 'Player' ? 'player-win' : 'bot-win'">
                    {{ trick.winner === 'Player' ? 'Player Wins' : 'Bot Wins' }}
                  </span>
                </div>
                <div class="trick-body">
                  <div class="trick-info">
                    Winner: <strong>{{ trick.winner }}</strong> earned <strong>{{ trick.points || 0 }} points</strong>
                  </div>
                  <div v-if="trick.game_index" class="game-index">
                    Part of Game {{ trick.game_index }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from "vue";
import axios from "axios";

const apiBaseURL = inject('apiBaseURL');
const loading = ref(false);
const error = ref(null);
const allMatches = ref([]);
const allPlayers = ref([]);
const selectedPlayerId = ref('');
const selectedType = ref('');
const selectedResult = ref('');
const dateFrom = ref('');
const dateTo = ref('');
const searchQuery = ref('');
const selectedMatch = ref(null);
const selectedGame = ref(null);
const sortField = ref('id');
const sortDirection = ref('desc');
const currentPage = ref(1);
const itemsPerPage = ref(20);

const filteredPlayers = computed(() => {
  if (!searchQuery.value) return allPlayers.value;
  
  const query = searchQuery.value.toLowerCase();
  return allPlayers.value.filter(player => {
    return (
      (player.name && player.name.toLowerCase().includes(query)) ||
      (player.nickname && player.nickname.toLowerCase().includes(query)) ||
      (player.email && player.email.toLowerCase().includes(query))
    );
  });
});

const filteredMatches = computed(() => {
  let matches = allMatches.value;
  
  if (selectedPlayerId.value) {
    matches = matches.filter(match => 
      match.player1_user_id == selectedPlayerId.value || 
      match.player2_user_id == selectedPlayerId.value
    );
  }
  
  if (selectedType.value) {
    matches = matches.filter(match => match.type === selectedType.value);
  }
  
  if (selectedResult.value) {
    matches = matches.filter(match => {
      const p1Marks = match.player1_marks || 0;
      const p2Marks = match.player2_marks || 0;
      
      if (selectedResult.value === 'win') {
        return match.winner_user_id == (selectedPlayerId.value || match.player1_user_id);
      } else if (selectedResult.value === 'loss') {
        return match.winner_user_id && match.winner_user_id != (selectedPlayerId.value || match.player1_user_id);
      } else if (selectedResult.value === 'draw') {
        return p1Marks === p2Marks;
      }
      return true;
    });
  }
  
  if (dateFrom.value) {
    const fromDate = new Date(dateFrom.value);
    matches = matches.filter(match => {
      const matchDate = new Date(match.began_at);
      return matchDate >= fromDate;
    });
  }
  
  if (dateTo.value) {
    const toDate = new Date(dateTo.value);
    toDate.setHours(23, 59, 59, 999);
    matches = matches.filter(match => {
      const matchDate = new Date(match.began_at);
      return matchDate <= toDate;
    });
  }
  
  return matches.sort((a, b) => {
    let aVal = a[sortField.value];
    let bVal = b[sortField.value];
    
    if (sortField.value === 'began_at') {
      aVal = new Date(aVal || 0);
      bVal = new Date(bVal || 0);
    }
    
    if (sortDirection.value === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
});

const paginatedMatches = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredMatches.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(filteredMatches.value.length / itemsPerPage.value);
});

const totalPlayers = computed(() => {
  return allPlayers.value.length;
});

const totalMatches = computed(() => {
  return allMatches.value.length;
});

const totalGames = computed(() => {
  return allMatches.value.reduce((total, match) => {
    return total + (match.games ? match.games.length : 0);
  }, 0);
});

const totalCoins = computed(() => {
  return allPlayers.value.reduce((total, player) => {
    return total + (player.coins_balance || 0);
  }, 0);
});

const loadData = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const [matchesResponse, playersResponse] = await Promise.all([
      axios.get(`${apiBaseURL}/admin/matches`),
      axios.get(`${apiBaseURL}/admin/players`)
    ]);
    
    allMatches.value = matchesResponse.data;
    allPlayers.value = playersResponse.data;
    
  } catch (err) {
    console.error('Error loading admin data:', err);
    error.value = err.response?.data?.message || "Error loading data";
  } finally {
    loading.value = false;
  }
};

const applyFilters = () => {
  currentPage.value = 1;
};

const clearFilters = () => {
  selectedPlayerId.value = '';
  selectedType.value = '';
  selectedResult.value = '';
  dateFrom.value = '';
  dateTo.value = '';
  searchQuery.value = '';
  currentPage.value = 1;
};

const sortBy = (field) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortDirection.value = 'desc';
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const itemsPerPageChanged = () => {
  currentPage.value = 1;
};

const refreshData = () => {
  loadData();
};

const exportToCSV = () => {
  const headers = ['ID', 'Date', 'Type', 'Player 1', 'Player 2', 'Score', 'Result', 'Duration', 'Coins'];
  const rows = filteredMatches.value.map(match => [
    match.id,
    formatDate(match.began_at),
    match.type === '3' ? 'Bisca de 3' : 'Bisca de 9',
    getPlayerName(match.player1_user_id),
    getPlayerName(match.player2_user_id),
    `${match.player1_marks || 0}-${match.player2_marks || 0}`,
    getResultText(match),
    formatDuration(match.total_time),
    getCoinsText(match)
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `matches_export_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

const viewMatchDetails = (match) => {
  selectedMatch.value = match;
  selectedGame.value = null;
};

const viewGameDetails = (game) => {
  selectedGame.value = game;
};

const getPlayerName = (playerId) => {
  const player = allPlayers.value.find(p => p.id == playerId);
  if (!player) return `Player ${playerId}`;
  return player.nickname || player.name || `Player ${playerId}`;
};

const getResultClass = (match) => {
  const p1Marks = match.player1_marks || 0;
  const p2Marks = match.player2_marks || 0;
  
  if (p1Marks > p2Marks) return 'result-win';
  if (p1Marks < p2Marks) return 'result-loss';
  return 'result-draw';
};

const getResultText = (match) => {
  const p1Marks = match.player1_marks || 0;
  const p2Marks = match.player2_marks || 0;
  
  if (p1Marks > p2Marks) return 'Win';
  if (p1Marks < p2Marks) return 'Loss';
  return 'Draw';
};

const getGameResultClass = (game) => {
  const p1Points = game.player1_points || 0;
  const p2Points = game.player2_points || 0;
  
  if (p1Points > p2Points) return 'game-win';
  if (p1Points < p2Points) return 'game-loss';
  return 'game-draw';
};

const getGameResultText = (game) => {
  const p1Points = game.player1_points || 0;
  const p2Points = game.player2_points || 0;
  
  if (p1Points > p2Points) return 'Player 1 Won';
  if (p1Points < p2Points) return 'Player 2 Won';
  return 'Draw';
};

const getCoinsClass = (match) => {
  const coins = getCoinsAmount(match);
  if (coins > 0) return 'coins-positive';
  if (coins < 0) return 'coins-negative';
  return 'coins-neutral';
};

const getCoinsText = (match) => {
  const coins = getCoinsAmount(match);
  if (coins > 0) return `+${coins}`;
  if (coins < 0) return `${coins}`;
  return '0';
};

const getCoinsAmount = (match) => {
  if (match.custom && match.custom.coins_change !== undefined) {
    return match.custom.coins_change;
  }
  
  const stake = Math.abs(match.stake || 0);
  const p1Marks = match.player1_marks || 0;
  const p2Marks = match.player2_marks || 0;
  
  if (p1Marks > p2Marks) return stake;
  if (p1Marks < p2Marks) return -stake;
  return 0;
};

const getPlayerCardClass = (match, player) => {
  const isWinner = match.winner_user_id === match[`${player}_user_id`];
  return isWinner ? 'player-winner' : 'player-loser';
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT');
  } catch {
    return 'Invalid Date';
  }
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('pt-PT');
  } catch {
    return 'Invalid Date';
  }
};

const formatDuration = (seconds) => {
  if (!seconds) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.admin-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.title {
  margin-bottom: 30px;
  font-size: 32px;
  font-weight: bold;
  color: #2c3e50;
  text-align: center;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border: 1px solid #e0e6ed;
}

.stat-icon {
  font-size: 36px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #7f8c8d;
  font-weight: 600;
}

.filters-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 30px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border: 1px solid #e0e6ed;
}

.filter-group {
  margin-bottom: 20px;
}

.filter-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e6ed;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #007bff;
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  align-items: end;
}

.filter-select {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e6ed;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.date-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e6ed;
  border-radius: 8px;
  font-size: 14px;
}

.clear-btn {
  padding: 12px 24px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.clear-btn:hover {
  background: #c82333;
}

.loading {
  text-align: center;
  padding: 60px;
  color: #666;
}

.spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  background: #fee;
  border: 2px solid #fcc;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  color: #c00;
  text-align: center;
}

.retry-btn {
  margin-top: 15px;
  padding: 10px 20px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.content-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border: 1px solid #e0e6ed;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 24px;
  color: #2c3e50;
  margin: 0;
}

.table-actions {
  display: flex;
  gap: 12px;
}

.export-btn, .refresh-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.export-btn {
  background: #28a745;
  color: white;
}

.export-btn:hover {
  background: #218838;
}

.refresh-btn {
  background: #17a2b8;
  color: white;
}

.refresh-btn:hover {
  background: #138496;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #7f8c8d;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.empty-state h3 {
  font-size: 20px;
  margin-bottom: 10px;
  color: #2c3e50;
}

.empty-state p {
  font-size: 16px;
  max-width: 400px;
  margin: 0 auto;
}

.table-container {
  overflow-x: auto;
}

.matches-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1200px;
}

.matches-table th {
  background: #f8f9fa;
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 2px solid #e0e6ed;
  font-size: 14px;
}

.matches-table td {
  padding: 16px;
  border-bottom: 1px solid #e0e6ed;
  font-size: 14px;
  vertical-align: middle;
}

.matches-table tbody tr:hover {
  background: #f8f9fa;
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.sortable:hover {
  background: #e9ecef;
}

.sort-icon {
  margin-left: 5px;
  font-size: 12px;
}

.match-id {
  font-weight: bold;
  color: #007bff;
}

.date-cell {
  min-width: 140px;
}

.date {
  font-weight: 600;
  color: #2c3e50;
}

.time {
  font-size: 12px;
  color: #7f8c8d;
}

.type-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
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

.player-cell {
  min-width: 180px;
}

.player-name {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.player-id {
  font-size: 12px;
  color: #7f8c8d;
}

.score-cell {
  text-align: center;
  font-weight: bold;
  font-size: 18px;
  color: #2c3e50;
}

.result-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
}

.result-win {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.result-loss {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.result-draw {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.coins-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
}

.coins-positive {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.coins-negative {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.coins-neutral {
  background: #e2e3e5;
  color: #383d41;
  border: 1px solid #d6d8db;
}

.view-btn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.view-btn:hover {
  background: #0056b3;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.pagination button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s;
}

.pagination button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.pagination button:not(:disabled):hover {
  background: #0056b3;
}

.page-info {
  font-size: 14px;
  color: #2c3e50;
  font-weight: 600;
}

.page-select {
  padding: 10px;
  border: 2px solid #e0e6ed;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
}

.game-modal {
  max-width: 600px;
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid #e0e6ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #7f8c8d;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.close-btn:hover {
  background: #f8f9fa;
  color: #2c3e50;
}

.modal-body {
  padding: 24px;
}

.match-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
  padding-bottom: 30px;
  border-bottom: 1px solid #e0e6ed;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 12px;
  color: #7f8c8d;
  margin-bottom: 4px;
  text-transform: uppercase;
  font-weight: 600;
}

.info-value {
  font-size: 16px;
  color: #2c3e50;
  font-weight: 600;
}

.players-section {
  margin-bottom: 30px;
}

.players-section h4 {
  font-size: 18px;
  margin-bottom: 20px;
  color: #2c3e50;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.player-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border: 2px solid #e0e6ed;
}

.player-card.player-winner {
  border-color: #28a745;
  background: #d4edda;
}

.player-card.player-loser {
  border-color: #dc3545;
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #dee2e6;
}

.player-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.winner-indicator {
  padding: 4px 10px;
  background: #28a745;
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.player-details div {
  margin-bottom: 8px;
  font-size: 14px;
}

.player-details strong {
  color: #2c3e50;
}

.games-section h4 {
  font-size: 18px;
  margin-bottom: 20px;
  color: #2c3e50;
}

.games-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.game-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e0e6ed;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.game-number {
  font-weight: 600;
  color: #2c3e50;
  font-size: 16px;
}

.game-score {
  font-size: 18px;
  font-weight: bold;
  color: #2c3e50;
}

.game-result {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.game-win {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.game-loss {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.game-draw {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.game-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-bottom: 15px;
  font-size: 14px;
}

.game-details div {
  color: #6c757d;
}

.game-details strong {
  color: #2c3e50;
}

.game-details-btn {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.game-details-btn:hover {
  background: #545b62;
}

.game-score-display {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 40px;
  margin: 30px 0;
  padding: 30px;
  background: #f8f9fa;
  border-radius: 12px;
}

.score-player {
  text-align: center;
}

.score-label {
  font-size: 16px;
  color: #6c757d;
  margin-bottom: 10px;
}

.score-value {
  font-size: 48px;
  font-weight: bold;
  color: #2c3e50;
}

.score-separator {
  font-size: 48px;
  font-weight: bold;
  color: #6c757d;
}

.tricks-section {
  margin-top: 30px;
}

.tricks-section h4 {
  font-size: 18px;
  margin-bottom: 20px;
  color: #2c3e50;
}

.tricks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trick-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e0e6ed;
}

.trick-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 10px;
}

.trick-number {
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
}

.trick-points {
  font-size: 14px;
  font-weight: 600;
  color: #007bff;
}

.trick-winner {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.trick-winner.player-win {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.trick-winner.bot-win {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.trick-body {
  font-size: 14px;
  color: #6c757d;
}

.trick-info strong {
  color: #2c3e50;
}

.game-index {
  margin-top: 8px;
  font-size: 12px;
  color: #6c757d;
  font-style: italic;
}
</style>