import { Card, Suit, Rank } from './Card.js';

export class BiscaEngine {

  createDeck() {
    let fullDeck = [];
    Object.keys(Suit).forEach(suitKey => {
      Object.keys(Rank).forEach(rankKey => {
        fullDeck.push(new Card(Suit[suitKey], Rank[rankKey]));
      });
    });
    for (let i = fullDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fullDeck[i], fullDeck[j]] = [fullDeck[j], fullDeck[i]];
    }
    return fullDeck;
  }

  initializeNewGame() {
    const deck = this.createDeck();
    const playerHand = deck.splice(0, 3);
    const botHand = deck.splice(0, 3);
    let trunfo = deck[0]; 
    let trunfoSuit = trunfo.suit;
    
    return {
      deck, playerHand, botHand, trunfo, trunfoSuit,
      tableCards: [], playerScore: 0, botScore: 0,
      playerTurn: true, playerStartedTrick: true, gameFinished: false
    };
  }

  getWinningCard(card1, card2, trunfoSuit, firstCardPlayed) {
    const isCard1Starter = (card1.rank.name === firstCardPlayed.rank.name && card1.suit === firstCardPlayed.suit);
    const starter = isCard1Starter ? card1 : card2;
    const follower = isCard1Starter ? card2 : card1;
    const isStarterTrunfo = starter.suit === trunfoSuit;
    const isFollowerTrunfo = follower.suit === trunfoSuit;

    if (!isStarterTrunfo && isFollowerTrunfo) return follower;
    if (isStarterTrunfo && !isFollowerTrunfo) return starter;
    if (starter.suit === follower.suit) {
      return starter.rank.order > follower.rank.order ? starter : follower;
    }
    return starter;
  }

  getCardPoints(card) {
      const name = card.rank.name;
      if (name === "ACE") return 11;
      if (name === "SEVEN") return 10;
      if (name === "KING") return 4;
      if (name === "JACK") return 3;
      if (name === "QUEEN") return 2;
      return 0;
  }

  isMoveValid(cardPlayed, hand, cardOnTable) {
    if (!cardOnTable) return true;
    if (cardPlayed.suit === cardOnTable.suit) return true;
    const hasSuit = hand.some(c => c.suit === cardOnTable.suit);
    return !hasSuit;
  }

  getBotMove(gameState) { return gameState.botHand[0]; }
}