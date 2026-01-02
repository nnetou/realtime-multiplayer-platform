import { defineStore } from 'pinia'
import { inject, ref, watch } from 'vue'
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

        socket.on('game:initialize', (gameData) => {
            console.log('[Socket] Received game:initialize. Generating and sharing state...');
            // Delega a tarefa de gerar e partilhar para a gameStore
            gameStore.generateAndShareInitialState(gameData);
        })

        socket.on('game:started', (serverState) => {
            console.log('[Socket] Received game:started')
            gameStore.updateStateFromServer(serverState)
            if (serverState.playMode === 'single_game')
                router.push({ name: 'multiplayer-quick-game' })
            else
                router.push({ name: 'multiplayer-full-match' })
        })

        socket.on('game:state_update', (serverState) => {
            gameStore.updateStateFromServer(serverState);
        });
        socket.on('game:opponent_move', (data) => {
            console.log('[Socket] Received opponent move:', data.card);
            // Diz à gameStore para processar a jogada do oponente
            gameStore.handleOpponentMove(data.card);
        });

        socket.on('game:error', (errorMessage) => {
            toast.error(errorMessage);
            // Se o erro foi numa jogada, precisamos de libertar o bloqueio
            gameStore.gameState.isProcessingMove = false;
        });

        socket.on('game:ended', (data) => {
            console.log('[Socket] Received game:ended from server', data);
            toast.success(`Game Over! Winner: ${data.winner.nickname}`);
            // Aqui você pode atualizar a gameStore com o resultado final,
            // ou simplesmente redirecionar para o lobby.
            gameStore.updateStateFromServer(data.finalState); // Supondo que o servidor envia o estado final

            gameStore.gameState.gameFinished = true;
            gameStore.gameState.winner = data.winner; // Guarda o vencedor

            // 3. CHAMA A AÇÃO PARA GUARDAR NA BASE DE DADOS
            gameStore.saveGame();
        });

        //Ver se é necessário e como funciona
        //     socket.on('game-change', (game) => {
        //     gameStore.setMultiplayerGame(game)
        // })

        // ... outros eventos como 'game:finished', 'player:joined', etc.
    }

    return {
        handleConnection,
        handleGameEvents,
        emitGetGames,
        emitJoinGame,
        emitPlayCard
    }
})