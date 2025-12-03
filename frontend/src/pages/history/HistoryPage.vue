<template>
  <div class="page">
    <h1 class="title">Match History</h1>

    <div v-if="loading" class="loading">Loading...</div>

    <div v-if="error" class="error">
      {{ error }}
      <button @click="loadHistory" class="retry-btn">Tentar Novamente</button>
    </div>

    <div v-if="!loading && !selectedMatch && !selectedGame" class="section">
      <div v-if="matches.length === 0 && !loading" class="empty-text">
        Ainda não tens partidas registadas.
      </div>

      <!-- Lista de matches -->
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
              {{ formatDate(match.ended_at || match.began_at) }}
            </div>
          </div>

          <div class="card-middle score">
            {{ match.player1_marks || 0 }} - {{ match.player2_marks || 0 }}
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

    <!-- Vista de Games dentro de um Match -->
    <div v-if="selectedMatch && !selectedGame" class="section">
      <button class="back-btn" @click="selectedMatch = null">← Back</button>
      <h2 class="subtitle">Games in Match #{{ selectedMatch.id }}</h2>

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

    <!-- Vista de Tricks dentro de um Game -->
    <div v-if="selectedGame" class="section">
      <button class="back-btn" @click="selectedGame = null">← Back</button>
      <h2 class="subtitle">Game Details</h2>

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
import { ref, computed, onMounted, inject } from "vue";
import axios from "axios";

const apiBaseURL = inject('apiBaseURL');
const matches = ref([]);
const loading = ref(false);
const error = ref(null);
const selectedMatch = ref(null);
const selectedGame = ref(null);

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

const loadHistory = async () => {
  loading.value = true;
  error.value = null;
  matches.value = [];

  try {
    console.log('Fetching matches from API...');
    const response = await axios.get(`${apiBaseURL}/history/matches`);
    console.log('API Response received, status:', response.status);
    
    if (response.data && Array.isArray(response.data)) {
      matches.value = response.data;
      console.log(`Loaded ${matches.value.length} matches`);
      
      if (matches.value.length > 0) {
        console.log('First match sample:', {
          id: matches.value[0].id,
          player1_marks: matches.value[0].player1_marks,
          player2_marks: matches.value[0].player2_marks,
          stake: matches.value[0].stake,
          custom: matches.value[0].custom,
          hasGames: !!matches.value[0].games,
          gamesCount: matches.value[0].games ? matches.value[0].games.length : 0
        });
        
        if (matches.value[0].games && matches.value[0].games.length > 0) {
          console.log('First game sample:', {
            id: matches.value[0].games[0].id,
            player1_points: matches.value[0].games[0].player1_points,
            player2_points: matches.value[0].games[0].player2_points,
            custom: matches.value[0].games[0].custom
          });
        }
      }
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
  if (match.player1_marks > match.player2_marks) return 'win';
  if (match.player1_marks < match.player2_marks) return 'loss';
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
  if (game.player1_points > game.player2_points) return 'win';
  if (game.player1_points < game.player2_points) return 'loss';
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
  margin-bottom: 10px;
  font-size: 28px;
  font-weight: bold;
}

.subtitle {
  font-size: 22px;
  margin-bottom: 10px;
}

.subtitle2 {
  margin-top: 20px;
  margin-bottom: 10px;
  font-size: 18px;
}

.section {
  margin-top: 20px;
}

.empty-text {
  padding: 10px;
  color: #555;
  text-align: center;
  font-style: italic;
}

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
  transition: background 0.3s;
}

.retry-btn:hover {
  background: #b82525;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0px 3px 10px rgba(0,0,0,0.08);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #e0e0e0;
}

.card:hover {
  background: #f8f9fa;
  transform: translateY(-2px);
  box-shadow: 0px 5px 15px rgba(0,0,0,0.12);
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
  margin-top: 4px;
}

.card-middle {
  font-size: 20px;
  font-weight: bold;
  color: #2c3e50;
  margin: 0 15px;
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

.score-display {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 30px;
  margin: 25px 0;
  padding: 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0px 4px 15px rgba(0,0,0,0.1);
  border: 2px solid #e0e0e0;
}

.player-score {
  text-align: center;
  padding: 15px;
  border-radius: 12px;
  min-width: 120px;
  background: #f8f9fa;
}

.player-score .label {
  font-size: 15px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 600;
}

.player-score .value {
  font-size: 36px;
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
  font-size: 36px;
  font-weight: bold;
  color: #666;
  margin: 0 10px;
}

.result-summary {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin: 25px 0;
  text-align: center;
  box-shadow: 0px 4px 15px rgba(0,0,0,0.1);
  border: 2px solid #e0e0e0;
}

.result-badge {
  padding: 12px 25px;
  border-radius: 25px;
  font-weight: bold;
  font-size: 18px;
  display: inline-block;
  margin-bottom: 12px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
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
  font-size: 16px;
  color: #666;
  font-weight: 500;
}

.tricks-summary {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin: 25px 0;
  box-shadow: 0px 4px 15px rgba(0,0,0,0.1);
  border: 2px solid #e0e0e0;
}

.tricks-count {
  font-weight: bold;
  margin-bottom: 15px;
  font-size: 18px;
  color: #2c3e50;
  text-align: center;
}

.tricks-stats {
  display: flex;
  gap: 20px;
}

.stat {
  flex: 1;
  padding: 15px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 3px 6px rgba(0,0,0,0.1);
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
  margin-bottom: 8px;
  font-size: 15px;
}

.player-stat .stat-label {
  color: #2ecc71;
}

.bot-stat .stat-label {
  color: #e74c3c;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #2c3e50;
}

.trick-item {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0px 4px 15px rgba(0,0,0,0.1);
  border-left: 8px solid #ddd;
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
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #eee;
}

.trick-title {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.trick-num {
  font-weight: bold;
  font-size: 18px;
  color: #2c3e50;
}

.trick-points {
  display: flex;
  gap: 8px;
  align-items: center;
}

.points-label {
  font-size: 14px;
  color: #7f8c8d;
}

.points-value {
  font-size: 22px;
  font-weight: bold;
  color: #3498db;
  text-shadow: 0 2px 4px rgba(52, 152, 219, 0.3);
}

.trick-winner {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.winner-label {
  font-size: 14px;
  color: #7f8c8d;
}

.winner-name {
  padding: 8px 20px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 15px;
  box-shadow: 0 3px 6px rgba(0,0,0,0.15);
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

/* NOVOS ESTILOS PARA A MENSAGEM DE RESULTADO */
.trick-result-container {
  margin-top: 20px;
  padding: 20px;
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
  gap: 15px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.result-icon {
  font-size: 28px;
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
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.5;
}

.winner-highlight {
  font-size: 20px;
  padding: 4px 12px;
  border-radius: 10px;
  margin: 0 5px;
  box-shadow: 0 3px 6px rgba(0,0,0,0.15);
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
  font-size: 22px;
  color: #3498db;
  margin: 0 5px;
  text-shadow: 0 2px 4px rgba(52, 152, 219, 0.3);
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  padding: 4px 12px;
  border-radius: 10px;
  box-shadow: 0 3px 6px rgba(52, 152, 219, 0.2);
}

.result-action {
  color: #2c3e50;
  font-weight: 500;
}

.game-index {
  margin-top: 15px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  border-radius: 20px;
  display: inline-block;
  font-size: 15px;
  color: #1976d2;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2);
  border: 1px solid #90caf9;
}

.game-icon {
  margin-right: 8px;
  font-size: 16px;
}

.back-btn {
  background: linear-gradient(135deg, #007bff, #0056b3);
  border: none;
  font-size: 16px;
  margin-bottom: 15px;
  cursor: pointer;
  color: white;
  padding: 10px 20px;
  border-radius: 25px;
  font-weight: bold;
  transition: all 0.3s;
  box-shadow: 0 4px 8px rgba(0,123,255,0.3);
}

.back-btn:hover {
  background: linear-gradient(135deg, #0056b3, #003d82);
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,123,255,0.4);
}

.match-list,
.games-list,
.tricks-list {
  margin-top: 15px;
}
</style>