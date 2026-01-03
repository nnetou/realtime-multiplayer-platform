/**
 * BiscaEngine.js - Lógica central do jogo
 */
export class BiscaEngine {
    constructor() {
        this.SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
        // Ranks: A=11, 7=10, K=4, J=3, Q=2
        this.RANKS = {
            'A': { value: 11, order: 10 },
            '7': { value: 10, order: 9 },
            'K': { value: 4, order: 8 },
            'J': { value: 3, order: 7 },
            'Q': { value: 2, order: 6 },
            '6': { value: 0, order: 5 },
            '5': { value: 0, order: 4 },
            '4': { value: 0, order: 3 },
            '3': { value: 0, order: 2 },
            '2': { value: 0, order: 1 }
        };
    }

    createDeck() {
        let deck = [];
        this.SUITS.forEach(suit => {
            Object.keys(this.RANKS).forEach(rankKey => {
                // --- CORREÇÃO: GERAR O URL DA IMAGEM ---
                // Nota: O nome do ficheiro deve bater certo com a pasta public do Laravel
                // Ex: hearts_A.png, hearts_7.png, hearts_K.png
                const imgUrl = `http://localhost:8000/images/cartas/playing-cards-master/${suit}_${rankKey}.png`;

                deck.push({
                    suit: suit,
                    rank: { name: rankKey, ...this.RANKS[rankKey] },
                    imageUrl: imgUrl, // <--- OBRIGATÓRIO PARA O VUE MOSTRAR A CARTA
                    code: `${rankKey}-${suit}`
                });
            });
        });

        // Baralhar
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    initializeNewGame(matchType = '3') {
        const deck = this.createDeck();
        const cardsPerPlayer = (matchType === '9') ? 9 : 3;
        const playerHand = deck.splice(0, cardsPerPlayer);
        const botHand = deck.splice(0, cardsPerPlayer);
        const trunfo = deck[0];

        return {
            deck,
            playerHand,
            botHand,
            trunfo,
            trunfoSuit: trunfo.suit,
            tableCards: [],
            playerScore: 0,
            botScore: 0,
            playerTurn: true,
            gameFinished: false
        };
    }

    getWinningCard(c1, c2, trunfoSuit) {
        if (!c1 || !c2) return c1 || c2;

        const s1 = c1.suit?.name || c1.suit;
        const s2 = c2.suit?.name || c2.suit;
        const trunfo = (typeof trunfoSuit === 'object') ? (trunfoSuit.name || '') : trunfoSuit;

        const isC1Trunfo = s1 === trunfo;
        const isC2Trunfo = s2 === trunfo;

        if (!isC1Trunfo && isC2Trunfo) return c2;
        if (isC1Trunfo && !isC2Trunfo) return c1;

        if (s1 === s2) {
            const o1 = this.getCardOrder(c1);
            const o2 = this.getCardOrder(c2);
            return o1 > o2 ? c1 : c2;
        }
        return c1;
    }

    getCardOrder(card) {
        if (!card || !card.rank) return -1;
        const name = this.normalizeRankName(card.rank.name || card.rank);
        return this.RANKS[name]?.order || 0;
    }

    getCardPoints(card) {
        if (!card || !card.rank) return 0;
        const name = this.normalizeRankName(card.rank.name || card.rank);
        return this.RANKS[name]?.value || 0;
    }

    normalizeRankName(name) {
        const map = { 'ACE': 'A', 'SEVEN': '7', 'KING': 'K', 'JACK': 'J', 'QUEEN': 'Q' };
        return map[name] || name;
    }


    isMoveValid(cardPlayed, hand, cardOnTable) {
        if (!cardOnTable) return true;
        if (cardPlayed.suit === cardOnTable.suit) return true;
        const hasSuit = hand.some(c => c.suit === cardOnTable.suit);
        return !hasSuit;
    }

    getBotMove(gameState) { return gameState.botHand[0]; }
}