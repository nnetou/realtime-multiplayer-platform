import { Server } from "socket.io";
import axios from "axios";

const LARAVEL_API = "http://localhost:8000/api";
const PORT = 3000;
const games = [];

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = { '2': { value: 0, order: 1 }, '3': { value: 10, order: 10 }, '4': { value: 0, order: 2 }, '5': { value: 0, order: 3 }, '6': { value: 0, order: 4 }, '7': { value: 10, order: 9 }, 'Q': { value: 2, order: 5 }, 'J': { value: 3, order: 6 }, 'K': { value: 4, order: 7 }, 'A': { value: 11, order: 8 } };

function createDeck() {
    let deck = [];
    SUITS.forEach(suit => {
        Object.keys(RANKS).forEach(key => {
            deck.push({
                suit: suit,
                rank: { name: key, ...RANKS[key] },
                imageUrl: `http://localhost:8000/images/cartas/playing-cards-master/${suit}_${key}.png`,
                code: `${key}-${suit}`
            });
        });
    });
    return deck.sort(() => Math.random() - 0.5);
}

function getWinningCard(c1, c2, trunfoSuit) {
    const isC1Trunfo = c1.suit === trunfoSuit;
    const isC2Trunfo = c2.suit === trunfoSuit;
    if (!isC1Trunfo && isC2Trunfo) return c2;
    if (isC1Trunfo && !isC2Trunfo) return c1;
    if (c1.suit === c2.suit) {
        const val1 = (c1.rank.value || 0) * 100 + (c1.rank.order || 0);
        const val2 = (c2.rank.value || 0) * 100 + (c2.rank.order || 0);
        return val1 > val2 ? c1 : c2;
    }
    return c1;
}

// === TRANSAÇÃO DE DINHEIRO ===
async function processGameEnd(io, game, winnerSocketId, reason) {
    if (!game || game.status === 'Ended') return;

    game.status = 'Ended';

    const isCreatorWinner = (String(winnerSocketId) === String(game.creatorId));
    const winnerUserId = isCreatorWinner ? game.creatorUserId : game.player2UserId;
    const loserUserId = isCreatorWinner ? game.player2UserId : game.creatorUserId;

    if (winnerUserId && loserUserId && game.betAmount > 0) {
        try {
            console.log(`💰 A liquidar aposta de ${game.betAmount}...`);
            await axios.post(`${LARAVEL_API}/game/settle`, {
                winner_id: winnerUserId,
                loser_id: loserUserId,
                amount: game.betAmount,
                game_type: game.gameType,
                p1_score: isCreatorWinner ? 120 : 0,
                p2_score: isCreatorWinner ? 0 : 120,
                reason: reason
            });
            console.log("✅ Saldo atualizado no Laravel.");
        } catch (error) {
            console.error("❌ ERRO NO LARAVEL:", error.message);
        }
    }

    io.to(game.id).emit("game:ended", {
        winner: { id: winnerSocketId },
        reason: reason,
        betAmount: game.betAmount,
        finalState: { gameFinished: true }
    });

    setTimeout(() => {
        const idx = games.indexOf(game);
        if (idx !== -1) games.splice(idx, 1);
    }, 5000);
}

export function serverStart(port = PORT) {
    const io = new Server(port, { cors: { origin: "*", methods: ["GET", "POST"] } });
    console.log(`🚀 SERVER NA PORTA ${port}`);

    io.on("connection", (socket) => {

        socket.on("create-game", async (data) => {
            try {
                if (!data.authToken) {
                    throw new Error("Authentication token is missing.");
                }
                if (data.playMode === 'single_game') {
                    await axios.post(`${LARAVEL_API}/games/create-multiplayer`, {
                        player1_user_id: data.player1Id,
                        bet_amount: data.betAmount,
                        game_type: data.gameType,
                        play_mode: data.playMode
                    }, {
                        headers: {
                            'Authorization': `Bearer ${data.authToken}`
                        }
                    });
                }

                const gameId = String(Date.now());
                // GARANTIR QUE LÊ A APOSTA
                const betAmount = (data.betAmount >= 0) ? data.betAmount : 0;
                const newGame = {
                    id: gameId,
                    creatorId: socket.id,
                    creatorUserId: data.player1Id, // ID DO LARAVEL
                    creatorName: data.playerName || "Jogador",
                    player2: null,
                    player2UserId: null,
                    status: 'Pending',
                    playMode: data.playMode || 'match',
                    gameType: data.gameType || 3,
                    betAmount: betAmount,
                    state: null
                };

                games.push(newGame);
                socket.join(gameId);
                io.emit("games", games.filter(g => g.status === 'Pending'));
                socket.emit("game-created", newGame);

            } catch (error) {
                console.error("❌ ERRO AO CRIAR JOGO NO LARAVEL:", error.response ? error.response.data : error.message);

            }
        });

        socket.on("join-game", (data) => {
            const game = games.find(g => String(g.id) === String(data.gameId));
            if (game && !game.player2 && game.status === 'Pending') {
                game.player2 = socket.id;
                game.player2UserId = data.userId; // ID DO LARAVEL
                game.status = 'Playing';

                const fullDeck = createDeck();
                const p1Hand = fullDeck.splice(0, 3);
                const p2Hand = fullDeck.splice(0, 3);
                const trunfo = fullDeck[0];

                game.state = {
                    deck: fullDeck, trunfo: trunfo, trunfoSuit: trunfo.suit,
                    p1Hand: p1Hand, p2Hand: p2Hand, table: [],
                    p1Score: 0, p2Score: 0, trickStarter: game.creatorId
                };

                socket.join(game.id);
                console.log(`[Jogo Iniciado] Aposta: ${game.betAmount}`);

                io.to(game.creatorId).emit("game:started", {
                    id: game.id, playMode: 'match', isMyTurn: true,
                    myHand: p1Hand, trunfo: trunfo, deckCount: game.state.deck.length,
                    betAmount: game.betAmount
                });

                io.to(game.player2).emit("game:started", {
                    id: game.id, playMode: 'match', isMyTurn: false,
                    myHand: p2Hand, trunfo: trunfo, deckCount: game.state.deck.length,
                    betAmount: game.betAmount
                });

                io.emit("games", games.filter(g => g.status === 'waiting'));
            }
        });

        socket.on("play-card", (data) => {
            const gameId = String(data.gameId);
            const game = games.find(g => String(g.id) === gameId);
            if (!game || !game.state) return;

            socket.to(gameId).emit("game:opponent_move", { card: data.card });
            game.state.table.push({ player: socket.id, card: data.card });

            if (game.state.table.length === 2) {
                const p1 = game.state.table[0];
                const p2 = game.state.table[1];
                const winningCard = getWinningCard(p1.card, p2.card, game.state.trunfoSuit);
                const winnerId = (winningCard.code === p1.card.code) ? p1.player : p2.player;
                const points = (p1.card.rank.value || 0) + (p2.card.rank.value || 0);

                if (winnerId === game.creatorId) game.state.p1Score += points;
                else game.state.p2Score += points;
                game.state.table = [];

                setTimeout(() => {
                    io.to(gameId).emit("trick-result", { winnerId, pointsInTrick: points, p1Score: game.state.p1Score, p2Score: game.state.p2Score, nextTurn: winnerId });

                    if (game.state.deck.length > 0) {
                        const c1 = game.state.deck.pop();
                        const c2 = game.state.deck.pop();
                        const loserId = (winnerId === game.creatorId) ? game.player2 : game.creatorId;
                        if (c1) { io.to(winnerId).emit("deal-card", { card: c1, deckCount: game.state.deck.length }); io.to(loserId).emit("opponent-drew", { deckCount: game.state.deck.length }); }
                        if (c2) { io.to(loserId).emit("deal-card", { card: c2, deckCount: game.state.deck.length }); io.to(winnerId).emit("opponent-drew", { deckCount: game.state.deck.length }); }
                    }

                    if ((game.state.p1Score + game.state.p2Score) === 120) {
                        const w = (game.state.p1Score > game.state.p2Score) ? game.creatorId : game.player2;
                        processGameEnd(io, game, w, 'points');
                    }
                }, 1500);
            }
        });

        socket.on("game:forfeit", (data) => {
            const game = games.find(g => String(g.id) === String(data.gameId));
            if (game && game.status === 'Playing') {
                const winnerId = (socket.id === game.creatorId) ? game.player2 : game.creatorId;
                processGameEnd(io, game, winnerId, 'forfeit');
            }
        });

        socket.on("disconnect", () => {
            const game = games.find(g => (g.creatorId === socket.id || g.player2 === socket.id));
            if (game && game.status === 'Playing') {
                const winnerId = (socket.id === game.creatorId) ? game.player2 : game.creatorId;
                processGameEnd(io, game, winnerId, 'disconnect');
            } else if (game && game.status === 'Pending' && game.creatorId === socket.id) {
                games.splice(games.indexOf(game), 1);
                io.emit("games", games.filter(g => g.status === 'Pending'));
            }
        });

        socket.on("get-games", () => { socket.emit("games", games.filter(g => g.status === 'Pending')); });
    });
}