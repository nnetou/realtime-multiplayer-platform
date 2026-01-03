<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <!-- Resultado do Jogo Atual -->
      <div class="result-header">
        <h2 class="result-title" :class="resultClass">
          {{ resultTitle }}
        </h2>
        <div class="game-score">
          <p class="score-line">
            <span class="label">Tu:</span>
            <span class="value">{{ playerScore }} pontos</span>
          </p>
          <p class="score-line">
            <span class="label">Oponente:</span>
            <span class="value">{{ opponentScore }} pontos</span>
          </p>
        </div>
      </div>

      <!-- Match Score (Marcas) -->
      <div v-if="isMatchMode" class="match-score">
        <h3 class="match-title">Marcas da Partida</h3>
        <div class="marks-display">
          <div class="marks-item">
            <span class="marks-label">🟢 Tu:</span>
            <span class="marks-count">{{ playerMarks }}</span>
          </div>
          <div class="marks-item">
            <span class="marks-label">🔴 Oponente:</span>
            <span class="marks-count">{{ opponentMarks }}</span>
          </div>
        </div>
      </div>

      <!-- Fim de Partida -->
      <div v-if="isMatchOver" class="match-over">
        <h2 class="final-result" :class="matchWinner === 'player' ? 'win' : 'lose'">
          {{ matchWinner === 'player' ? '🏆 VITÓRIA DA PARTIDA!' : '😔 DERROTA DA PARTIDA' }}
        </h2>
        <p class="final-message">
          {{ matchWinner === 'player' 
            ? 'Parabéns! Ganhaste a partida!' 
            : 'O oponente ganhou a partida.' }}
        </p>
      </div>

      <!-- Botões -->
      <div class="modal-actions">
        <button 
          v-if="!isMatchOver" 
          @click="handleNextGame" 
          class="btn-primary"
        >
          <span class="countdown" v-if="countdown > 0">({{ countdown }}s)</span>
          Próximo Jogo
        </button>
        <button 
          v-if="isMatchOver" 
          @click="handleBackToMenu" 
          class="btn-primary"
        >
          Voltar ao Menu
        </button>
        <button 
          v-if="!isMatchOver && allowForfeit" 
          @click="handleForfeit" 
          class="btn-secondary"
        >
          Desistir da Partida
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';

const props = defineProps({
  show: { type: Boolean, default: false },
  playerScore: { type: Number, default: 0 },
  opponentScore: { type: Number, default: 0 },
  playerMarks: { type: Number, default: 0 },
  opponentMarks: { type: Number, default: 0 },
  isMatchMode: { type: Boolean, default: true },
  isMatchOver: { type: Boolean, default: false },
  matchWinner: { type: String, default: null }, // 'player' | 'opponent'
  allowForfeit: { type: Boolean, default: true },
  autoStartDelay: { type: Number, default: 5 } // segundos até auto-start
});

const emit = defineEmits(['next-game', 'forfeit', 'back-to-menu', 'close']);

const countdown = ref(0);
let countdownInterval = null;

const resultTitle = computed(() => {
  if (props.playerScore > props.opponentScore) return 'VITÓRIA DO JOGO!';
  if (props.playerScore < props.opponentScore) return 'DERROTA DO JOGO';
  return 'EMPATE';
});

const resultClass = computed(() => {
  if (props.playerScore > props.opponentScore) return 'win';
  if (props.playerScore < props.opponentScore) return 'lose';
  return 'draw';
});

const handleNextGame = () => {
  stopCountdown();
  emit('next-game');
};

const handleForfeit = () => {
  stopCountdown();
  emit('forfeit');
};

const handleBackToMenu = () => {
  emit('back-to-menu');
};

const handleClose = () => {
  if (!props.isMatchOver) {
    // Não permite fechar o modal clicando fora durante partida
    return;
  }
  emit('close');
};

const startCountdown = () => {
  if (props.isMatchOver || !props.show) return;
  
  countdown.value = props.autoStartDelay;
  countdownInterval = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      stopCountdown();
      handleNextGame();
    }
  }, 1000);
};

const stopCountdown = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  countdown.value = 0;
};

watch(() => props.show, (newVal) => {
  if (newVal && !props.isMatchOver) {
    startCountdown();
  } else {
    stopCountdown();
  }
}, { immediate: true });

onUnmounted(() => {
  stopCountdown();
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  border-radius: 16px;
  padding: 32px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.1);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.result-header {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}

.result-title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.result-title.win {
  color: #2ecc71;
  text-shadow: 0 0 10px rgba(46, 204, 113, 0.5);
}

.result-title.lose {
  color: #e74c3c;
  text-shadow: 0 0 10px rgba(231, 76, 60, 0.5);
}

.result-title.draw {
  color: #f39c12;
  text-shadow: 0 0 10px rgba(243, 156, 18, 0.5);
}

.game-score {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.score-line {
  display: flex;
  justify-content: space-between;
  font-size: 1.2rem;
  color: white;
}

.score-line .label {
  font-weight: 600;
  color: #bdc3c7;
}

.score-line .value {
  font-weight: bold;
  color: #f1c40f;
}

.match-score {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.match-title {
  text-align: center;
  color: #ecf0f1;
  font-size: 1.3rem;
  margin-bottom: 16px;
  font-weight: 600;
}

.marks-display {
  display: flex;
  justify-content: space-around;
  gap: 16px;
}

.marks-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.marks-label {
  font-size: 1rem;
  color: #bdc3c7;
  font-weight: 500;
}

.marks-count {
  font-size: 2.5rem;
  font-weight: bold;
  color: #f1c40f;
  text-shadow: 0 0 8px rgba(241, 196, 15, 0.4);
}

.match-over {
  text-align: center;
  margin-bottom: 24px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 12px;
}

.final-result {
  font-size: 2.2rem;
  font-weight: bold;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.final-message {
  font-size: 1.1rem;
  color: #ecf0f1;
  margin-top: 8px;
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-primary,
.btn-secondary {
  padding: 14px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.btn-primary {
  background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(46, 204, 113, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(46, 204, 113, 0.6);
}

.btn-secondary {
  background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
}

.btn-secondary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(231, 76, 60, 0.6);
}

.countdown {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-right: 8px;
}
</style>
