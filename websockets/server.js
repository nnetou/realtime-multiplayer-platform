import { Server } from "socket.io";

const games = [];

// === LÓGICA INTERNA (INTACTA) ===
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = {
    '2': { value: 0, label: '2', order: 1 },
    '3': { value: 10, label: '3', order: 10 },
    '4': { value: 0, label: '4', order: 2 },
    '5': { value: 0, label: '5', order: 3 },
    '6': { value: 0, label: '6', order: 4 },
    '7': { value: 10, label: '7', order: 9 },
    'Q': { value: 2, label: 'Q', order: 5 },
    'J': { value: 3, label: 'J', order: 6 },
    'K': { value: 4, label: 'K', order: 7 },
    'A': { value: 11, label: 'A', order: 8 }
};

// Cria baralho e baralha
function createDeck() {
    let deck = [];
    SUITS.forEach(suit => {
        Object.keys(RANKS).forEach(key => {
            const rankData = RANKS[key];
            const API_URL = "http://localhost:8000";
            const imgUrl = `${API_URL}/images/cartas/playing-cards-master/${suit}_${rankData.label}.png`;

            deck.push({
                suit: suit,
                rank: { name: key, ...rankData },
                imageUrl: imgUrl,
                code: `${key}-${suit}`
            });
        });
    });
    // Shuffle
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

export function serverStart(port) {
    const io = new Server(port, { cors: { origin: "*", methods: ["GET", "POST"] } });

    console.log(`🚀 SERVER AUTÓNOMO (SEM ERROS DE IMPORT) NA PORTA ${port}`);

    io.on("connection", (socket) => {

        // --- CREATE GAME ---
        socket.on("create-game", (data) => {
            const gameId = String(Date.now());
            // Garante que apanha o nome do jogador ou usa um default
            const creatorName = data?.playerName || "Jogador " + socket.id.substring(0, 3);

            const newGame = {
                id: gameId,
                creatorId: socket.id,
                creatorName: creatorName,
                player1Id: data?.player1Id || socket.id,
                player1Name: creatorName,
                player2: null,
                status: 'waiting'
            };
            games.push(newGame);
            socket.join(gameId);
            io.emit("games", games);
            socket.emit("game-created", newGame);
        });

        // --- JOIN GAME (CORRIGIDO) ---
        socket.on("join-game", (data) => {
            // Aceita { gameId: "..." } ou o objeto do jogo { id: "..." }
            const targetId = String(data.gameId || data.id);
            const game = games.find(g => String(g.id) === targetId);

            if (game && !game.player2) {
                game.player2 = socket.id;
                game.status = 'playing'; // Alterado para playing para sair do lobby

                // Inicialização do Jogo
                const fullDeck = createDeck();
                const p1Hand = fullDeck.splice(0, 3);
                const p2Hand = fullDeck.splice(0, 3);
                const trunfo = fullDeck[0];

                game.state = {
                    deck: fullDeck,
                    trunfo: trunfo,
                    trunfoSuit: trunfo.suit,
                    p1Hand: p1Hand, p2Hand: p2Hand,
                    table: [],
                    p1Score: 0, p2Score: 0,
                    trickStarter: game.creatorId
                };

                socket.join(targetId);

                console.log(`[Server] Game ${targetId} starting!`);

                // 1. AVISAR PLAYER 1 (CRIADOR)
                io.to(game.creatorId).emit("game:started", {
                    id: game.id,
                    playMode: 'match',
                    myHand: p1Hand,
                    trunfo: trunfo,
                    trunfoSuit: trunfo.suit,
                    deckCount: game.state.deck.length,
                    isMyTurn: true, // Turno inicial
                    opponent: 'Player 2'
                });

                // 2. AVISAR PLAYER 2 (QUEM ENTROU)
                io.to(game.player2).emit("game:started", {
                    id: game.id,
                    playMode: 'match',
                    myHand: p2Hand,
                    trunfo: trunfo,
                    trunfoSuit: trunfo.suit,
                    deckCount: game.state.deck.length,
                    isMyTurn: false,
                    opponent: game.creatorName
                });

                // Atualiza o lobby (remove a sala cheia)
                io.emit("games", games.filter(g => g.status === 'waiting'));
            }
        });

        // --- PLAY CARD ---
        socket.on("play-card", (data) => {
            const gameId = String(data.gameId);
            const game = games.find(g => String(g.id) === gameId);
            if (!game) return;

            console.log(`[Server] Card played in game ${gameId}:`, data.card.rank.name);

            // 1. Mostra a carta ao oponente (Evento renomeado para consistência)
            socket.to(gameId).emit("game:opponent_move", { card: data.card });

            // 2. Guarda na mesa
            game.state.table.push({ player: socket.id, card: data.card });

            // 3. Se a vaza acabou (2 cartas)
            if (game.state.table.length === 2) {
                const p1 = game.state.table[0]; // Quem abriu
                const p2 = game.state.table[1]; // Quem respondeu

                const winningCard = getWinningCard(p1.card, p2.card, game.state.trunfoSuit);

                // Determina ID do vencedor
                const winnerId = (winningCard.code === p1.card.code) ? p1.player : p2.player;
                const points = (p1.card.rank.value || 0) + (p2.card.rank.value || 0);

                if (winnerId === game.creatorId) game.state.p1Score += points;
                else game.state.p2Score += points;

                game.state.trickStarter = winnerId;
                game.state.table = [];

                console.log(`🏆 Vaza: ${winnerId} ganha ${points}pts.`);

                // Delay para ver quem ganhou
                setTimeout(() => {
                    // Envia resultado da vaza
                    io.to(gameId).emit("trick-result", {
                        winnerId: winnerId,
                        pointsInTrick: points,
                        p1Score: game.state.p1Score,
                        p2Score: game.state.p2Score,
                        nextTurn: winnerId
                    });

                    // DISTRIBUIÇÃO DE CARTAS (DRAW)
                    if (game.state.deck.length > 0) {
                        const cardWinner = game.state.deck.pop();
                        const cardLoser = game.state.deck.pop(); // Pode ser o trunfo

                        const loserId = (winnerId === game.creatorId) ? game.player2 : game.creatorId;
                        const deckCount = game.state.deck.length;

                        // Envia cartas novas
                        if (cardWinner) {
                            io.to(winnerId).emit("deal-card", { card: cardWinner, deckCount });
                            io.to(loserId).emit("opponent-drew", { deckCount });
                        }
                        if (cardLoser) {
                            io.to(loserId).emit("deal-card", { card: cardLoser, deckCount });
                            io.to(winnerId).emit("opponent-drew", { deckCount });
                        }

                        if (game.state.deck.length === 0) {
                            io.to(gameId).emit("deck-empty");
                        }
                    }

                    // FIM DE JOGO
                    if ((game.state.p1Score + game.state.p2Score) === 120) {
                        const s1 = game.state.p1Score; const s2 = game.state.p2Score;
                        const getMP = (s) => s === 120 ? 4 : s > 90 ? 2 : s > 60 ? 1 : 0;
                        const winnerSocketId = (s1 > s2) ? game.creatorId : game.player2;

                        const finalResult = {
                            winner: { id: winnerSocketId, nickname: "Vencedor" },
                            p1Score: s1, p2Score: s2,
                            finalState: { myScore: s1, opponentScore: s2 } // Para o updateState
                        };
                        io.to(gameId).emit("game:ended", finalResult);
                    }
                }, 2000);
            }
        });

        socket.on("get-games", () => { socket.emit("games", games.filter(g => g.status === 'waiting')); });
    });
}