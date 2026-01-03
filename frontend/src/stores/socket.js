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

    const emitJoin = (user) => { if(!joined.value){ socket.emit('join', user); joined.value = true; } }
    const emitCreateGame = (gameData) => { socket.emit('create-game', gameData); }
    const emitPlayMove = (data) => { socket.emit('play-card', data); };
    const emitCancelGame = (gameId) => { socket.emit('game:cancel', { gameId }); };
    const emitForfeitGame = (gameId) => { socket.emit('game:forfeit', { gameId }); }
    const emitGetGames = () => { socket.emit('get-games') }

    // CORREÇÃO CRÍTICA: Enviar o ID para o Laravel saber quem é o Player 2
    const emitJoinGame = (gameId) => { 
        socket.emit('join-game', { 
            gameId: gameId, 
            userId: authStore.user?.id 
        }) 
    }

    const handleConnection = () => {
        socket.on('connect', () => { if(authStore.isLoggedIn) emitJoin(authStore.currentUser) });
        socket.on('disconnect', () => { joined.value = false });
    }

    const handleGameEvents = () => {
        socket.off('games'); socket.off('game:started'); socket.off('game:opponent_move');
        socket.off('trick-result'); socket.off('deal-card'); socket.off('opponent-drew');
        socket.off('game:ended'); socket.off('game:cancelled');

        socket.on('game:cancelled', () => {
             toast.info("A sala foi cancelada.");
             router.push({ name: 'lobby' });
        });

        socket.on('games', (games) => { useGameStore().setGames(games) });

        socket.on('game:started', (serverState) => {
            const gameStore = useGameStore();
            // GARANTE QUE A APOSTA É GUARDADA NA STORE
            if(serverState.betAmount !== undefined) {
                gameStore.gameState.betAmount = serverState.betAmount;
                if(!gameStore.multiplayerGame) gameStore.multiplayerGame = {};
                gameStore.multiplayerGame.betAmount = serverState.betAmount;
                gameStore.multiplayerGame.id = serverState.id;
            }
            gameStore.updateStateFromServer(serverState);
            router.push({ name: 'multiplayer-full-match' });
        });

        socket.on('game:opponent_move', (data) => { useGameStore().handleOpponentMove(data.card); });
        socket.on('trick-result', (data) => { useGameStore().handleServerTrickResult(data, socket.id); });
        socket.on('deal-card', (data) => { useGameStore().addCardToHand(data.card, data.deckCount); });
        socket.on('opponent-drew', (data) => { useGameStore().opponentDrewCard(data.deckCount); });

        // --- FIM DE JOGO E REDIRECIONAMENTO ---
        socket.on('game:ended', (data) => {
            const gameStore = useGameStore();
            let msg = (data.winner.id === socket.id) ? "Vitória!" : "Derrota.";
            if(data.reason === 'forfeit') msg = (data.winner.id === socket.id) ? "Oponente desistiu! Ganhaste!" : "Desististe.";
            else if(data.reason === 'disconnect') msg = "Oponente saiu. Vitória!";
            
            (data.winner.id === socket.id) ? toast.success(msg) : toast.error(msg);
            
            gameStore.gameState.gameFinished = true;
            if(data.finalState) gameStore.updateStateFromServer(data.finalState);

            // Atualiza saldo visualmente
            if(data.betAmount > 0) {
                 if(data.winner.id === socket.id) authStore.user.coins_balance += Number(data.betAmount);
                 else authStore.user.coins_balance -= Number(data.betAmount);
            }

            console.log("A redirecionar em 3s...");
            setTimeout(() => {
                gameStore.$reset();
                // REDIRECIONA PARA A HOMEPAGE
                router.push({ name: 'home' }).catch(err => { window.location.href = "/"; });
            }, 3000);
        });
    }

    return { joined, emitJoin, emitJoinGame, emitCreateGame, emitPlayMove, emitCancelGame, emitForfeitGame, emitGetGames, handleConnection, handleGameEvents }
})