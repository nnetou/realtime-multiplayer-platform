export const Suit = {
  CLUBS: 'CLUBS',
  DIAMONDS: 'DIAMONDS',
  HEARTS: 'HEARTS',
  SPADES: 'SPADES'
};

export const Rank = {
  TWO:   { name: 'TWO',   order: 1, value: 0, label: '2' },
  THREE: { name: 'THREE', order: 2, value: 0, label: '3' },
  FOUR:  { name: 'FOUR',  order: 3, value: 0, label: '4' },
  FIVE:  { name: 'FIVE',  order: 4, value: 0, label: '5' },
  SIX:   { name: 'SIX',   order: 5, value: 0, label: '6' },
  QUEEN: { name: 'QUEEN', order: 6, value: 2, label: 'Q' },
  JACK:  { name: 'JACK',  order: 7, value: 3, label: 'J' },
  KING:  { name: 'KING',  order: 8, value: 4, label: 'K' },
  SEVEN: { name: 'SEVEN', order: 9, value: 10, label: '7' },
  ACE:   { name: 'ACE',   order: 10, value: 11, label: 'A' }
};

export class Card {
  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
  }
  
  get imageUrl() {
    const baseUrl = "http://localhost:8000/images/cartas/playing-cards-master/"; 
    const suitStr = this.suit.toLowerCase();
    const rankStr = this.rank.label; // Usar label mapeia A, 7, K, etc.
    return `${baseUrl}${suitStr}_${rankStr}.png`;
  }
}