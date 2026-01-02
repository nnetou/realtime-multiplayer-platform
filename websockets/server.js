import { Server } from "socket.io";

const games = [];

// === LÓGICA INTERNA (Para não depender de ficheiros externos) ===
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = {
    '2': { value: 0, label: '2', order: 1 },
    '3': { value: 10, label: '3', order: 10 }, // Ordem alta na bisca
    '4': { value: 0, label: '4', order: 2 },
    '5': { value: 0, label: '5', order: 3 },
    '6': { value: 0, label: '6', order: 4 },
    '7': { value: 10, label: '7', order: 9 }, // Bisca
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
    // c1 é sempre a carta de quem abriu a vaza
    const isC1Trunfo = c1.suit === trunfoSuit;
    const isC2Trunfo = c2.suit === trunfoSuit;

    // 1. Trunfos
    if (!isC1Trunfo && isC2Trunfo) return c2; // Corte
    if (isC1Trunfo && !isC2Trunfo) return c1; 
    
    // 2. Mesmo naipe (ganha a maior ordem)
    if (c1.suit === c2.suit) {
        // Na bisca: 2,4,5,6,Q,J,K,7,A,3 (Ordem definida no objeto RANKS acima)
        // Se as ordens não estiverem perfeitas, usa-se o valor como desempate principal
        const val1 = (c1.rank.value || 0) * 100 + (c1.rank.order || 0);
        const val2 = (c2.rank.value || 0) * 100 + (c2.rank.order || 0);
        return val1 > val2 ? c1 : c2;
    }

    // 3. Naipes diferentes (não trunfo) -> quem abriu ganha
    return c1;
}

export function serverStart(port) {
    const io = new Server(port, { cors: { origin: "*", methods: ["GET", "POST"] } });

    console.log(`🚀 SERVER AUTÓNOMO (SEM ERROS DE IMPORT) NA PORTA ${port}`);

    io.on("connection", (socket) => {
        
        socket.on("create-game", (data) => {
            const gameId = String(Date.now());
            const creatorName = data?.playerName || "Jogador " + socket.id.substring(0, 3);
            const newGame = {
                id: gameId,
                creatorId: socket.id,
                creatorName: creatorName,
                player1Name: creatorName,
                player2: null,
                status: 'waiting'
            };
            games.push(newGame);
            socket.join(gameId);
            io.emit("games", games);
            socket.emit("game-created", newGame);
        });

        socket.on("join-game", (gameToJoin) => {
            const targetId = String(gameToJoin.id);
            const game = games.find(g => String(g.id) === targetId);
            
            if (game && !game.player2) {
                game.player2 = socket.id;
                game.status = 'ready';

                // --- INICIALIZAÇÃO ROBUSTA ---
                const fullDeck = createDeck(); // 40 cartas
                
                const p1Hand = fullDeck.splice(0, 3);
                const p2Hand = fullDeck.splice(0, 3);
                
                // Trunfo é a carta do fundo (índice 0). 
                // NÃO a tiramos do array para manter o total de 34 cartas no monte.
                const trunfo = fullDeck[0]; 

                game.state = {
                    deck: fullDeck, // Array com 34 cartas
                    trunfo: trunfo,
                    trunfoSuit: trunfo.suit,
                    p1Hand: p1Hand, p2Hand: p2Hand,    
                    table: [], 
                    p1Score: 0, p2Score: 0,
                    trickStarter: game.creatorId 
                };

                socket.join(targetId);

                // Envia estado inicial
                io.to(game.creatorId).emit("match-ready", {
                    id: game.id, myHand: p1Hand, trunfo: trunfo, 
                    deckCount: game.state.deck.length, turn: true
                });

                io.to(game.player2).emit("match-ready", {
                    id: game.id, myHand: p2Hand, trunfo: trunfo, 
                    deckCount: game.state.deck.length, turn: false
                });

                io.emit("games", games);
            }
        });

        socket.on("play-card", (data) => {
            const gameId = String(data.gameId);
            const game = games.find(g => String(g.id) === gameId);
            if (!game) return;

            // 1. Mostra a carta ao oponente
            socket.to(gameId).emit("opponent-played", data.card);

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

                // DELAY DE 2 SEGUNDOS para limpeza
                setTimeout(() => {
                    // Envia ordem de limpeza e resultado
                    io.to(gameId).emit("trick-result", {
                        winnerId: winnerId,
                        pointsInTrick: points,
                        p1Score: game.state.p1Score,
                        p2Score: game.state.p2Score,
                        nextTurn: winnerId // O vencedor joga a seguir
                    });

                    // DISTRIBUIÇÃO DE CARTAS (DRAW)
                    if (game.state.deck.length > 0) {
                        // Tira do topo (fim do array)
                        const cardWinner = game.state.deck.pop();
                        const cardLoser = game.state.deck.pop(); 
                        
                        const loserId = (winnerId === game.creatorId) ? game.player2 : game.creatorId;
                        const deckCount = game.state.deck.length;

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
                        const getMP = (s) => s===120?4 : s>90?2 : s>60?1 : 0;
                        const finalResult = {
                            winnerId: (s1 > s2) ? game.creatorId : game.player2,
                            p1Score: s1, p2Score: s2,
                            p1MatchPoints: getMP(s1), p2MatchPoints: getMP(s2)
                        };
                        io.to(gameId).emit("game-ended", finalResult);
                    }
                }, 2000);
            }
        });

        socket.on("get-games", () => { socket.emit("games", games); });
    });
<<<<<<< HEAD
=======

>>>>>>> 3ed15e8115e62fc13e3332237615f70191ee2a32
}