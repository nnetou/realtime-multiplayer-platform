import { defineStore } from 'pinia';
import { useAuthStore } from './auth';
import { useSocketStore } from './socket';
import { BiscaEngine } from '../lib/BiscaEngine';

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
        matchType: '3'
    }),

    getters: {
        getMyGames: (state) => {
            const authStore = useAuthStore();
            if (!authStore.user) return [];
            return state.games.filter(g => g.creatorName === authStore.userName || g.player1Name === authStore.userName);
        },
        getAvailableGames: (state) => {
            return state.games.filter(g => g.status === 'waiting');
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

        cancelGame(socket, game) {
            if (socket) socket.emit('game:cancel', { gameId: game.id });
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
            if (this.gameState.playerScore > 60) this.lastGameResult = "VITORIA!";
            else if (this.gameState.playerScore < 60) this.lastGameResult = "DERROTA...";
            else this.lastGameResult = "EMPATE";
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
                playMode: 'match', winner: null
            };
            this.moveError = null;
        },

        async saveGame() { }
    }
});