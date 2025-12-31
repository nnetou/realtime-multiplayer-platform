import { defineStore } from 'pinia'
import { inject, ref, watch } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './gameStore'
import { toast } from 'vue-sonner'
import { useRouter } from 'vue-router'

export const useSocketStore = defineStore('socket', () => {
    const socket = inject('socket')
    const authStore = useAuthStore()
    const gameStore = useGameStore()
    const router = useRouter()
    const joined = ref(false)

    const emitJoin = (user) => {
        if (joined.value) return
        console.log(`[Socket] Joining Server`)
        socket.emit('join', user)
        joined.value = true
    }
    watch(
        () => authStore.currentUser,
        (newUser) => {
            // Se um novo utilizador for definido (após login ou refresh)
            // E o socket estiver conectado, emite o 'join'
            if (newUser && socket.connected) {
                emitJoin(newUser);
            }
        },
        { immediate: true } // 'immediate' tenta executar na primeira vez
    )

    const emitSyncInitialState = (gameState) => {
        console.log('[Socket] Emitting game:sync_initial_state');
        socket.emit('game:sync_initial_state', gameState);
    };

    const emitGetGames = () => {
        socket.emit('get-games')
    }

    const emitLeave = () => {
        socket.emit('leave')
        console.log(`[Socket] Leaving Server`)
        joined.value = false
    }
    const emitPlayMove = (data) => {
        // data = { gameId, card }
        console.log(`[Socket] Emitting game:move for game ${data.gameId}`);
        socket.emit('game:move', data);
    };

    const emitCreateGame = (playMode, biscaType) => {
        console.log('[Socket] Emitting create-game', playMode, biscaType)
        socket.emit('create-game', playMode, biscaType)
    }

    const emitJoinGame = (gameId) => {
        console.log(`[Socket] Emitting join-game for game ${gameId}`)
        socket.emit('join-game', { gameId })
    }

    const emitCancelGame = (gameId) => {
        console.log(`[Socket] Emitting game:cancel for game ${gameId}`);
        socket.emit('game:cancel', { gameId });
    };

    const emitDeclareEnd = (gameId) => {
        console.log(`[Socket] Emitting game:declare_end for game ${gameId}`);
        socket.emit('game:declare_end', { gameId });
    };

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
        emitJoin,
        emitLeave,
        emitCreateGame,
        emitJoinGame,
        handleConnection,
        emitGetGames,
        handleGameEvents,
        emitCancelGame,
        emitDeclareEnd,
        emitPlayMove,
        emitSyncInitialState,
    }
})