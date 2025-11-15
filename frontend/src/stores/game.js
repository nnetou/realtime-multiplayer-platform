import { defineStore } from 'pinia'
import { ref } from 'vue'
export const useGameStore = defineStore('game', () => {
    const difficulties = [
        { value: 'easy', label: 'Easy', description: '4x2 grid' },
        { value: 'medium', label: 'Medium', description: '4x3 grid' },
        { value: 'hard', label: 'Hard', description: '4x4 grid' },
    ]
    const difficulty = ref('medium')
    return {
        difficulties,
        difficulty,
    }
})

//neste caso foi para aplicar dificuldades no jogo singleplayer, vai ser usado, eventualmente, para outras funcionalidades