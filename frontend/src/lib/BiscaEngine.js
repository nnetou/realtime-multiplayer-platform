import { Card, Suit, Rank } from './Card';

export class BiscaEngine {

  createDeck() {
    let fullDeck = [];
    Object.keys(Suit).forEach(suitKey => {
      Object.keys(Rank).forEach(rankKey => {
        fullDeck.push(new Card(Suit[suitKey], Rank[rankKey]));
      });
    });
    // Fisher-Yates shuffle
    for (let i = fullDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fullDeck[i], fullDeck[j]] = [fullDeck[j], fullDeck[i]];
    }
    return fullDeck;
  }

  initializeNewGame() {
    const deck = this.createDeck();
    
    // Distribui 9 cartas para cada (como no teu Kotlin)
    const playerHand = deck.splice(0, 9);
    const botHand = deck.splice(0, 9);
    
    let trunfo = null;
    let trunfoSuit = null;

    if (deck.length > 0) {
      trunfo = deck[deck.length - 1];
      // Nota: No Kotlin removes o trunfo da lista principal, aqui mantemos a lógica visual
      // Mas para ser fiel ao motor, removemo-lo do array de compra 'normal'
      deck.pop(); 
      trunfoSuit = trunfo.suit;
    }

    return {
      deck,
      playerHand,
      botHand,
      trunfo,
      trunfoSuit,
      tableCards: [],
      playerScore: 0,
      botScore: 0,
      playerTurn: true,
      playerStartedTrick: true,
      gameFinished: false,
      playedCards: [] // Essencial para a IA saber o que já saiu (Boss Cards)
    };
  }

  getWinningCard(card1, card2, trunfoSuit, firstCardPlayed) {
    const isCard1Starter = (card1 === firstCardPlayed);
    const starter = isCard1Starter ? card1 : card2;
    const follower = isCard1Starter ? card2 : card1;

    const isStarterTrunfo = starter.suit === trunfoSuit;
    const isFollowerTrunfo = follower.suit === trunfoSuit;

    // Lógica de Trunfo
    if (isStarterTrunfo && !isFollowerTrunfo) return starter;
    if (!isStarterTrunfo && isFollowerTrunfo) return follower;
    
    // Se ambos são trunfo ou do mesmo naipe
    if (starter.suit === follower.suit) {
      return starter.rank.order > follower.rank.order ? starter : follower;
    }
    
    // Se não assistiu e não cortou, ganha quem começou
    return starter;
  }

  isMoveValid(cardPlayed, hand, cardOnTable) {
    if (!cardOnTable) return true;
    if (cardPlayed.suit === cardOnTable.suit) return true;
    
    // Verifica se tem o naipe (Obrigatório assistir na Bisca se tiveres naipe)
    // Nota: A regra "obrigatório assistir" na Bisca tradicional aplica-se sempre, 
    // mas no teu código Kotlin tu só aplicas se o deck estiver vazio (Fase Final).
    // O gameStore.js controla quando chamar esta validação.
    const hasSuit = hand.some(c => c.suit === cardOnTable.suit);
    return !hasSuit;
  }

  // =========================================================================
  // 🧠 INTELIGÊNCIA ARTIFICIAL (Tradução Direta do Kotlin)
  // =========================================================================

  getBotMove(gameState) {
    const { botHand, tableCards, trunfoSuit, deck, trunfo, playedCards } = gameState;
    
    // A primeira carta jogada na mesa (se houver)
    // Se tableCards tem 1 carta, é essa. Se tem 0, é null.
    const cardOnTable = tableCards.length > 0 ? tableCards[0] : null;

    // Fase final: Deck vazio e já não há trunfo visível para pescar
    const isFinalPhase = deck.length === 0 && trunfo === null;

    // Se só tem uma carta, joga essa
    if (botHand.length === 1) return botHand[0];

    if (!cardOnTable) {
      return this.playHardLead(botHand, trunfoSuit, isFinalPhase, playedCards);
    }
    return this.playHardResponse(botHand, cardOnTable, trunfoSuit, isFinalPhase, playedCards);
  }

  /**
   * Lógica de Abertura (Lead) - O Bot joga a primeira carta
   */
  playHardLead(hand, trunfoSuit, isFinalPhase, playedCards) {
    // --- FASE FINAL ---
    if (isFinalPhase) {
      // 1. Joga Boss Cards (Cartas que ganham de certeza)
      const bossCard = hand.find(c => this.isBossCard(c, hand, playedCards));
      if (bossCard) return bossCard;

      // 2. Tenta jogar "Lixo Seguro" (não trunfo) para ver se oponente gasta trunfo
      // Filtra não trunfos e ordena pelo menor rank (order)
      const safeTrash = hand
        .filter(c => c.suit !== trunfoSuit)
        .sort((a, b) => a.rank.order - b.rank.order)[0]; // minByOrNull
      
      if (safeTrash) return safeTrash;

      // 3. Só tem trunfos ou cartas arriscadas. Joga a mais fraca.
      return hand.slice().sort((a, b) => a.rank.order - b.rank.order)[0];
    }

    // --- FASE INICIAL ---

    // 1. REGRA DE OURO: Nunca jogar Ás ou 7 de naipe alheio (Suicídio)
    const safeCards = hand.filter(card => {
        const isTrunfo = card.suit === trunfoSuit;
        const points = this.getCardPoints(card);

        if (isTrunfo) {
            return true; // Trunfos são seguros
        } else {
            return points < 10; // Só joga se NÃO for Ás (11) nem 7 (10)
        }
    });

    if (safeCards.length > 0) {
        // Dentre as seguras, joga a mais fraca (vai à pesca)
        // Prioridade: Lixo não trunfo
        const safeNonTrunfo = safeCards.filter(c => c.suit !== trunfoSuit);
        if (safeNonTrunfo.length > 0) {
            return safeNonTrunfo.sort((a, b) => a.rank.order - b.rank.order)[0];
        }
        // Se as únicas seguras são trunfos, joga o trunfo mais fraco
        return safeCards.sort((a, b) => a.rank.order - b.rank.order)[0];
    }

    // CENÁRIO DE PESADELO: Só tenho Cargas (Ás/7) não trunfo.
    // Jogo a "menos valiosa" (o 7 vale 10, o Ás vale 11, mas o Ás ganha ao 7... 
    // No Kotlin ordenavas por pontos, aqui ordenamos por pontos para minimizar perda).
    // minByOrNull { getCardPoints(it) }
    return hand.slice().sort((a, b) => this.getCardPoints(a) - this.getCardPoints(b))[0] || hand[0];
  }

  /**
   * Lógica de Resposta (Response) - O Bot joga a segunda carta
   */
  playHardResponse(hand, enemyCard, trunfoSuit, isFinalPhase, playedCards) {
      const enemyPoints = this.getCardPoints(enemyCard);
      const cardsOfSuit = hand.filter(c => c.suit === enemyCard.suit);
      const trunfos = hand.filter(c => c.suit === trunfoSuit);

      // --- FASE FINAL (Regras de Sueca/Obrigado a assistir) ---
      if (isFinalPhase) {
          if (cardsOfSuit.length > 0) {
              // Tenta ganhar barato (carta > inimiga, mas a menor possivel dessas)
              const winners = cardsOfSuit.filter(c => c.rank.order > enemyCard.rank.order);
              if (winners.length > 0) {
                  return winners.sort((a, b) => a.rank.order - b.rank.order)[0];
              }
              // Não ganha, joga a menor do naipe
              return cardsOfSuit.sort((a, b) => a.rank.order - b.rank.order)[0];
          }
          // Não tem naipe: Corta ou Descarta
          if (trunfos.length > 0) {
              // Corta sempre com o menor trunfo
              return trunfos.sort((a, b) => a.rank.order - b.rank.order)[0];
          }
          // Descarta lixo (menor carta da mão)
          return hand.slice().sort((a, b) => a.rank.order - b.rank.order)[0];
      }

      // --- FASE INICIAL (Bisca) ---

      // 1. DETETOR DE ERRO HUMANO (Sniper)
      // Se humano jogou carga (>=10) de não trunfo e eu tenho trunfo...
      if (enemyCard.suit !== trunfoSuit && enemyPoints >= 10 && trunfos.length > 0) {
          // Corta com o menor trunfo!
          return trunfos.sort((a, b) => a.rank.order - b.rank.order)[0];
      }

      // 2. TENHO O NAIPE
      if (cardsOfSuit.length > 0) {
          const winners = cardsOfSuit.filter(c => c.rank.order > enemyCard.rank.order);

          if (winners.length > 0) {
              const cheapestWin = winners.sort((a, b) => a.rank.order - b.rank.order)[0];
              // Ganha se a carta inimiga vale pontos OU se a minha vitória é barata (<10 pts)
              if (enemyPoints > 0 || this.getCardPoints(cheapestWin) < 10) {
                  return cheapestWin;
              }
          }
          // Se não ganho ou não compensa ganhar, jogo a menor desse naipe
          return cardsOfSuit.sort((a, b) => a.rank.order - b.rank.order)[0];
      }

      // 3. NÃO TENHO O NAIPE (Corte Tático)
      if (trunfos.length > 0 && enemyCard.suit !== trunfoSuit) {
          // Corta se a carta valer pontos (>=2: Q, J, K, 7, A)
          if (enemyPoints >= 2) {
              return trunfos.sort((a, b) => a.rank.order - b.rank.order)[0];
          }
      }

      // 4. DESCARTE (Balda)
      const trash = hand.filter(c => c.suit !== trunfoSuit);
      if (trash.length > 0) {
          return trash.sort((a, b) => a.rank.order - b.rank.order)[0];
      }

      // Só tenho trunfos, tenho de jogar um
      return hand.slice().sort((a, b) => a.rank.order - b.rank.order)[0];
  }

  // Verifica se a carta é a mais forte possível que ainda está em jogo
  isBossCard(card, hand, playedCards) {
      const myRank = card.rank.order;
      // Filtra ranks que são maiores que o da minha carta
      const strongerRanks = Object.values(Rank).filter(r => r.order > myRank);

      for (const strongRank of strongerRanks) {
          // Verifica se este rank maior já saiu ou está na minha mão
          // Se não estiver em lado nenhum, o oponente tem-no.
          const isAccountedFor = [...hand, ...playedCards].some(c => 
              c.suit === card.suit && c.rank.name === strongRank.name
          );
          
          if (!isAccountedFor) return false;
      }
      return true;
  }

  getCardPoints(card) {
      // Baseado no Enum Rank do Kotlin e Card.js
      const name = card.rank.name;
      if (name === "ACE") return 11;
      if (name === "SEVEN") return 10;
      if (name === "KING") return 4;
      if (name === "JACK") return 3;
      if (name === "QUEEN") return 2;
      return 0;
  }
}