import { defineStore } from 'pinia'
import { inject, ref } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './gameStore'
import { toast } from 'vue-sonner'
import { useRouter } from 'vue-router'

export const useSocketStore = defineStore('socket', () => {
    const socket = inject('socket')
    const authStore = useAuthStore()
    const router = useRouter()
    const joined = ref(false)

    const emitJoin = (user) => { if (!joined.value) { socket.emit('join', user); joined.value = true; } }
    const emitCreateGame = (gameData) => { socket.emit('create-game', gameData); }
    const emitPlayMove = (data) => { socket.emit('play-card', data); };
    const emitCancelGame = (gameId) => { socket.emit('cancel-game', { gameId, authToken: authStore.token }); };
    const emitForfeitGame = (gameId) => { socket.emit('game:forfeit', { gameId }); }
    const emitGetGames = () => { socket.emit('get-games') }

    const emitJoinGame = (gameId) => {
        socket.emit('join-game', {
            gameId: gameId,
            userId: authStore.user?.id,
            authToken: authStore.token
        })
    }

    const handleConnection = () => {
        socket.on('connect', () => { if (authStore.isLoggedIn) emitJoin(authStore.currentUser) });
        socket.on('disconnect', () => { joined.value = false });
    }

    const handleGameEvents = () => {
        socket.off('games'); socket.off('game:started'); socket.off('game:opponent_move');
        socket.off('trick-result'); socket.off('deal-card'); socket.off('opponent-drew');
        socket.off('game:ended'); socket.off('game-cancelled'); socket.off('error');

        socket.on('error', (data) => {
            toast.error(data.message || 'Ocorreu um erro');
        });

        socket.on('game-cancelled', () => {
            toast.info("A sala foi cancelada.");
            router.push({ name: 'lobby' });
        });

        socket.on('games', (games) => { useGameStore().setGames(games) });

        socket.on('game:started', (serverState) => {
            const gameStore = useGameStore();
            if (serverState.betAmount !== undefined) {
                gameStore.gameState.betAmount = serverState.betAmount;
                if (!gameStore.multiplayerGame) gameStore.multiplayerGame = {};
                gameStore.multiplayerGame.betAmount = serverState.betAmount;
                gameStore.multiplayerGame.id = serverState.id;
            }
            gameStore.amIPlayer1 = (serverState.isMyTurn === true);
            console.log('🎮 game:started - amIPlayer1 definido como:', gameStore.amIPlayer1, 'isMyTurn:', serverState.isMyTurn);
            gameStore.updateStateFromServer(serverState);
            router.push({ name: 'multiplayer-full-match' });
        });

        socket.on('game:opponent_move', (data) => { useGameStore().handleOpponentMove(data.card); });
        socket.on('trick-result', (data) => { useGameStore().handleServerTrickResult(data, socket.id); });
        socket.on('deal-card', (data) => { useGameStore().addCardToHand(data.card, data.deckCount); });
        socket.on('opponent-drew', (data) => { useGameStore().opponentDrewCard(data.deckCount); });
    }

    return { joined, emitJoin, emitJoinGame, emitCreateGame, emitPlayMove, emitCancelGame, emitForfeitGame, emitGetGames, handleConnection, handleGameEvents }
})