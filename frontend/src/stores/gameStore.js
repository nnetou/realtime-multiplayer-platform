import { defineStore } from 'pinia';
import { BiscaEngine } from '../lib/BiscaEngine';
import { Rank } from '../lib/Card';
import { toast } from 'vue-sonner'

const engine = new BiscaEngine();

export const useGameStore = defineStore('game', {
  state: () => ({
    // Estado de um jogo individual
    gameState: {
      deck: [],
      playerHand: [],
      botHand: [],
      tableCards: [],
      trunfo: null,
      trunfoSuit: null,
      playerScore: 0,
      botScore: 0,
      playerTurn: true,
      playerStartedTrick: true,
      gameFinished: false,
      isProcessingMove: false
    },
    playMode: 'match', // 'match' ou 'single_game'
    // Estado da Partida
    playerMatchScore: 0,
    botMatchScore: 0,
    gameNumber: 1,
    currentCoins: 100,
    moveError: null,
    isChoosingTrunfo: false,
    cardSkinUrl: '/assets/card_back.png',
    lastGameResult: "",

    // --- PERSISTÊNCIA: Carrega da sessão ou define '3' por defeito ---
    matchType: sessionStorage.getItem('matchType') || '3',

    // Dados para API
    matchStartTime: null,
    trickHistory: []
  }),

  actions: {
    // Define o modo de jogo (chamada a partir do menu principal)
    setPlayMode(mode) {
      if (mode === 'single_game' || mode === 'match') {
        this.playMode = mode;
      }
    },

    // Reinicia completamente a store para um novo jogo/match
    resetForNewPlay() {
      this.$reset();
    },

    setMatchType(type) {
      this.matchType = type;
      // --- GUARDA NA SESSÃO ---
      sessionStorage.setItem('matchType', type);
    },

    startNextGame() {
      // Se for o início do match, reseta tempos e histórico
      if (this.gameNumber === 1 && this.playerMatchScore === 0 && this.botMatchScore === 0) {
        this.matchStartTime = Date.now();
        this.trickHistory = [];
      }

      const newState = engine.initializeNewGame();

      if (newState.trunfo) {
        newState.deck.push(newState.trunfo);
      }

      // === LÓGICA DE DISTRIBUIÇÃO ===
      // Garante que a mão tem o tamanho certo (3 ou 9)
      const targetHandSize = this.matchType === '9' ? 9 : 3;

      const adjustHand = (hand, deck) => {
        while (hand.length < targetHandSize && deck.length > 0) {
          hand.push(deck.shift());
        }
        while (hand.length > targetHandSize) {
          deck.unshift(hand.pop());
        }
      };

      adjustHand(newState.playerHand, newState.deck);
      adjustHand(newState.botHand, newState.deck);

      // Ordenar a mão do jogador
      newState.playerHand.sort((a, b) => {
        const sA = a.suit.name || a.suit;
        const sB = b.suit.name || b.suit;
        if (sA !== sB) return sA.localeCompare(sB);
        return b.rank.value - a.rank.value;
      });

      this.gameState = newState;
      this.isChoosingTrunfo = true;
      this.lastGameResult = "";
    },

    confirmStartGame() {
      this.isChoosingTrunfo = false;
      if (!this.gameState.playerTurn) {
        this.handleBotTurn();
      }
    },

    playCard(card) {
      // 1. Verifica se a jogada é permitida (bloqueio ou não é a vez do jogador)
      if (this.gameState.isProcessingMove || !this.gameState.playerTurn) {
        return; // Ignora o clique
      }

      // 2. ATIVA O BLOQUEIO IMEDIATAMENTE (SÍNCRONO)
      this.gameState.isProcessingMove = true;

      // 3. Chama a lógica assíncrona do jogo
      this.processPlayerMove(card);
    },

    // AÇÃO INTERNA - Contém a lógica do jogo
    async processPlayerMove(card) {
      if (!this.gameState.playerTurn || this.gameState.gameFinished) return;

      const cardOnTable = this.gameState.tableCards[0];

      if (this.gameState.deck.length === 0 && cardOnTable) {
        const isValid = engine.isMoveValid(card, this.gameState.playerHand, cardOnTable);
        if (!isValid) {
          this.moveError = "Tens de assistir ao naipe!";
          this.gameState.isProcessingMove = false;
          setTimeout(() => this.moveError = null, 2000);
          return;
        }
      }

      this.gameState.playerHand = this.gameState.playerHand.filter(c => c !== card);
      this.gameState.tableCards.push(card);
      this.gameState.playerTurn = false;

      if (this.gameState.tableCards.length === 2) {
        await new Promise(r => setTimeout(r, 1000));
        this.resolveTrick();
      } else {
        await new Promise(r => setTimeout(r, 500));
        this.handleBotTurn();
      }
    },

    // tive de eliminar, porque estava a dar para clicar em mais do que uma carta rapidamente7

    // async handlePlayerCardPlayed(card) {
    //   // Se já estiver a processar ou não for a vez do jogador, ignora o clique
    //   if (this.gameState.isProcessingMove || !this.gameState.playerTurn) {
    //     return;
    //   }

    //   this.gameState.isProcessingMove = true;


    //   if (!this.gameState.playerTurn || this.gameState.gameFinished) return;

    //   const cardOnTable = this.gameState.tableCards[0];

    //   if (this.gameState.deck.length === 0 && cardOnTable) {
    //     const isValid = engine.isMoveValid(card, this.gameState.playerHand, cardOnTable);
    //     if (!isValid) {
    //       this.moveError = "Tens de assistir ao naipe!";
    //       setTimeout(() => this.moveError = null, 2000);
    //       return;
    //     }
    //   }

    //   this.gameState.playerHand = this.gameState.playerHand.filter(c => c !== card);
    //   this.gameState.tableCards.push(card);
    //   this.gameState.playerTurn = false;

    //   if (this.gameState.tableCards.length === 2) {
    //     await new Promise(r => setTimeout(r, 1000));
    //     this.resolveTrick();
    //   } else {
    //     await new Promise(r => setTimeout(r, 500));
    //     this.handleBotTurn();
    //   }
    // },

    async handleBotTurn() {
      if (this.gameState.gameFinished) return;

      const botCard = engine.getBotMove(this.gameState);

      this.gameState.botHand = this.gameState.botHand.filter(c => c !== botCard);
      this.gameState.tableCards.push(botCard);
      this.gameState.playerTurn = true;

      if (this.gameState.tableCards.length === 2) {
        await new Promise(r => setTimeout(r, 1000));
        this.resolveTrick();
      }
    },

    resolveTrick() {
      const c1 = this.gameState.tableCards[0];
      const c2 = this.gameState.tableCards[1];

      if (!c1 || !c2) return;

      const winningCard = engine.getWinningCard(c1, c2, this.gameState.trunfoSuit, c1);
      const playerStarted = this.gameState.playerStartedTrick;
      let winnerIsPlayer = false;

      if (playerStarted) {
        winnerIsPlayer = (winningCard === c1);
      } else {
        winnerIsPlayer = (winningCard === c2);
      }

      const points = c1.rank.value + c2.rank.value;

      if (winnerIsPlayer) {
        this.gameState.playerScore += points;
      } else {
        this.gameState.botScore += points;
      }

      // Correção do Nome do Naipe
      const playerCardObj = playerStarted ? c1 : c2;
      const botCardObj = playerStarted ? c2 : c1;

      const getSuitName = (card) => {
        if (card.suit && card.suit.name) return card.suit.name;
        return card.suit || 'UNKNOWN';
      };

      const pSuit = getSuitName(playerCardObj);
      const bSuit = getSuitName(botCardObj);

      const pCardStr = `${playerCardObj.rank.name} of ${pSuit}`;
      const bCardStr = `${botCardObj.rank.name} of ${bSuit}`;

      const tricksInThisGame = this.trickHistory.filter(t => t.game_index === this.gameNumber).length + 1;

      this.trickHistory.push({
        game_index: this.gameNumber,
        trick: tricksInThisGame,
        winner: winnerIsPlayer ? "Player" : "Bot",
        points: points,
        player_card: pCardStr,
        bot_card: bCardStr
      });

      this.gameState.tableCards = [];
      this.gameState.playerStartedTrick = winnerIsPlayer;
      this.gameState.playerTurn = winnerIsPlayer;

      this.drawCards(winnerIsPlayer ? 'player' : 'bot');

      if (this.gameState.playerHand.length === 0 && this.gameState.botHand.length === 0) {
        this.endGame();
      } else if (!winnerIsPlayer) {
        setTimeout(() => {
          if (!this.gameState.gameFinished) this.handleBotTurn();
        }, 1000);
      }

      // Se o jogo não acabou, o jogador vai jogar de novo, então desbloqueamos.
      if (!this.gameState.gameFinished) {
        this.gameState.isProcessingMove = false;
      }
    },

    drawCards(winner) {
      const deck = this.gameState.deck;
      if (deck.length === 0) {
        this.gameState.trunfo = null;
        return;
      }
      const cardForWinner = deck.shift();
      const cardForLoser = deck.shift();

      if (winner === 'player') {
        if (cardForWinner) this.gameState.playerHand.push(cardForWinner);
        if (cardForLoser) this.gameState.botHand.push(cardForLoser);
      } else {
        if (cardForWinner) this.gameState.botHand.push(cardForWinner);
        if (cardForLoser) this.gameState.playerHand.push(cardForLoser);
      }
    },

    endGame() {
      this.gameState.gameFinished = true;
      this.gameState.isProcessingMove = true;

      const pScore = this.gameState.playerScore;
      const bScore = this.gameState.botScore;

      let pPoints = 0;
      let bPoints = 0;

      if (pScore === 120) { pPoints = 4; }
      else if (bScore === 120) { bPoints = 4; }
      else if (pScore > 90) { pPoints = 2; }
      else if (bScore > 90) { bPoints = 2; }
      else if (pScore > 60) { pPoints = 1; }
      else if (bScore > 60) { bPoints = 1; }
      else {
        this.lastGameResult = "Empate! Ninguém pontua.";
        return;
      }

      this.playerMatchScore += pPoints;
      this.botMatchScore += bPoints;
      this.gameNumber++;

      if (pPoints > 0) {
        this.lastGameResult = `Ganhaste! (+${pPoints} pts)`;
      } else {
        this.lastGameResult = `Perdeste... O Bot ganhou (+${bPoints} pts)`;
      }
    },

    forfeitMatch() {
      this.botMatchScore = 4;
      this.gameState.gameFinished = true;
      this.lastGameResult = "Desistência. Bot ganhou o match.";
      this.currentCoins -= 2;
    }
  }
});