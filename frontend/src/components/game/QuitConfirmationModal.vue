<template>
  <div v-if="show" class="modal-overlay" @click.self="handleCancel">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">⚠️ Desistir da Partida?</h2>
      </div>
      
      <div class="modal-body">
        <p class="warning-text">
          Tens a certeza que queres desistir?
        </p>
        <p class="consequence-text">
          Ao desistir perdes a partida e <strong>{{ betAmount }} moedas</strong>.
        </p>
      </div>

      <div class="modal-actions">
        <button @click="handleConfirm" class="btn-danger">
          Sim, Desistir
        </button>
        <button @click="handleCancel" class="btn-safe">
          Não, Continuar Jogando
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  show: { type: Boolean, default: false },
  betAmount: { type: Number, default: 0 }
});

const emit = defineEmits(['confirm', 'cancel']);

const handleConfirm = () => {
  emit('confirm');
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: linear-gradient(135deg, #ecf0f1 0%, #bdc3c7 100%);
  border-radius: 16px;
  padding: 32px;
  max-width: 450px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(149, 165, 166, 0.4);
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  text-align: center;
  margin-bottom: 24px;
}

.modal-title {
  font-size: 1.6rem;
  font-weight: 600;
  color: #34495e;
}

.modal-body {
  margin-bottom: 28px;
  text-align: center;
}

.warning-text {
  font-size: 1.1rem;
  color: #2c3e50;
  margin-bottom: 12px;
  font-weight: 500;
}

.consequence-text {
  font-size: 1rem;
  color: #7f8c8d;
  line-height: 1.6;
}

.consequence-text strong {
  color: #e67e22;
  font-weight: bold;
  font-size: 1.05rem;
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-danger,
.btn-safe {
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

.btn-danger {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
}

.btn-danger:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(231, 76, 60, 0.4);
  background: linear-gradient(135deg, #cb4335 0%, #a93226 100%);
}

.btn-safe {
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
}

.btn-safe:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(52, 152, 219, 0.4);
}
</style>
