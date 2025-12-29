import { defineStore } from 'pinia'
import { inject, ref } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './gameStore'
import { useRouter } from 'vue-router'

export const useSocketStore = defineStore('socket', () => {
    const socket = inject('socket')
    const authStore = useAuthStore()
    const gameStore = useGameStore()
    const router = useRouter()
    const joined = ref(false)

    const handleConnection = () => {
        socket.on('connect', () => {
            console.log(`[Socket] Conectado: ${socket.id}`)
            if (authStore.isLoggedIn && !joined.value) {
                socket.emit('join', authStore.currentUser)
                joined.value = true
            }
        })
    }

    const emitGetGames = () => socket.emit('get-games')
    const emitJoinGame = (game) => socket.emit('join-game', game)

    const emitPlayCard = (gameId, card) => {
        const cleanCard = JSON.parse(JSON.stringify(card));
        socket.emit('play-card', { gameId: String(gameId), card: cleanCard });
    }

    const handleGameEvents = () => {
        socket.on('games', (games) => gameStore.setGames(games))

        socket.on('match-ready', (payload) => {
            gameStore.setupMultiplayerMatch({
                hand: payload.myHand,
                trunfo: payload.trunfo,
                deckCount: payload.deckCount,
                myTurn: payload.turn,
                gameId: payload.id,
                socket: socket
            });
            router.push({ name: "mp-full-match" });
        })

        socket.on('opponent-played', (card) => {
            gameStore.onOpponentMove(card);
        })

        socket.on('deal-card', (data) => {
            gameStore.addCardToHand(data.card, data.deckCount);
        })

        socket.on('opponent-drew', (data) => {
            gameStore.opponentDrewCard(data.deckCount);
        })

        socket.on('deck-empty', () => {
            gameStore.gameState.trunfo = null;
            gameStore.gameState.deck = [];
        })

        socket.on('trick-result', (data) => {
            gameStore.handleServerTrickResult(data, socket.id);
        })

        socket.on('game-ended', (result) => {
            gameStore.handleGameEnd(result, socket.id);
        })
    }

    return {
        handleConnection,
        handleGameEvents,
        emitGetGames,
        emitJoinGame,
        emitPlayCard
    }
})