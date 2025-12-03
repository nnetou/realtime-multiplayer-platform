<template>
  <div 
    class="game-card" 
    :class="{ 'clickable': isMyTurn, 'disabled': !isMyTurn }"
    @click="handleClick"
    :style="{ width: width + 'px', height: height + 'px' }"
  >
    <img :src="card.imageUrl" alt="Card" />
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  card: Object,
  isMyTurn: Boolean,
  width: { type: Number, default: 95 },
  height: { type: Number, default: 135 }
});

const emit = defineEmits(['play-card']);

function handleClick() {
  if (props.isMyTurn) {
    emit('play-card', props.card);
  }
}
</script>

<style scoped>
.game-card img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
  border-radius: 5px;
}
.clickable { cursor: pointer; transition: transform 0.1s; }
.clickable:hover { transform: translateY(-10px); }
.disabled { filter: brightness(0.9); }
</style>