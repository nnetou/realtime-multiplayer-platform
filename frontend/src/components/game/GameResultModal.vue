<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="result-header">
        <h2 class="result-title" :class="resultClass">
          {{ resultTitle }}
        </h2>

        <p v-if="isTie" class="tie-message">🤝 Ninguém pontua nesta ronda.</p>

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

      <div v-if="isMatchMode" class="match-score">
        <h3 class="match-title">Placar da Partida (Melhor de 4)</h3>
        <div class="marks-display">
          <div class="marks-item">
            <span class="marks-label">🟢 Tu</span>
            <span class="marks-count">{{ playerMarks }}</span>
          </div>
          <div class="marks-divider">vs</div>
          <div class="marks-item">
            <span class="marks-label">🔴 Oponente</span>
            <span class="marks-count">{{ opponentMarks }}</span>
          </div>
        </div>
      </div>

      <div v-if="isMatchOver" class="match-over">
        <h2
          class="final-result"
          :class="matchWinner === 'player' ? 'win' : 'lose'"
        >
          {{
            matchWinner === "player"
              ? "🏆 VENCEDOR DA PARTIDA!"
              : "💀 DERROTA NA PARTIDA"
          }}
        </h2>
        <p class="final-message">
          {{
            matchWinner === "player"
              ? "Parabéns! Venceste o match!"
              : "Mais sorte para a próxima."
          }}
        </p>
      </div>

      <div v-if="awaitingOpponent && !isMatchOver" class="awaiting-opponent">
        <div class="spinner"></div>
        <p class="awaiting-text">⏳ Aguardando que o oponente aceite...</p>
        <p class="awaiting-subtext">
          O jogo começará quando ambos estiverem prontos.
        </p>
      </div>

      <div class="modal-actions">
        <button
          v-if="!isMatchOver && !awaitingOpponent"
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
          Voltar ao Menu Principal
        </button>

        <button
          v-if="!isMatchOver && !awaitingOpponent && allowForfeit"
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
import { ref, computed, watch, onUnmounted } from "vue";

const props = defineProps({
  show: { type: Boolean, default: false },
  playerScore: { type: Number, default: 0 },
  opponentScore: { type: Number, default: 0 },
  playerMarks: { type: Number, default: 0 },
  opponentMarks: { type: Number, default: 0 },
  playerTotalPoints: { type: Number, default: 0 }, // Total pontos da match
  opponentTotalPoints: { type: Number, default: 0 }, // Total pontos da match
  isMatchMode: { type: Boolean, default: true },
  isMatchOver: { type: Boolean, default: false },
  matchWinner: { type: String, default: null }, // 'player' | 'opponent'
  allowForfeit: { type: Boolean, default: true },
  awaitingOpponent: { type: Boolean, default: false },
  outcome: { type: String, default: "" }, // 'win', 'lose', 'tie'
  autoStartDelay: { type: Number, default: 15 }, // Aumentado para 15s para dar tempo
});

const emit = defineEmits(["next-game", "forfeit", "back-to-menu", "close"]);

const countdown = ref(0);
let countdownInterval = null;

// Computados para UI
const isTie = computed(() => {
  // Verifica por prop explícita ou por score
  return props.outcome === "tie" || props.playerScore === props.opponentScore;
});

const resultTitle = computed(() => {
  if (isTie.value) return "JOGO EMPATADO";
  if (props.playerScore > props.opponentScore) return "VITÓRIA NA RONDA!";
  return "DERROTA NA RONDA";
});

const resultClass = computed(() => {
  if (isTie.value) return "draw";
  if (props.playerScore > props.opponentScore) return "win";
  return "lose";
});

// Ações
const handleNextGame = () => {
  stopCountdown();
  emit("next-game"); // O pai vai setar awaitingOpponent = true
};

const handleForfeit = () => {
  stopCountdown();
  emit("forfeit");
};

const handleBackToMenu = () => {
  emit("back-to-menu");
};

const handleClose = () => {
  // Impede fechar clicando fora a menos que o match tenha acabado
  if (props.isMatchOver) {
    emit("close");
  }
};

// Countdown Logic
const startCountdown = () => {
  if (props.isMatchOver || !props.show || props.awaitingOpponent) return;

  countdown.value = props.autoStartDelay;
  countdownInterval = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      stopCountdown();
      handleNextGame(); // Auto-aceita se o tempo acabar
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

// Watchers
watch(
  () => props.show,
  (newVal) => {
    if (newVal && !props.isMatchOver && !props.awaitingOpponent) {
      startCountdown();
    } else {
      stopCountdown();
    }
  },
  { immediate: true }
);

// Se entrarmos em estado de espera, para o countdown
watch(
  () => props.awaitingOpponent,
  (newVal) => {
    if (newVal) stopCountdown();
  }
);

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
  background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%);
  border-radius: 16px;
  padding: 32px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  animation: slideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  flex-direction: column;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.result-header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.result-title {
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.result-title.win {
  color: #2ecc71;
  text-shadow: 0 0 15px rgba(46, 204, 113, 0.4);
}
.result-title.lose {
  color: #e74c3c;
  text-shadow: 0 0 15px rgba(231, 76, 60, 0.4);
}
.result-title.draw {
  color: #3498db;
  text-shadow: 0 0 15px rgba(52, 152, 219, 0.4);
} /* Azul para empate */

.tie-message {
  color: #bdc3c7;
  font-size: 0.95rem;
  margin-bottom: 10px;
  font-style: italic;
}

.game-score {
  background: rgba(0, 0, 0, 0.2);
  padding: 10px 20px;
  border-radius: 8px;
  margin-top: 10px;
}

.score-line {
  display: flex;
  justify-content: space-between;
  font-size: 1.1rem;
  margin: 4px 0;
}
.score-line .label {
  color: #bdc3c7;
}
.score-line .value {
  font-weight: bold;
  color: #fff;
}

.match-score {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 24px;
  text-align: center;
}

.match-title {
  color: #bdc3c7;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
}

.marks-display {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.marks-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.marks-divider {
  font-size: 1.2rem;
  color: #7f8c8d;
  font-weight: bold;
}

.marks-label {
  font-size: 0.8rem;
  color: #bdc3c7;
  margin-bottom: 4px;
}
.marks-count {
  font-size: 2rem;
  font-weight: 900;
  color: #f1c40f;
  line-height: 1;
}

.match-over {
  text-align: center;
  margin-bottom: 20px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.final-result.win {
  color: #f1c40f;
}
.final-result.lose {
  color: #95a5a6;
}

.final-message {
  color: #ecf0f1;
  margin-top: 5px;
}

/* Botões */
.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
}

.btn-primary,
.btn-secondary {
  padding: 16px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.2s;
  text-transform: uppercase;
  width: 100%;
}

.btn-primary {
  background: linear-gradient(to right, #27ae60, #2ecc71);
  color: white;
  box-shadow: 0 4px 0 #219150;
}
.btn-primary:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 #219150;
}

.btn-secondary {
  background: transparent;
  border: 2px solid #c0392b;
  color: #e74c3c;
}
.btn-secondary:hover {
  background: rgba(231, 76, 60, 0.1);
}

/* Estado de Espera */
.awaiting-opponent {
  text-align: center;
  padding: 30px 10px;
  animation: pulse 2s infinite;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255, 255, 255, 0.1);
  border-top-color: #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

.awaiting-text {
  font-size: 1.2rem;
  color: #ecf0f1; /* CORRIGIDO: Agora é claro */
  font-weight: 600;
  margin-bottom: 5px;
}

.awaiting-subtext {
  font-size: 0.9rem;
  color: #95a5a6;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes pulse {
  0% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.8;
  }
}
</style>
