import { defineStore } from 'pinia'
import { inject, ref } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './gameStore'

export const useSocketStore = defineStore('socket', () => {
    const socket = inject('socket')
    const authStore = useAuthStore()
    const gameStore = useGameStore()
    const joined = ref(false)
    const emitJoin = (user) => {
        if (joined.value) return
        console.log(`[Socket] Joining Server`)
        socket.emit('join', user)
        joined.value = true
    }

    const emitGetGames = () => {
        socket.emit('get-games')
    }

    const emitLeave = () => {
        socket.emit('leave')
        console.log(`[Socket] Leaving Server`)
        joined.value = false
    }
    const handleConnection = () => {
        socket.on('connect', () => {
            console.log(`[Socket] Connected -- ${socket.id}`)
            if (authStore.isLoggedIn && !joined.value) {
                emitJoin(authStore.currentUser)
            }
        })
        socket.on('disconnect', () => {
            joined.value = false
            console.log(`[Socket] Disconnected -- ${socket.id}`)
        })
    }

    const handleGameEvents = () => {
        socket.on('games', (games) => {
            console.log(`[Socket] server emited games | game count ${games.length}`)
            gameStore.setGames(games) // Import and instantiate the game store
        })
    }
    return {
        emitJoin,
        emitLeave,
        handleConnection,
        emitGetGames,
        handleGameEvents,
    }
})