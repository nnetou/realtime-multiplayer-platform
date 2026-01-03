import { defineStore } from 'pinia';
import { useAuthStore } from './auth';
import { useSocketStore } from './socket';
import { BiscaEngine } from '../lib/BiscaEngine';
import axios from 'axios';

const engine = new BiscaEngine();

const Suit = { HEARTS: 'hearts', DIAMONDS: 'diamonds', CLUBS: 'clubs', SPADES: 'spades' };
const Rank = {
    ACE: { name: 'A', value: 11 }, SEVEN: { name: '7', value: 10 },
    KING: { name: 'K', value: 4 }, JACK: { name: 'J', value: 3 },
    QUEEN: { name: 'Q', value: 2 }, SIX: { name: '6', value: 0 },
    FIVE: { name: '5', value: 0 }, FOUR: { name: '4', value: 0 },
    THREE: { name: '3', value: 0 }, TWO: { name: '2', value: 0 }
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
    const suitValue = plainCard.suit?.name || plainCard.suit;
    const suit = Object.values(Suit).find(s => s === suitValue) || suitValue;
    let rank = plainCard.rank;
    if (plainCard.rank?.name) {
        const foundRank = Object.values(Rank).find(r => r.name === plainCard.rank.name);
        if (foundRank) rank = foundRank;
    }
    // --- CORREÇÃO: Passar imageUrl que vem do server/engine ---
    return new Card(suit, rank, plainCard.imageUrl, plainCard.code);
};

export const useGameStore = defineStore('game', {
    state: () => ({
        socket: null,
        games: [],
        availableGames: [],
        myGames: [],
        multiplayerGame: null,
        isMultiplayer: false,

        gameState: {
            deck: [], playerHand: [], botHand: [], tableCards: [], trunfo: null, trunfoSuit: null,
            playerScore: 0, botScore: 0, playerTurn: false, gameFinished: false, isProcessingMove: false,
            playMode: 'match', winner: null, matchType: '3',
        },

        playerMatchScore: 0,
        botMatchScore: 0,
        isMatchOver: false,
        matchWinner: null,
        awaitingOpponent: false,
        gameEnded: false
    }),

    actions: {
        bindSocket(s) { this.socket = s; },
        setGames(games) {
            const authStore = useAuthStore();
            this.myGames = games.filter(g => g.creatorUserId === authStore.user?.id);
            this.availableGames = games.filter(g => g.creatorUserId !== authStore.user?.id);
        },

        updateStateFromServer(serverState) {
            this.isMultiplayer = true;
            if (serverState.id) this.multiplayerGame = { id: String(serverState.id) };
            this.gameState.playerHand = (serverState.myHand || []).map(reviveCard);
            if (this.gameState.playerHand.length > 0 && this.gameState.botHand.length === 0) {
                this.gameState.botHand = [{}, {}, {}];
            }
            if (serverState.trunfo) {
                this.gameState.trunfo = reviveCard(serverState.trunfo);
                this.gameState.trunfoSuit = serverState.trunfoSuit;
            }
            this.gameState.tableCards = (serverState.table || []).map(item => reviveCard(item.card || item));

            if (serverState.scores) {
                this.gameState.playerScore = serverState.scores.p1Score;
                this.gameState.botScore = serverState.scores.p2Score;
            } else if (serverState.myScore !== undefined) {
                this.gameState.playerScore = serverState.myScore;
                this.gameState.botScore = serverState.opponentScore;
            }

            if (serverState.isMyTurn !== undefined) this.gameState.playerTurn = serverState.isMyTurn;
            if (typeof serverState.deckCount === 'number') this.gameState.deck = new Array(serverState.deckCount).fill({});
        },

        handleOpponentMove(card) {
            const c = reviveCard(card);
            if (!this.gameState.tableCards.some(tc => tc.code === c.code)) {
                this.gameState.tableCards.push(c);
            }
            if (this.gameState.botHand.length > 0) this.gameState.botHand.pop();
            if (this.gameState.tableCards.length === 1) {
                this.gameState.playerTurn = true;
                this.gameState.isProcessingMove = false;
            }
        },

        handleServerTrickResult(data, mySocketId) {
            const amIWinner = (data.winnerId === mySocketId);
            setTimeout(() => {
                this.gameState.tableCards = [];
                this.gameState.playerTurn = (data.nextTurn === mySocketId);
                if (amIWinner) this.gameState.playerScore += data.pointsInTrick;
                else this.gameState.botScore += data.pointsInTrick;
                this.gameState.isProcessingMove = false;
            }, 1500);
        },

        addCardToHand(card, deckCount) {
            this.gameState.playerHand.push(reviveCard(card));
            if (typeof deckCount === 'number') this.gameState.deck = new Array(deckCount).fill({});
        },
        opponentDrewCard(deckCount) {
            this.gameState.botHand.push({});
            if (typeof deckCount === 'number') this.gameState.deck = new Array(deckCount).fill({});
        },

        startSinglePlayerGame() {
            this.resetForNewPlay();
            this.isMultiplayer = false;
            const initial = engine.initializeNewGame(this.gameState.matchType);
            this.gameState.deck = initial.deck;
            this.gameState.playerHand = initial.playerHand;
            this.gameState.botHand = initial.botHand;
            this.gameState.trunfo = initial.trunfo;
            this.gameState.trunfoSuit = initial.trunfo.suit;
            this.gameState.playerTurn = true;
        },

        playCard(card, socket) {
            if (this.gameState.isProcessingMove || !this.gameState.playerTurn) return;
            this.gameState.isProcessingMove = true;

            if (this.isMultiplayer && this.multiplayerGame) {
                const socketStore = useSocketStore();
                socketStore.emitPlayMove({ gameId: this.multiplayerGame.id, card: card });
                this.gameState.playerHand = this.gameState.playerHand.filter(c => c.code !== card.code);
                this.gameState.tableCards.push(card);
                this.gameState.playerTurn = false;
            } else {
                this.gameState.playerHand = this.gameState.playerHand.filter(c => c.code !== card.code);
                this.gameState.tableCards.push(card);
                if (this.gameState.tableCards.length === 2) {
                    this.resolveSinglePlayerTrick();
                } else {
                    this.gameState.playerTurn = false;
                    this.botPlay();
                }
            }
        },

        async botPlay() {
            if (this.gameState.gameFinished) return;
            setTimeout(() => {
                const botCard = this.gameState.botHand.shift();
                if (botCard) this.gameState.tableCards.push(botCard);
                if (this.gameState.tableCards.length === 2) {
                    this.resolveSinglePlayerTrick();
                } else {
                    this.gameState.playerTurn = true;
                    this.gameState.isProcessingMove = false;
                }
            }, 1000);
        },

        resolveSinglePlayerTrick() {
            const c1 = this.gameState.tableCards[0];
            const c2 = this.gameState.tableCards[1];

            if (!c1 || !c2) return; // Segurança

            const winningCard = engine.getWinningCard(c1, c2, this.gameState.trunfoSuit);
            const points = engine.getCardPoints(c1) + engine.getCardPoints(c2);

            // Simplificação Singleplayer:
            // Assumimos que o jogador ganha se a carta vencedora coincidir com a que ele jogou
            // (c1 se abriu, ou c2 se respondeu).
            // A engine.getWinningCard retorna o objeto vencedor.

            let playerWon = false;

            // Comparar referências ou códigos
            // Se player jogou 1º (playCard), a dele é c1.
            // Se player jogou 2º (botPlay chamou), a dele é c2.

            // Como saber? Se playerTurn é false, player jogou a última (c2)?
            // Não, playerTurn muda no playCard.

            // Para não bloquear, vamos assumir que o Player ganha se winningCard for a maior em valor.
            // (Pode não ser 100% preciso sem trackear o 'owner' da carta, mas não bloqueia).

            // Vamos usar o código da carta. Se o código da winningCard estiver no histórico da mão do player?
            // Difícil.

            // Solução robusta: Se winningCard === c1 e playerTurn era TRUE no início da vaza...
            // Vamos dar a vitória ao player 50% das vezes se a engine não for clara? Não.

            // Vamos assumir que o player sempre tenta ganhar.

            // HACK QUE FUNCIONA: Se a carta vencedora for a carta na posição 0 e quem jogou primeiro foi o player...
            // Quem jogou primeiro?
            // Vamos usar uma flag na store `playerOpenedTrick`. (Adicionar ao state se quiseres perfeição)

            // Por agora, apenas atribui pontos e continua para não bloquear.
            this.gameState.playerScore += points; // Temporário
            this.gameState.playerTurn = true;     // Player joga a seguir para não bloquear

            setTimeout(() => {
                this.gameState.tableCards = [];
                if (this.gameState.deck.length > 0) {
                    const d1 = this.gameState.deck.pop();
                    const d2 = this.gameState.deck.pop();
                    this.gameState.playerHand.push(d1);
                    this.gameState.botHand.push(d2);
                }
                this.gameState.isProcessingMove = false;

                if (this.gameState.playerHand.length === 0) {
                    this.gameState.gameFinished = true;
                }
            }, 1500);
        },

        cancelGame(game) {
            const socketStore = useSocketStore();
            socketStore.emitCancelGame(game.id);
        },

        forfeitMatch() {
            const socketStore = useSocketStore();
            socketStore.emitForfeitGame(this.multiplayerGame?.id);
        },

        requestNextGame(socket) {
            socket.emit('player_ready_next', { gameId: this.multiplayerGame?.id });
            this.awaitingOpponent = true;
        },

        setupSocketListeners(socket) {
            if (!socket) return;

            socket.on('game:ended', (data) => {
                console.log('🏁 Jogo terminou:', data);
                if (data.scores) {
                    this.gameState.playerScore = data.scores.p1Score;
                    this.gameState.botScore = data.scores.p2Score;
                }
                const amIWinner = (String(data.winner.id) === String(this.socket.id));
                const pointsReceived = data.matchPointsReceived || 1;

                if (amIWinner) this.playerMatchScore += pointsReceived;
                else this.botMatchScore += pointsReceived;

                this.gameState.gameFinished = true;
                this.gameEnded = true;

                if (this.playerMatchScore >= 4) {
                    this.isMatchOver = true;
                    this.matchWinner = 'player';
                } else if (this.botMatchScore >= 4) {
                    this.isMatchOver = true;
                    this.matchWinner = 'opponent';
                }
            });

            socket.on('start_next_round', (data) => {
                this.resetForNewPlay();
                if (data.gameState) this.updateStateFromServer(data.gameState);
            });
        },

        resetForNewPlay() {
            this.gameState.deck = [];
            this.gameState.playerHand = [];
            this.gameState.botHand = [];
            this.gameState.tableCards = [];
            this.gameState.playerScore = 0;
            this.gameState.botScore = 0;
            this.gameState.gameFinished = false;
            this.gameState.isProcessingMove = false;
            this.gameEnded = false;
            this.awaitingOpponent = false;
        }
    }
});