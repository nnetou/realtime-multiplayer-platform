import { getUser } from "../state/connection.js"
import { createGame, getGames, getGame, joinGame, endGame, deleteGame } from "../state/game.js"

export const handleGameEvents = (io, socket) => {
    socket.on("create-game", (playMode, biscaType) => {
        const user = getUser(socket.id)
        if (!user) {
            console.error(`[Game] Error: Unauthenticated user with socket ${socket.id} tried to create a game.`);
            socket.emit('game:error', 'Authentication error. Please reconnect.');
            return;
        }
        const game = createGame(playMode, biscaType, user)
        socket.join(`game-${game.id}`)
        console.log(`[Game] ${user.name} created a new game - ID: ${game.id}`)
        io.emit("games", getGames())
    })

    socket.on('join-game', (data) => {
        const user = getUser(socket.id);
        if (!user) {
            return socket.emit('game:error', 'Authentication error.');
        }
        console.log(`[Game] ${user.nickname} is attempting to join game ${data.gameId}`);

        const game = joinGame(data.gameId, user);

        if (game) {
            console.log(`[Game] ${user.nickname} joined game ${game.id}`);
            // Adiciona o P2 à sala do jogo
            socket.join(`game-${game.id}`);
            // Encontra o socket do P1 (o criador)
            const player1Room = `user-${game.player1.id}`;
            console.log(`[Game] Requesting P1 (in room ${player1Room}) to initialize game ${game.id}`);
            // Envia o evento diretamente para a sala do P1.
            io.to(player1Room).emit('game:initialize', game);
            // Atualiza a lista de jogos para todos no lobby (o jogo já não está disponível)
            io.emit('games', getGames());
        } else {
            socket.emit('game:error', 'Could not join game. It might be full or no longer available.');
        }
    });
    socket.on('game:sync_initial_state', (initialState) => {
        // FASE 2: O servidor atua como "carteiro"
        console.log(`[Game] Received initial state for game ${initialState.id}. Broadcasting 'game:started'.`);

        // Retransmite o estado completo para todos na sala (P1 e P2) como o evento oficial de início
        io.to(`game-${initialState.id}`).emit('game:started', initialState);
    });
    socket.on("get-games", () => {
        io.emit("games", getGames())
    })

    socket.on("game:cancel", (data) => {
        const user = getUser(socket.id);
        const gameIdAsNumber = parseInt(data.gameId, 10);
        const game = getGame(gameIdAsNumber);
        // Só o criador pode cancelar um jogo pendente
        if (user && game && game.status === 'Pending' && game.player1.id == user.id) {
            const wasDeleted = deleteGame(game.id);

            if (wasDeleted) {
                // Se o jogo foi apagado com sucesso, notifica todos os clientes
                // para atualizarem as suas listas de jogos.
                io.emit('games', getGames());
            }
        }
    });


    socket.on('game:move', (data) => {
        const user = getUser(socket.id);
        if (!user || !data || !data.gameId || !data.card) {
            return socket.emit('game:error', 'Invalid move data.');
        }
        // O servidor não valida a jogada. Apenas a retransmite.
        // O evento é enviado para todos na sala, exceto para quem o enviou.
        console.log(`[Game] User ${user.nickname} played a card in game ${data.gameId}. Relaying to opponent.`);
        socket.to(`game-${data.gameId}`).emit('game:opponent_move', { card: data.card });
    });

    // 2. O cliente envia o estado atualizado do jogo. O servidor retransmite.
    // Útil para sincronizar pontuações, etc.
    socket.on('game:sync_state', (data) => {
        socket.to(`game-${data.gameId}`).emit('game:state_update', data.gameState);
    });

    // 3. Um cliente declara que o jogo terminou. O servidor confia e informa o outro jogador.
    socket.on('game:declare_end', (data) => {
        const user = getUser(socket.id);
        const game = getGame(data.gameId);
        if (!user || !game) return;

        // O servidor não calcula o vencedor. Ele confia no que o cliente enviou.
        const winner = data.winner;

        // Atualiza o status do jogo no servidor para 'Ended'
        const finalState = endGame(game.id, winner);

        if (finalState) {
            // Notifica todos na sala sobre o resultado final que o cliente enviou
            io.to(`game-${game.id}`).emit('game:ended', { winner, finalState });
            // Atualiza a lista de jogos para todos no lobby
            io.emit('games', getGames());
        }
    });
}

// Função auxiliar para encontrar o socket de um jogador
// function findSocketByUserId(io, userId) {
//     for (const socket of io.of("/").sockets.values()) {
//         if (socket.user && socket.user.id === userId) {
//             return socket;
//         }
//     }
//     return null;
// }