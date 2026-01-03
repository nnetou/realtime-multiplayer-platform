import { Server } from "socket.io";
import axios from "axios";

const LARAVEL_API = "http://localhost:8000/api";
const PORT = 3000;
const games = [];

const gameRoomState = {}; 

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = { 
    '2': { value: 0, order: 1 }, 
    '3': { value: 0, order: 2 }, 
    '4': { value: 0, order: 3 }, 
    '5': { value: 0, order: 4 }, 
    '6': { value: 0, order: 5 }, 
    '7': { value: 10, order: 10 }, 
    'Q': { value: 2, order: 6 },   
    'J': { value: 3, order: 7 },   
    'K': { value: 4, order: 8 },   
    'A': { value: 11, order: 9 }   
};

function createDeck() {
    let deck = [];
    SUITS.forEach(suit => {
        Object.keys(RANKS).forEach(key => {
            // --- CORREÇÃO: URL DA IMAGEM ---
            const imgUrl = `http://localhost:8000/images/cartas/playing-cards-master/${suit}_${key}.png`;

            deck.push({
                suit: suit,
                rank: { name: key, ...RANKS[key] },
                imageUrl: imgUrl, // <--- IMPORTANTE
                code: `${key}-${suit}`
            });
        });
    });
    return deck.sort(() => Math.random() - 0.5);
}

function getWinningCard(c1, c2, trunfoSuit) {
    const s1 = c1.suit;
    const s2 = c2.suit;
    const isC1Trunfo = s1 === trunfoSuit;
    const isC2Trunfo = s2 === trunfoSuit;

    if (!isC1Trunfo && isC2Trunfo) return c2;
    if (isC1Trunfo && !isC2Trunfo) return c1;

    if (s1 === s2) {
        const o1 = RANKS[c1.rank.name]?.order || 0;
        const o2 = RANKS[c2.rank.name]?.order || 0;
        return o1 > o2 ? c1 : c2;
    }
    return c1;
}

function calculateMatchPoints(winnerScore, loserScore, reason) {
    if (reason === 'forfeit' || reason === 'disconnect') return 4;
    if (winnerScore === 120) return 4; 
    if (loserScore < 30) return 2;     
    return 1;
}

function initializeRoomState(gameId) {
    if (!gameRoomState[gameId]) gameRoomState[gameId] = { readyPlayers: new Set() };
}

function prepareNextRound(game) {
    const fullDeck = createDeck();
    const p1Hand = fullDeck.splice(0, 3);
    const p2Hand = fullDeck.splice(0, 3);
    const trunfo = fullDeck[0];

    game.state = {
        deck: fullDeck, trunfo, trunfoSuit: trunfo.suit,
        p1Hand, p2Hand, table: [],
        p1Score: 0, p2Score: 0, trickStarter: game.creatorId
    };
    return { id: game.id, trunfo, deckCount: fullDeck.length };
}

async function processGameEnd(io, game, winnerSocketId, reason, pointsAwarded = 1) {
    if (!game || game.status === 'Ended') return;

    const isCreatorWinner = (String(winnerSocketId) === String(game.creatorId));
    const winnerUserId = isCreatorWinner ? game.creatorUserId : game.player2UserId;
    const loserUserId = isCreatorWinner ? game.player2UserId : game.creatorUserId;

    const p1Score = game.state?.p1Score || 0;
    const p2Score = game.state?.p2Score || 0;

    const isDefinitiveEnd = (reason === 'forfeit' || reason === 'disconnect' || game.playMode === 'single_game');

    if (isDefinitiveEnd) {
        game.status = 'Ended';
        try {
            if (game.databaseId) await axios.patch(`${LARAVEL_API}/games/${game.databaseId}/status`, { status: 'Ended' });
            
            if (winnerUserId && loserUserId && game.betAmount > 0) {
                await axios.post(`${LARAVEL_API}/game/settle`, {
                    winner_id: winnerUserId,
                    loser_id: loserUserId,
                    amount: game.betAmount,
                    game_type: game.gameType,
                    p1_score: p1Score,
                    p2_score: p2Score,
                    reason: reason
                });
                console.log("✅ Saldo liquidado.");
            }
        } catch (error) { console.error("❌ Erro Laravel:", error.message); }
    } else {
        game.status = 'Intermission';
    }

    io.to(game.id).emit("game:ended", {
        winner: { id: winnerSocketId }, 
        reason: reason,
        betAmount: game.betAmount,
        matchPointsReceived: pointsAwarded,
        scores: { p1Score, p2Score },
        finalState: { gameFinished: true }
    });

    if (isDefinitiveEnd) {
        setTimeout(() => {
            const idx = games.indexOf(game);
            if (idx !== -1) games.splice(idx, 1);
        }, 5000);
    }
}

export function serverStart(port = PORT) {
    const io = new Server(port, { cors: { origin: "*", methods: ["GET", "POST"] } });
    console.log(`🚀 SERVER NA PORTA ${port}`);

    io.on("connection", (socket) => {

        socket.on("create-game", async (data) => {
            const gameId = String(Date.now());
            let dbId = null;
            try {
                if (data.authToken) {
                    const endpoint = data.playMode === 'match' ? '/matches' : '/games/create-multiplayer';
                    const res = await axios.post(`${LARAVEL_API}${endpoint}`, {
                        player1_user_id: data.player1Id,
                        bet_amount: data.betAmount,
                        game_type: String(data.gameType || 3),
                        status: 'Pending',
                        play_mode: data.playMode
                    }, { headers: { 'Authorization': `Bearer ${data.authToken}` } });
                    dbId = res.data.id;
                }
            } catch (error) { console.error("❌ Erro Laravel:", error.message); } 

            const newGame = {
                id: gameId, databaseId: dbId,
                creatorId: socket.id, creatorUserId: data.player1Id, creatorName: data.playerName,
                player2: null, player2UserId: null,
                status: 'Pending', playMode: data.playMode || 'match',
                gameType: data.gameType || 3, betAmount: data.betAmount || 0,
                state: null
            };
            games.push(newGame);
            socket.join(gameId);
            io.emit("games", games.filter(g => g.status === 'Pending'));
            socket.emit("game-created", newGame);
        });

        socket.on("join-game", async (data) => {
            const game = games.find(g => String(g.id) === String(data.gameId));
            if (game && !game.player2) {
                game.player2 = socket.id;
                game.player2UserId = data.userId;
                game.status = 'Playing';

                try {
                    if (game.databaseId && data.authToken) {
                        const endpoint = game.playMode === 'match' ? `/matches/${game.databaseId}` : `/games/${game.databaseId}/status`;
                        await axios.patch(`${LARAVEL_API}${endpoint}`, {
                            player2_user_id: data.userId, status: 'Playing'
                        }, { headers: { 'Authorization': `Bearer ${data.authToken}` } });
                    }
                } catch (error) { console.error("❌ Erro Laravel:", error.message); }

                const fullDeck = createDeck();
                const p1Hand = fullDeck.splice(0, 3);
                const p2Hand = fullDeck.splice(0, 3);
                const trunfo = fullDeck[0];

                game.state = {
                    deck: fullDeck, trunfo, trunfoSuit: trunfo.suit,
                    p1Hand, p2Hand, table: [],
                    p1Score: 0, p2Score: 0, trickStarter: game.creatorId
                };

                socket.join(game.id);
                
                io.to(game.creatorId).emit("game:started", {
                    id: game.id, playMode: game.playMode, isMyTurn: true,
                    myHand: p1Hand, trunfo, deckCount: fullDeck.length, betAmount: game.betAmount
                });
                io.to(game.player2).emit("game:started", {
                    id: game.id, playMode: game.playMode, isMyTurn: false,
                    myHand: p2Hand, trunfo, deckCount: fullDeck.length, betAmount: game.betAmount
                });
                io.emit("games", games.filter(g => g.status === 'Pending'));
            }
        });

        socket.on("cancel-game", async (data) => {
            const gameId = String(data.gameId);
            const gameIndex = games.findIndex(g => String(g.id) === gameId);
            
            console.log(`🔍 Cancel request for ${gameId}, authToken: ${data.authToken ? 'present' : 'MISSING'}`);
            
            if (gameIndex === -1) {
                console.log(`⚠️ Tentativa de cancelar sala inexistente: ${gameId}`);
                return;
            }
            
            const game = games[gameIndex];
            
            // Só o criador pode cancelar e apenas se ainda estiver Pending
            if (game.creatorId !== socket.id) {
                console.log(`⚠️ Apenas o criador pode cancelar a sala`);
                return;
            }
            
            if (game.status !== 'Pending') {
                console.log(`⚠️ Não é possível cancelar sala em estado ${game.status}`);
                return;
            }
            
            // Update status in database (usar databaseId e endpoint correto)
            try {
                if (game.playMode === 'match' && game.databaseId) {
                    // Atualizar Match
                    console.log(`🔄 Atualizando Match ${game.databaseId} para 'Interrupted'...`);
                    const response = await axios.patch(`${LARAVEL_API}/matches/${game.databaseId}`, {
                        status: 'Interrupted'
                    }, {
                        headers: {
                            'Authorization': `Bearer ${data.authToken || ''}`
                        }
                    });
                    console.log(`✅ [${game.id}] Match ${game.databaseId} atualizado para 'Interrupted' na BD`, response.data);
                } else if (game.playMode === 'single_game' && game.databaseId) {
                    // Atualizar Game
                    console.log(`🔄 Atualizando Game ${game.databaseId} para 'Interrupted'...`);
                    const response = await axios.patch(`${LARAVEL_API}/games/${game.databaseId}/status`, {
                        status: 'Interrupted'
                    });
                    console.log(`✅ [${game.id}] Game ${game.databaseId} atualizado para 'Interrupted' na BD`, response.data);
                } else {
                    console.log(`⚠️ Sem databaseId para atualizar. playMode: ${game.playMode}, databaseId: ${game.databaseId}`);
                }
            } catch (error) {
                console.error(`❌ Erro ao atualizar status para 'Interrupted':`, error.response?.data || error.message);
            }
            
            // Remover sala da lista
            games.splice(gameIndex, 1);
            
            // Notificar todos os clientes que a sala foi cancelada
            io.emit("games", games.filter(g => g.status === 'Pending'));
            socket.emit("game-cancelled", { gameId: gameId });
            
            console.log(`🗑️ [${gameId}] Sala cancelada pelo criador`);
        });

        socket.on("play-card", (data) => {
            const game = games.find(g => String(g.id) === String(data.gameId));
            if (!game || !game.state) return;

            socket.to(game.id).emit("game:opponent_move", { card: data.card });
            game.state.table.push({ player: socket.id, card: data.card });

            if (game.state.table.length === 2) {
                const p1 = game.state.table[0];
                const p2 = game.state.table[1];

                const winningCard = getWinningCard(p1.card, p2.card, game.state.trunfoSuit);
                const winnerId = (winningCard.code === p1.card.code) ? p1.player : p2.player;
                
                const v1 = RANKS[p1.card.rank.name]?.value || 0;
                const v2 = RANKS[p2.card.rank.name]?.value || 0;
                const points = v1 + v2;

                if (winnerId === game.creatorId) game.state.p1Score += points;
                else game.state.p2Score += points;

                game.state.table = [];

                setTimeout(() => {
                    io.to(game.id).emit("trick-result", { 
                        winnerId, pointsInTrick: points, 
                        p1Score: game.state.p1Score, p2Score: game.state.p2Score, nextTurn: winnerId 
                    });

                    if (game.state.deck.length > 0) {
                        const c1 = game.state.deck.pop();
                        const c2 = game.state.deck.pop();
                        const loserId = (winnerId === game.creatorId) ? game.player2 : game.creatorId;
                        if(c1) { io.to(winnerId).emit("deal-card", {card:c1, deckCount:game.state.deck.length}); io.to(loserId).emit("opponent-drew", {deckCount:game.state.deck.length}); }
                        if(c2) { io.to(loserId).emit("deal-card", {card:c2, deckCount:game.state.deck.length}); io.to(winnerId).emit("opponent-drew", {deckCount:game.state.deck.length}); }
                    }

                    if ((game.state.p1Score + game.state.p2Score) >= 120) {
                        const isP1Winner = (game.state.p1Score > game.state.p2Score);
                        const w = isP1Winner ? game.creatorId : game.player2;
                        const wScore = isP1Winner ? game.state.p1Score : game.state.p2Score;
                        const lScore = isP1Winner ? game.state.p2Score : game.state.p1Score;
                        
                        const matchPoints = calculateMatchPoints(wScore, lScore, 'points');
                        console.log(`🎯 Fim: ${wScore}-${lScore} (Pts: ${matchPoints})`);
                        
                        processGameEnd(io, game, w, 'points', matchPoints);
                    }
                }, 1500);
            }
        });

        socket.on("game:forfeit", (data) => {
            const game = games.find(g => String(g.id) === String(data.gameId));
            if (game && game.status === 'Playing') {
                const isCreatorForfeit = (socket.id === game.creatorId);
                const winnerId = isCreatorForfeit ? game.player2 : game.creatorId;
                processGameEnd(io, game, winnerId, 'forfeit', 4);
            }
        });

        socket.on("player_ready_next", (data) => {
            const game = games.find(g => String(g.id) === String(data.gameId));
            if (!game) return;

            initializeRoomState(game.id);
            gameRoomState[game.id].readyPlayers.add(socket.id);

            if (gameRoomState[game.id].readyPlayers.size === 2) {
                const roundInfo = prepareNextRound(game);
                game.status = 'Playing';
                gameRoomState[game.id].readyPlayers.clear();

                io.to(game.creatorId).emit("start_next_round", { gameState: { myHand: game.state.p1Hand, trunfo: roundInfo.trunfo, deckCount: roundInfo.deckCount, myScore:0, opponentScore:0, isMyTurn:true } });
                io.to(game.player2).emit("start_next_round", { gameState: { myHand: game.state.p2Hand, trunfo: roundInfo.trunfo, deckCount: roundInfo.deckCount, myScore:0, opponentScore:0, isMyTurn:false } });
            }
        });

        socket.on("disconnect", () => { /* ... */ });
        socket.on("get-games", () => { socket.emit("games", games.filter(g => g.status === 'Pending')); });
    });
}