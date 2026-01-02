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

    // --- 1. AÇÕES (EMITS) ---

    const emitJoin = (user) => {
        if (joined.value) return
        console.log(`[Socket] Joining Server`)
        socket.emit('join', user)
        joined.value = true
    }

    const emitLeave = () => {
        socket.emit('leave')
        console.log(`[Socket] Leaving Server`)
        joined.value = false
    }

    const emitSyncInitialState = (gameState) => {
        console.log('[Socket] Emitting game:sync_initial_state');
        socket.emit('game:sync_initial_state', gameState);
    };

    const emitGetGames = () => {
        socket.emit('get-games')
    }

    const emitPlayMove = (data) => {
        // data = { gameId, card }
        console.log(`[Socket] Emitting game:move for game ${data.gameId}`);
        socket.emit('game:move', data);
    };

    const emitCreateGame = (gameData) => {
        console.log('[Socket] Emitting create-game', gameData);
        socket.emit('create-game', gameData);
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

    // --- 2. GESTÃO DE CONEXÃO E WATCHERS ---

    // Observa mudanças no utilizador (Login/Logout)
    watch(
        () => authStore.currentUser,
        (newUser) => {
            if (newUser && socket.connected && !joined.value) {
                emitJoin(newUser);
            }
        },
        { immediate: true }
    )

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

    // --- 3. EVENTOS DE JOGO (LISTENERS) ---

    const handleGameEvents = () => {
        // Lista de Salas
        socket.on('games', (games) => {
            console.log(`[Socket] server emited games | game count ${games.length}`)
            gameStore.setGames(games)
        })

        // Inicialização
        socket.on('game:initialize', (gameData) => {
            console.log('[Socket] Received game:initialize. Generating and sharing state...');
            gameStore.generateAndShareInitialState(gameData);
        })

        // Jogo Começou
        socket.on('game:started', (serverState) => {
            console.log('[Socket] Received game:started')
            gameStore.updateStateFromServer(serverState)
            if (serverState.playMode === 'single_game')
                router.push({ name: 'multiplayer-quick-game' }) // Verifica se esta rota existe
            else
                router.push({ name: 'multiplayer-full-match' }) // Verifica se esta rota existe no teu router
        })

        // Atualização de Estado
        socket.on('game:state_update', (serverState) => {
            gameStore.updateStateFromServer(serverState);
        });

        // Movimento do Oponente
        socket.on('game:opponent_move', (data) => {
            console.log('[Socket] Received opponent move:', data.card);
            gameStore.handleOpponentMove(data.card);
        });

        // Erros de Jogo
        socket.on('game:error', (errorMessage) => {
            toast.error(errorMessage);
            // Liberta o bloqueio da UI se houver erro
            if (gameStore.gameState) gameStore.gameState.isProcessingMove = false;
        });

        // Fim de Jogo (Versão Server-Side State)
        socket.on('game:ended', (data) => {
            console.log('[Socket] Received game:ended from server', data);
            
            // Verifica se data.winner existe para evitar erro
            const winnerName = data.winner?.nickname || "Desconhecido";
            toast.success(`Game Over! Winner: ${winnerName}`);
            
            if(data.finalState) {
                gameStore.updateStateFromServer(data.finalState);
            }

            if (gameStore.gameState) {
                gameStore.gameState.gameFinished = true;
                gameStore.gameState.winner = data.winner;
            }

            // Gravar na BD (se necessário)
            gameStore.saveGame();
        });
        
        // Listener extra que tinhas no código (verifica se ainda é usado pelo servidor)
        socket.on('game-ended', (result) => {
             // Se o servidor envia 'game-ended' (kebab-case) em vez de 'game:ended', mantém este.
             // Se não, podes apagar.
             gameStore.handleGameEnd(result, socket.id);
        })
    }

    return {
        // Estado
        joined,
        // Actions
        emitJoin,
        emitLeave,
        emitCreateGame,
        emitJoinGame,
        emitGetGames,
        emitCancelGame,
        emitDeclareEnd,
        emitPlayMove,
        emitSyncInitialState,
        // Handlers
        handleConnection,
        handleGameEvents,
    }
})