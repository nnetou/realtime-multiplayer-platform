import { defineStore } from 'pinia'
import { inject, ref, watch } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './gameStore' // Importa, mas NÃO EXECUTA AINDA
import { toast } from 'vue-sonner'
import { useRouter } from 'vue-router'

export const useSocketStore = defineStore('socket', () => {
    const socket = inject('socket')
    const authStore = useAuthStore()
    const router = useRouter()
    const joined = ref(false)

    // --- AÇÕES ---
    const emitJoin = (user) => {
        if (joined.value) return
        socket.emit('join', user)
        joined.value = true
    }

    const emitLeave = () => { socket.emit('leave'); joined.value = false; }
    const emitGetGames = () => { socket.emit('get-games') }

    const emitJoinGame = (gameId) => {
        console.log(`[Socket] A entrar no jogo ${gameId}...`)
        socket.emit('join-game', { gameId: gameId })
    }

    const emitCreateGame = (gameData) => {
        socket.emit('create-game', gameData);
    }

    const emitPlayMove = (data) => {
        socket.emit('play-card', data);
    };

    const emitCancelGame = (gameId) => { socket.emit('game:cancel', { gameId }); };

    // --- CONNECTION ---
    const handleConnection = () => {
        socket.on('connect', () => {
            if (authStore.isLoggedIn && !joined.value) emitJoin(authStore.currentUser)
        })
        socket.on('disconnect', () => { joined.value = false })
    }

    // --- EVENTOS DO JOGO ---
    const handleGameEvents = () => {

        // 1. LIMPEZA DE LISTENERS ANTIGOS (Isto resolve o problema de desaparecerem 2 cartas)
        socket.off('games');
        socket.off('game:started');
        socket.off('game:opponent_move');
        socket.off('trick-result');
        socket.off('deal-card');
        socket.off('opponent-drew');
        socket.off('game:ended');

        // 2. DEFINIÇÃO DOS NOVOS LISTENERS
        socket.on('games', (games) => {
            console.log(`[Socket] server emited games | game count ${games.length}`)
            const gameStore = useGameStore();
            gameStore.setGames(games)
        })

        socket.on('game:started', (serverState) => {
            console.log('[Socket] Jogo começou!', serverState);
            const gameStore = useGameStore();
            gameStore.updateStateFromServer(serverState);

            if (serverState.playMode === 'single_game')
                router.push({ name: 'multiplayer-quick-game' })
            else
                router.push({ name: 'multiplayer-full-match' })
        })

        socket.on('game:opponent_move', (data) => {
            const gameStore = useGameStore();
            gameStore.handleOpponentMove(data.card);
        });

        socket.on('trick-result', (data) => {
            const gameStore = useGameStore();
            if (gameStore.handleServerTrickResult) {
                gameStore.handleServerTrickResult(data, socket.id);
            }
        });

        socket.on('deal-card', (data) => {
            const gameStore = useGameStore();
            if (gameStore.addCardToHand) {
                gameStore.addCardToHand(data.card, data.deckCount);
            }
        });

        socket.on('opponent-drew', (data) => {
            const gameStore = useGameStore();
            if (gameStore.opponentDrewCard) {
                gameStore.opponentDrewCard(data.deckCount);
            }
        });

        socket.on('game:ended', (data) => {
            toast.success(`Fim de jogo!`);
            const gameStore = useGameStore();

            if (data.finalState) gameStore.updateStateFromServer(data.finalState);
            if (data.winner) {
                gameStore.gameState.winner = data.winner;
                gameStore.gameState.gameFinished = true;
            }
            gameStore.saveGame();
        });
    }

    return {
        joined, emitJoin, emitLeave, emitCreateGame, emitJoinGame, emitGetGames,
        emitCancelGame, emitPlayMove, handleConnection, handleGameEvents
    }
})