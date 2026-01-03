import { defineStore } from 'pinia';
import { useAuthStore } from './auth';
import { useSocketStore } from './socket';
import { BiscaEngine } from '../lib/BiscaEngine';
import axios from 'axios';

const engine = new BiscaEngine();

// --- DEFINIÇÕES MANUAIS (Para evitar erros de importação) ---
const Suit = { HEARTS: 'hearts', DIAMONDS: 'diamonds', CLUBS: 'clubs', SPADES: 'spades' };
const Rank = {
    ACE: { name: 'A', value: 11, order: 8 }, SEVEN: { name: '7', value: 10, order: 9 },
    KING: { name: 'K', value: 4, order: 7 }, JACK: { name: 'J', value: 3, order: 6 },
    QUEEN: { name: 'Q', value: 2, order: 5 }, SIX: { name: '6', value: 0, order: 4 },
    FIVE: { name: '5', value: 0, order: 3 }, FOUR: { name: '4', value: 0, order: 2 },
    THREE: { name: '3', value: 0, order: 10 }, TWO: { name: '2', value: 0, order: 1 }
};

class Card {
    constructor(suit, rank, imageUrl, code) {
        this.suit = suit;
        this.rank = rank;
        this.imageUrl = imageUrl;
        this.code = code;
    }
}

const reviveCard = (plainCard) => {
    if (!plainCard || !plainCard.suit) return plainCard;
    if (plainCard instanceof Card) return plainCard;

    const suitValue = plainCard.suit?.name || plainCard.suit;
    const suit = Object.values(Suit).find(s => s === suitValue) || suitValue;

    let rank = plainCard.rank;
    if (plainCard.rank?.name) {
        const foundRank = Object.values(Rank).find(r => r.name === plainCard.rank.name);
        if (foundRank) rank = foundRank;
    }

    if (suit && rank) {
        return new Card(suit, rank, plainCard.imageUrl, plainCard.code);
    }
    return plainCard;
};

export const useGameStore = defineStore('game', {
    state: () => ({
        socket: null,
        games: [],
        availableGames: [],
        myGames: [],
        multiplayerGame: null,
        isMultiplayer: false,
        socketId: null,

        gameState: {
            deck: [],
            playerHand: [],
            botHand: [],
            tableCards: [],
            trunfo: null,
            trunfoSuit: null,
            playerScore: 0,
            botScore: 0,
            playerTurn: false,
            gameFinished: false,
            isProcessingMove: false,
            playMode: 'match',
            winner: null
        },

        playMode: 'match',
        playerMatchScore: 0,
        botMatchScore: 0,
        gameNumber: 1,
        lastGameResult: "",
        moveError: null,
        matchType: '3',
        
        // Estados de sincronização
        isMatchOver: false,
        matchWinner: null, // 'player', 'opponent', null
        awaitingOpponent: false, // Aguardando confirmação do oponente para próximo jogo
        gameEnded: false // Diferencia "fim de jogo" de "fim de partida"
    }),

    getters: {
        getMyGames: (state) => {
            const authStore = useAuthStore();
            if (!authStore.user) return [];
            return state.games.filter(g => g.creatorName === authStore.userName || g.player1Name === authStore.userName);
        },
        getAvailableGames: (state) => {
            return state.games.filter(g => g.status === 'waiting');
        },
        isMatchFinished: (state) => {
            return state.playerMatchScore >= 4 || state.botMatchScore >= 4;
        },
        matchWinner: (state) => {
            if (state.playerMatchScore >= 4) return 'player';
            if (state.botMatchScore >= 4) return 'opponent';
            return null;
        }
    },

    actions: {
        bindSocket(s) { this.socket = s; },
        setGames(games) {
            const authStore = useAuthStore();
            const myUserId = authStore.user?.id;
            console.log(`[GameStore] Setting games | Total: ${games.length} | My Socket ID: ${myUserId}`);

            this.myGames = games.filter(game => game.creatorUserId === myUserId);
            this.availableGames = games.filter(game => game.creatorUserId !== myUserId);
            console.log(`My Games: ${this.myGames.length} | Available Games: ${this.availableGames.length}`);
            games.forEach(game => {
                console.log(`Game ID: ${game.id} | Creator: ${game.creatorUserId}`);
            });
        },

        // --- A FUNÇÃO QUE DAVA ERRO ---
        updateStateFromServer(serverState) {
            console.log("📥 [GameStore] updateState:", serverState);
            this.isMultiplayer = true;

            if (serverState.id) this.multiplayerGame = { id: String(serverState.id) };
            if (serverState.playMode) this.gameState.playMode = serverState.playMode;

            // Minha mão
            if (serverState.myHand && Array.isArray(serverState.myHand)) {
                this.gameState.playerHand = serverState.myHand.map(reviveCard);
            }

            // Mão do Oponente (Visual - Enche se estiver vazia no início)
            if (this.gameState.playerHand.length > 0 && this.gameState.botHand.length === 0) {
                this.gameState.botHand = [{}, {}, {}];
            }

            // Trunfo
            if (serverState.trunfo) {
                this.gameState.trunfo = reviveCard(serverState.trunfo);
                this.gameState.trunfoSuit = serverState.trunfoSuit || serverState.trunfo.suit;
            }

            // Mesa (Table) - Garante que não é undefined
            if (serverState.table && Array.isArray(serverState.table)) {
                this.gameState.tableCards = serverState.table.map(item => reviveCard(item.card || item));
            } else {
                this.gameState.tableCards = [];
            }

            // Pontos
            if (serverState.myScore !== undefined) {
                this.gameState.playerScore = serverState.myScore;
                this.gameState.botScore = serverState.opponentScore;
            }

            // Turno
            if (serverState.isMyTurn !== undefined) this.gameState.playerTurn = serverState.isMyTurn;

            // Deck
            if (typeof serverState.deckCount === 'number') {
                this.gameState.deck = new Array(serverState.deckCount).fill({});
            }

            this.sortHand();
        },

        handleOpponentMove(card) {
            const c = reviveCard(card);

            // 1. Adicionar carta à mesa (sem duplicados)
            const exists = this.gameState.tableCards.some(tc => tc.code === c.code);
            if (!exists) {
                this.gameState.tableCards.push(c);
            }

            // 2. Remover visualmente carta do oponente
            if (this.gameState.botHand.length > 0) {
                this.gameState.botHand.pop();
            }

            // 3. ATUALIZAR O TURNO (A correção para o Player 2 jogar)              // Se a mesa tem 1 carta, significa que o oponente jogou a primeira.
            // Logo, agora é a minha vez de responder.
            if (this.gameState.tableCards.length === 1) {
                this.gameState.playerTurn = true;
                this.gameState.isProcessingMove = false; // Desbloqueia a UI
                console.log("👉 É a tua vez de jogar!");
            }
        },

        handleServerTrickResult(data, mySocketId) {
            const amIWinner = (data.winnerId === mySocketId);
            setTimeout(() => {
                this.gameState.tableCards = []; // Limpa mesa
                this.gameState.playerTurn = (data.nextTurn === mySocketId);
                this.gameState.isProcessingMove = false;

                if (amIWinner) this.gameState.playerScore += data.pointsInTrick;
                else this.gameState.botScore += data.pointsInTrick;
            }, 1500);
        },

        addCardToHand(card, deckCount) {
            const c = reviveCard(card);
            this.gameState.playerHand.push(c);
            this.sortHand();
            if (typeof deckCount === 'number') this.gameState.deck = new Array(deckCount).fill({});
        },

        opponentDrewCard(deckCount) {
            this.gameState.botHand.push({});
            if (typeof deckCount === 'number') this.gameState.deck = new Array(deckCount).fill({});
        },

        createGame(socket) {
            if (socket) {
                const authStore = useAuthStore();
                const name = authStore.user?.nickname || "Jogador";
                socket.emit('create-game', { playerName: name });
            }
        },

        cancelGame(game) {
            const socketStore = useSocketStore();
            socketStore.emitCancelGame(game.id);
        },

        // --- MÉTODOS DE JOGO (Comum) ---
        playCard(card, socket) {
            if (this.gameState.isProcessingMove || !this.gameState.playerTurn) return;

            // Validação de naipe
            if (this.gameState.deck.length === 0 && this.gameState.tableCards.length > 0) {
                const cardOnTable = this.gameState.tableCards[0];
                const isValid = engine.isMoveValid(card, this.gameState.playerHand, cardOnTable);
                if (!isValid) {
                    this.moveError = "⚠️ Tens de assistir ao naipe!";
                    setTimeout(() => { this.moveError = null; }, 3000);
                    return;
                }
            }

            this.gameState.isProcessingMove = true;

            if (this.isMultiplayer && this.multiplayerGame) {
                const socketStore = useSocketStore();
                const cleanCard = JSON.parse(JSON.stringify(card));
                socketStore.emitPlayMove({ gameId: this.multiplayerGame.id, card: cleanCard });

                // Otimismo
                this.gameState.playerHand = this.gameState.playerHand.filter(c => c.code !== card.code);
                this.gameState.tableCards.push(card);
                this.gameState.playerTurn = false;
            } else {
                // Lógica Single Player
                this.gameState.playerHand = this.gameState.playerHand.filter(c => c.code !== card.code);
                this.gameState.tableCards.push(card);
                if (this.gameState.tableCards.length === 2) this.resolveTrick();
                else { this.gameState.playerTurn = false; this.botPlay(); }
            }
        },

        // --- SINGLE PLAYER (Legado) ---
        startSinglePlayerGame() {
            this.resetForNewPlay();
            this.isMultiplayer = false;
            const initial = engine.initializeNewGame();
            this.gameState.deck = initial.deck;
            this.gameState.playerHand = initial.playerHand;
            this.gameState.botHand = initial.botHand;
            this.gameState.trunfo = initial.trunfo;
            this.gameState.trunfoSuit = initial.trunfoSuit;
            this.gameState.playerTurn = true;
            this.sortHand();
        },

        async botPlay() {
            if (this.gameState.gameFinished) return;
            setTimeout(() => {
                const botCard = this.gameState.botHand[0];
                this.gameState.botHand.shift();
                this.gameState.tableCards.push(botCard);
                if (this.gameState.tableCards.length === 2) this.resolveTrick();
                else { this.gameState.playerTurn = true; this.gameState.isProcessingMove = false; }
            }, 1000);
        },

        resolveTrick() {
            const card1 = this.gameState.tableCards[0];
            const card2 = this.gameState.tableCards[1];
            let playerWon = false;
            const winningCard = engine.getWinningCard(card1, card2, this.gameState.trunfoSuit);

            // Lógica Single Player de turno
            if (!this.gameState.playerTurn) { if (winningCard === card1) playerWon = true; } // Bot jogou 2ª
            else { if (winningCard === card2) playerWon = true; } // Player jogou 2ª

            const points = engine.getCardPoints(card1) + engine.getCardPoints(card2);
            if (playerWon) { this.gameState.playerScore += points; this.gameState.playerTurn = true; }
            else { this.gameState.botScore += points; this.gameState.playerTurn = false; }

            setTimeout(() => {
                this.gameState.tableCards = [];
                this.drawPhase(playerWon);
            }, 1500);
        },

        drawPhase(playerWon) {
            if (this.gameState.deck.length === 0) {
                if (this.gameState.playerHand.length === 0) this.finishSinglePlayerGame();
                else if (!playerWon) this.botPlay();
                return;
            }
            const c1 = this.gameState.deck.pop();
            const c2 = this.gameState.deck.pop();
            if (c1) {
                if (playerWon) { this.gameState.playerHand.push(c1); if (c2) this.gameState.botHand.push(c2); }
                else { this.gameState.botHand.push(c1); if (c2) this.gameState.playerHand.push(c2); }
            }
            this.sortHand();
            this.gameState.isProcessingMove = false;
            if (!playerWon) this.botPlay();
        },

        finishSinglePlayerGame() {
            this.gameState.gameFinished = true;
            this.gameState.isProcessingMove = false;
            
            // Determinar vencedor do jogo
            if (this.gameState.playerScore > 60) {
                this.lastGameResult = "VITORIA!";
                if (this.playMode === 'match') {
                    this.playerMatchScore++;
                }
            } else if (this.gameState.playerScore < 60) {
                this.lastGameResult = "DERROTA...";
                if (this.playMode === 'match') {
                    this.botMatchScore++;
                }
            } else {
                this.lastGameResult = "EMPATE";
            }
        },

        sortHand() {
            this.gameState.playerHand.sort((a, b) => {
                const suitA = a.suit?.name || a.suit || "";
                const suitB = b.suit?.name || b.suit || "";
                if (suitA !== suitB) return suitA.localeCompare(suitB);
                return (b.rank?.value || 0) - (a.rank?.value || 0);
            });
        },

        resetForNewPlay() {
            this.gameState = {
                deck: [], playerHand: [], botHand: [], tableCards: [], trunfo: null, trunfoSuit: null,
                playerScore: 0, botScore: 0, playerTurn: false, gameFinished: false, isProcessingMove: false,
                playMode: this.playMode, winner: null
            };
            this.moveError = null;
            this.gameEnded = false;
            this.awaitingOpponent = false;
        },

        resetMatch() {
            // Reset completo incluindo marcas da partida
            this.playerMatchScore = 0;
            this.botMatchScore = 0;
            this.gameNumber = 1;
            this.lastGameResult = "";
            this.isMatchOver = false;
            this.matchWinner = null;
            this.resetForNewPlay();
        },

        /* ============================================================
         * FORFEIT (Desistência) - Multiplayer
         * ============================================================ */
        async forfeitMatch(socket, betAmount) {
            const authStore = useAuthStore();
            
            // 1. Emitir socket para o oponente saber que desistimos
            if (socket) {
                socket.emit('player_forfeit', {
                    gameId: this.multiplayerGame?.id
                });
            }
            
            // 2. Chamar API para registar derrota e descontar moedas
            try {
                const response = await axios.post(
                    `${window.location.origin}/api/game/forfeit`,
                    {
                        gameId: this.multiplayerGame?.id,
                        betAmount: betAmount
                    }
                );
                console.log('Forfeit registado:', response.data);
            } catch (error) {
                console.error('Erro ao registar forfeit:', error);
            }
            
            // 3. Atualizar estado local
            this.gameState.winner = 'opponent';
            this.isMatchOver = true;
            this.matchWinner = 'opponent';
            this.gameState.gameFinished = true;
        },

        /* ============================================================
         * PRÓXIMO JOGO - Handshake com Oponente
         * ============================================================ */
        requestNextGame(socket) {
            if (!socket) return;
            
            // Entrada em estado de "aguardando oponente"
            this.awaitingOpponent = true;
            
            // Emitir que este jogador está pronto
            socket.emit('player_ready_next', {
                gameId: this.multiplayerGame?.id
            });
            
            console.log('📡 Jogador pronto para próximo jogo');
        },

        setupSocketListeners(socket) {
            if (!socket) return;
            
            // Quando AMBOS jogadores estão prontos, servidor envia este evento
            socket.on('start_next_round', (data) => {
                console.log('🎮 Iniciando próximo round:', data);
                
                // Apenas aqui reseta para o novo jogo
                this.resetForNewPlay();
                
                // Mantém as marcas da partida
                // this.playerMatchScore e this.botMatchScore já existem
                
                // Atualiza estado do novo jogo
                if (data.gameState) {
                    this.updateStateFromServer(data.gameState);
                }
                
                // Modal fecha automaticamente
                this.gameEnded = false;
                this.awaitingOpponent = false;
            });
            
            // Oponente desistiu
            socket.on('opponent_forfeit', (data) => {
                console.log('🏳️ Oponente desistiu!');
                
                // Vitória automática
                this.gameState.winner = 'me';
                this.isMatchOver = true;
                this.matchWinner = 'player';
                
                // Incrementar marca se necessário
                if (this.playerMatchScore < 4) {
                    this.playerMatchScore++;
                }
                
                // Se atingiu 4 marcas, termina partida
                if (this.playerMatchScore >= 4) {
                    this.isMatchOver = true;
                }
                
                this.gameState.gameFinished = true;
            });
            
            // Evento de fim de jogo enviado pelo servidor
            socket.on('game_ended', (data) => {
                console.log('🏁 Jogo terminou (servidor):', data);
                
                // Atualizar pontos do jogo (caso não estejam sincronizados)
                if (data.scores) {
                    this.gameState.playerScore = data.scores.p1Score || 0;
                    this.gameState.botScore = data.scores.p2Score || 0;
                }
                
                // Identificar vencedor comparando winnerId com socket.id
                const amIWinner = (String(data.winnerId) === String(this.socket?.id));
                const pointsReceived = data.matchPointsReceived || 1;
                
                if (amIWinner) {
                    this.lastGameResult = 'VITORIA!';
                    this.playerMatchScore += pointsReceived;
                    console.log(`✅ Vitória! +${pointsReceived} ponto(s). Marcas: ${this.playerMatchScore}-${this.botMatchScore}`);
                } else {
                    this.lastGameResult = 'DERROTA...';
                    this.botMatchScore += pointsReceived;
                    console.log(`❌ Derrota! Oponente +${pointsReceived}. Marcas: ${this.playerMatchScore}-${this.botMatchScore}`);
                }
                
                this.gameState.gameFinished = true;
                this.gameEnded = true;
                
                // Verificar se partida acabou (>= 4 marcas)
                if (this.playerMatchScore >= 4) {
                    this.isMatchOver = true;
                    this.matchWinner = 'player';
                    console.log('🏆 PARTIDA GANHA!');
                } else if (this.botMatchScore >= 4) {
                    this.isMatchOver = true;
                    this.matchWinner = 'opponent';
                    console.log('😔 PARTIDA PERDIDA!');
                }
            });
        },

        async saveGame() { }
    }
});