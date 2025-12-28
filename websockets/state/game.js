const games = new Map()
let currentGameID = 0
export const createGame = (playMode, biscaType, user) => {
    currentGameID++
    const game = {
        id: currentGameID,
        playMode,
        biscaType,
        player1: user,
        player2: null,
        status: 'Pending'
    }
    games.set(currentGameID, game)
    return game
}

export const getGame = (gameId) => {
    return games.get(gameId);
}

export const getGames = () => {
    return Array.from(games.values());
}

export const joinGame = (gameId, user) => {
    const game = getGame(gameId);
    if (game && game.status === 'Pending' && game.player1.id !== user.id) {
        game.player2 = user;
        game.status = 'Playing'; // MUDANÇA DE ESTADO: 'Pending' -> 'Playing'
        games.set(gameId, game);
        console.log(`[State] Game ${game.id} status changed to 'Playing'.`);
        return game;
    }
    return null; // Retorna null se não for possível entrar no jogo
}


// Função para terminar um jogo normalmente
export const endGame = (gameId, winner) => {
    const game = getGame(gameId);
    if (game) {
        game.status = 'Ended'; // MUDANÇA DE ESTADO: 'Playing' -> 'Ended'
        game.winner = winner;
        games.set(gameId, game);
        console.log(`[State] Game ${game.id} status changed to 'Ended'.`);
        return game;
    }
    return null;
}

// Função para interromper um jogo (ex: por desconexão)
export const interruptGame = (gameId) => {
    const game = getGame(gameId);
    if (game && game.status === 'Playing') {
        game.status = 'Interrupted'; // MUDANÇA DE ESTADO: 'Playing' -> 'Interrupted'
        games.set(gameId, game);
        console.log(`[State] Game ${game.id} status changed to 'Interrupted'.`);
        return game;
    }
    return null;
}

//Só para apagar do lobby
export const deleteGame = (gameId) => {
    const game = getGame(gameId);
    if (game && game.status === 'Pending') {
        const wasDeleted = games.delete(gameId);
        if (wasDeleted) {
            console.log(`[State] Game ${gameId} was deleted successfully.`);
        }
        return wasDeleted;
    }
    console.log(`[State] deleteGame failed for game ${gameId}. Current status: ${game?.status}`);
    return false;
}