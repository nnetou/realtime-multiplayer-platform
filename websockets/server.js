import { Server } from "socket.io";
import axios from "axios";

const LARAVEL_API = "http://localhost:8000/api";
const PORT = 3000;
const games = [];

// ========================================
// ESTRUTURA DE DADOS DE SINCRONIZAÇÃO
// ========================================
const gameRoomState = {}; // { [gameId]: { readyPlayers: Set(), roundState: {...} } }

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

// ========================================
// CALCULAR PONTOS DE PARTIDA (MARCAS)
// ========================================
/**
 * Calcula quantos pontos de partida (marcas) o vencedor recebe
 * @param {number} winnerScore - Pontuação do vencedor
 * @param {number} loserScore - Pontuação do perdedor
 * @param {string} reason - Razão do fim (points, forfeit, disconnect)
 * @returns {number} - 1, 2 ou 4 pontos de partida
 */
function calculateMatchPoints(winnerScore, loserScore, reason) {
    // Desistência ou Desconexão = 4 pontos (vitória automática)
    if (reason === 'forfeit' || reason === 'disconnect') {
        return 4;
    }
    
    // Capote (120-0) = 4 pontos (vitória automática)
    if (winnerScore === 120 && loserScore === 0) {
        return 4;
    }
    
    // Rolha (perdedor < 30 pontos) = 2 pontos
    if (loserScore < 30) {
        return 2;
    }
    
    // Vitória normal (> 60 pontos) = 1 ponto
    return 1;
}

// ========================================
// INICIALIZAR SALA PARA PRÓXIMO JOGO
// ========================================
function initializeRoomState(gameId) {
    if (!gameRoomState[gameId]) {
        gameRoomState[gameId] = {
            readyPlayers: new Set(),
            roundState: null
        };
    }
}

// ========================================
// RESETAR PRONTO PARA NOVA RODADA
// ========================================
function resetRoundReady(gameId) {
    if (gameRoomState[gameId]) {
        gameRoomState[gameId].readyPlayers.clear();
    }
}

// ========================================
// GERAR NOVO BARALHO E DISTRIBUIR
// ========================================
function prepareNextRound(game) {
    if (!game || !game.state) return null;

    const fullDeck = createDeck();
    const p1Hand = fullDeck.splice(0, 3);
    const p2Hand = fullDeck.splice(0, 3);
    const trunfo = fullDeck[0];

    // Reset dos pontos PARCIAIS do jogo (mantém as marcas da partida)
    game.state.deck = fullDeck;
    game.state.trunfo = trunfo;
    game.state.trunfoSuit = trunfo.suit;
    game.state.p1Hand = p1Hand;
    game.state.p2Hand = p2Hand;
    game.state.table = [];
    game.state.p1Score = 0;  // Reset dos pontos parciais
    game.state.p2Score = 0;
    game.state.trickStarter = game.creatorId;

    return {
        id: game.id,
        trunfo: trunfo,
        deckCount: game.state.deck.length
    };
}

// === TRANSAÇÃO DE DINHEIRO ===
async function processGameEnd(io, game, winnerSocketId, reason, pointsAwarded = 1) {
    if (!game || game.status === 'Ended') return;

    const isCreatorWinner = (String(winnerSocketId) === String(game.creatorId));
    const winnerUserId = isCreatorWinner ? game.creatorUserId : game.player2UserId;
    const loserUserId = isCreatorWinner ? game.player2UserId : game.creatorUserId;

    // Determinar scores finais
    const p1Score = game.state?.p1Score || 0;
    const p2Score = game.state?.p2Score || 0;

    // Apenas liquidar aposta se for fim definitivo (forfeit, disconnect ou single_game)
    const isDefinitiveEnd = (reason === 'forfeit' || reason === 'disconnect' || game.playMode === 'single_game');

    if (isDefinitiveEnd) {
        game.status = 'Ended';

        // Update status in database
        try {
            await axios.patch(`${LARAVEL_API}/games/${game.id}/status`, {
                status: 'Ended'
            });
            console.log(`✅ [${game.id}] Status atualizado para 'Ended' na BD`);
        } catch (error) {
            console.error(`❌ Erro ao atualizar status para 'Ended':`, error.message);
        }

        if (winnerUserId && loserUserId && game.betAmount > 0) {
            try {
                console.log(`💰 A liquidar aposta de ${game.betAmount}...`);
                await axios.post(`${LARAVEL_API}/game/settle`, {
                    winner_id: winnerUserId,
                    loser_id: loserUserId,
                    amount: game.betAmount,
                    game_type: game.gameType,
                    p1_score: p1Score,
                    p2_score: p2Score,
                    reason: reason
                });
                console.log("✅ Saldo atualizado no Laravel.");
            } catch (error) {
                console.error("❌ ERRO NO LARAVEL:", error.message);
            }
        }
    } else {
        // Modo Match e fim normal (por pontos) → Estado Intermédio
        game.status = 'Intermission';
        console.log(`🔄 [${game.id}] Partida em intermissão (aguardando próximo jogo)`);
    }

    // Emitir evento game_ended (COM UNDERSCORE) para ambos os jogadores
    io.to(game.id).emit("game_ended", {
        winnerId: winnerSocketId,
        winner: isCreatorWinner ? 'player1' : 'player2',
        reason: reason,
        betAmount: game.betAmount,
        matchPointsReceived: pointsAwarded,
        scores: {
            p1Score: p1Score,
            p2Score: p2Score
        },
        finalState: { gameFinished: true }
    });

    // Apenas apagar sala se for fim definitivo
    if (isDefinitiveEnd) {
        setTimeout(() => {
            const idx = games.indexOf(game);
            if (idx !== -1) games.splice(idx, 1);
            console.log(`🗑️ [${game.id}] Sala removida da memória`);
        }, 5000);
    }
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

                // Verificar se o jogador já tem uma sala criada
                const existingGame = games.find(g => 
                    g.creatorUserId === data.player1Id && 
                    (g.status === 'Pending' || g.status === 'Playing')
                );
                
                if (existingGame) {
                    socket.emit("error", { 
                        message: "Já tens uma sala ativa. Cancela-a primeiro para criar uma nova." 
                    });
                    console.log(`⚠️ Utilizador ${data.player1Id} tentou criar sala duplicada`);
                    return;
                }

                // Criar registo na Base de Dados (endpoint diferente conforme o modo)
                let databaseResponse;
                let databaseId;

                if (data.playMode === 'match') {
                    // Partida (Match) - Endpoint: /api/matches
                    databaseResponse = await axios.post(`${LARAVEL_API}/matches`, {
                        player1_user_id: data.player1Id,
                        bet_amount: data.betAmount,
                        game_type: String(data.gameType || 3),
                        status: 'Pending'
                    }, {
                        headers: {
                            'Authorization': `Bearer ${data.authToken}`
                        }
                    });
                    databaseId = databaseResponse.data.id;
                    console.log(`✅ Match criado na BD com ID: ${databaseId}`);
                } else if (data.playMode === 'single_game') {
                    // Jogo Único - Endpoint: /api/games/create-multiplayer
                    databaseResponse = await axios.post(`${LARAVEL_API}/games/create-multiplayer`, {
                        player1_user_id: data.player1Id,
                        bet_amount: data.betAmount,
                        game_type: String(data.gameType || 3),
                        play_mode: data.playMode
                    }, {
                        headers: {
                            'Authorization': `Bearer ${data.authToken}`
                        }
                    });
                    databaseId = databaseResponse.data.id;
                    console.log(`✅ Game criado na BD com ID: ${databaseId}`);
                }

                const gameId = String(Date.now());
                // GARANTIR QUE LÊ A APOSTA
                const betAmount = (data.betAmount >= 0) ? data.betAmount : 0;
                const newGame = {
                    id: gameId,
                    databaseId: databaseId, // ID da tabela Match ou Game
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
                socket.emit("error", { 
                    message: "Erro ao criar sala. Verifica o teu saldo e tenta novamente." 
                });
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

        socket.on("join-game", async (data) => {
            const game = games.find(g => String(g.id) === String(data.gameId));
            if (game && !game.player2 && game.status === 'Pending') {
                game.player2 = socket.id;
                game.player2UserId = data.userId; // ID DO LARAVEL
                game.status = 'Playing';

                // Update match in database with player2 info
                if (game.playMode === 'match' && game.databaseId) {
                    try {
                        await axios.patch(`${LARAVEL_API}/matches/${game.databaseId}`, {
                            player2_user_id: data.userId,
                            status: 'Playing'
                        }, {
                            headers: {
                                'Authorization': `Bearer ${data.authToken || ''}`
                            }
                        });
                        console.log(`✅ [${game.id}] Match ${game.databaseId} atualizado com Player2 e status 'Playing'`);
                    } catch (error) {
                        console.error(`❌ Erro ao atualizar match:`, error.message);
                    }
                }

                // Update status in database (for single_game mode)
                if (game.playMode === 'single_game') {
                    try {
                        await axios.patch(`${LARAVEL_API}/games/${game.id}/status`, {
                            status: 'Playing'
                        });
                        console.log(`✅ [${game.id}] Status atualizado para 'Playing' na BD`);
                    } catch (error) {
                        console.error(`❌ Erro ao atualizar status para 'Playing':`, error.message);
                    }
                }

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
                        const isP1Winner = (game.state.p1Score > game.state.p2Score);
                        const w = isP1Winner ? game.creatorId : game.player2;
                        const winnerScore = isP1Winner ? game.state.p1Score : game.state.p2Score;
                        const loserScore = isP1Winner ? game.state.p2Score : game.state.p1Score;
                        const matchPoints = calculateMatchPoints(winnerScore, loserScore, 'points');
                        console.log(`🎯 Jogo terminou: ${winnerScore}-${loserScore} = ${matchPoints} ponto(s) de partida`);
                        processGameEnd(io, game, w, 'points', matchPoints);
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

        /* ================================================
         * PRÓXIMO JOGO - SINCRONIZAÇÃO
         * ================================================ */
        socket.on("player_ready_next", (data) => {
            const gameId = String(data.gameId);
            const game = games.find(g => String(g.id) === gameId);

            if (!game) {
                console.error(`❌ [player_ready_next] Sala não encontrada: ${gameId}`);
                return;
            }

            // Aceitar jogos em 'Intermission' ou 'Playing'
            if (game.status !== 'Intermission' && game.status !== 'Playing') {
                console.error(`❌ [player_ready_next] Status inválido: ${game.status}`);
                return;
            }

            // Inicializar estado de sala se não existir
            initializeRoomState(gameId);

            const roomState = gameRoomState[gameId];

            console.log(`📡 [${gameId}] ${socket.id} pronto para próximo jogo`);

            // Adicionar jogador à lista de prontos
            roomState.readyPlayers.add(socket.id);
            console.log(`📊 Prontos: ${roomState.readyPlayers.size}/2`);

            // VERIFICAÇÃO CRÍTICA: Ambos os jogadores prontos?
            if (roomState.readyPlayers.size === 2) {
                console.log(`✅ [${gameId}] AMBOS PRONTOS! Iniciando novo round...`);

                // 1. Preparar novo baralho
                const roundInfo = prepareNextRound(game);

                if (!roundInfo) {
                    console.error(`❌ Erro ao preparar novo round`);
                    return;
                }

                // 2. Voltar status para 'Playing'
                game.status = 'Playing';

                // 3. Limpar lista de prontos para a próxima vez
                resetRoundReady(gameId);

                // 4. Enviar novo estado para ambos os jogadores
                io.to(game.creatorId).emit("start_next_round", {
                    gameState: {
                        myHand: game.state.p1Hand,
                        trunfo: roundInfo.trunfo,
                        deckCount: roundInfo.deckCount,
                        myScore: 0,
                        opponentScore: 0,
                        isMyTurn: true,
                        gameFinished: false
                    }
                });

                io.to(game.player2).emit("start_next_round", {
                    gameState: {
                        myHand: game.state.p2Hand,
                        trunfo: roundInfo.trunfo,
                        deckCount: roundInfo.deckCount,
                        myScore: 0,
                        opponentScore: 0,
                        isMyTurn: false,
                        gameFinished: false
                    }
                });

                console.log(`🎮 [${gameId}] Novo round iniciado!`);
            }
        });

        /* ================================================
         * DESISTÊNCIA (FORFEIT) - COM SINCRONIZAÇÃO
         * ================================================ */
        socket.on("player_forfeit", (data) => {
            const gameId = String(data.gameId);
            const game = games.find(g => String(g.id) === gameId);

            if (!game) {
                console.error(`❌ [player_forfeit] Sala não encontrada: ${gameId}`);
                return;
            }

            console.log(`🏳️ [${gameId}] ${socket.id} desistiu da partida`);

            // Determinar o oponente
            const isCreatorForfeit = (socket.id === game.creatorId);
            const opponentId = isCreatorForfeit ? game.player2 : game.creatorId;

            // Notificar oponente que este jogador desistiu
            io.to(opponentId).emit("opponent_forfeit", {
                gameId: gameId,
                forfeitPlayerId: socket.id
            });

            // Processar fim de jogo (vitória por desistência = 4 pontos)
            const winnerId = isCreatorForfeit ? game.player2 : game.creatorId;
            processGameEnd(io, game, winnerId, 'forfeit', 4);

            // Limpar estado de sala
            if (gameRoomState[gameId]) {
                delete gameRoomState[gameId];
            }
        });

        socket.on("disconnect", async () => {
            console.log(`🔌 ${socket.id} desconectou`);

            // Procurar jogo deste jogador
            const game = games.find(g => (g.creatorId === socket.id || g.player2 === socket.id));

            if (!game) return;

            // Se estava em estado de "Aguardando Oponente" (ready)
            if (gameRoomState[game.id] && gameRoomState[game.id].readyPlayers.has(socket.id)) {
                const opponentId = (socket.id === game.creatorId) ? game.player2 : game.creatorId;
                
                // Notificar oponente que foi desconectado
                io.to(opponentId).emit("opponent_forfeit", {
                    gameId: game.id,
                    forfeitPlayerId: socket.id,
                    reason: "disconnect"
                });

                console.log(`⚠️ [${game.id}] Jogador desconectou durante 'Aguardando Oponente'`);
            }

            // Processar fim de jogo se estavam jogando (desconexão = 4 pontos)
            if (game.status === 'Playing') {
                const winnerId = (socket.id === game.creatorId) ? game.player2 : game.creatorId;
                processGameEnd(io, game, winnerId, 'disconnect', 4);
                console.log(`🏁 [${game.id}] Jogo terminado por desconexão`);
            } 
            // Se era jogo pendente (aguardando jogador 2)
            else if (game.status === 'Pending' && game.creatorId === socket.id) {
                // Update status in database before removing from memory
                try {
                    await axios.patch(`${LARAVEL_API}/games/${game.id}/status`, {
                        status: 'Interrupted'
                    });
                    console.log(`✅ [${game.id}] Status atualizado para 'Interrupted' na BD`);
                } catch (error) {
                    console.error(`❌ Erro ao atualizar status para 'Interrupted':`, error.message);
                }

                games.splice(games.indexOf(game), 1);
                io.emit("games", games.filter(g => g.status === 'Pending'));
                console.log(`🗑️ [${game.id}] Jogo pendente removido`);
            }

            // Limpar estado de sala
            if (gameRoomState[game.id]) {
                delete gameRoomState[game.id];
            }
        });

        socket.on("get-games", () => { socket.emit("games", games.filter(g => g.status === 'Pending')); });
    });
}