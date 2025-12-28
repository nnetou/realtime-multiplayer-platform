import { addUser, removeUser, getUserCount, getUser } from "../state/connection.js"
import { getGames, interruptGame } from "../state/game.js";

export const handleConnectionEvents = (io, socket) => {
    socket.on("join", (user) => {
        if (!user) {
            console.error(`[Connection] Received a 'join' event with a null user for socket ${socket.id}. Ignoring.`);
            return;
        }
        addUser(socket.id, user)

        console.log(`[Connection] User ${user.name ? user.name : user.nickname} has joined the server`)
        console.log(`[Connection] ${getUserCount()} users online`)
        socket.user = user;
        console.log(`[Connection] Associated user ${socket.user.name} with socket ${socket.id}`);
        socket.join(`user-${user.id}`);
        console.log(`[Connection] Socket ${socket.id} joined room 'user-${user.id}'`);
    })

    socket.on("leave", () => {
        const user = removeUser(socket.id)
        console.log(`[Connection] User ${user.name} has left the server`)
        console.log(`[Connection] ${getUserCount()} users online`)
    })

    socket.on("disconnect", () => {
        const user = getUser(socket.id);
        if (user) {
            // 2. VERIFICA SE O JOGADOR ESTAVA NUM JOGO ATIVO
            const activeGame = getGames().find(g => g.status === 'Playing' && (g.player1.id === user.id || g.player2?.id === user.id));

            if (activeGame) {
                // Interrompe o jogo e notifica o outro jogador
                interruptGame(activeGame.id);
                io.to(`game-${activeGame.id}`).emit('game:interrupted', { message: `${user.nickname} has disconnected.` });
                // Atualiza a lista de jogos para todos
                io.emit('games', getGames());
            }
        }
        removeUser(socket.id);
        console.log(`[Connection] User disconnected. ${getUserCount()} users online.`);
    });
}