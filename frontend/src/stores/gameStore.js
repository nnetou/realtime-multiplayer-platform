import { defineStore } from 'pinia';
import { BiscaEngine } from '../lib/BiscaEngine'; // Confirma se o caminho para a tua lib está correto
import { Rank } from '../lib/Card';

const engine = new BiscaEngine();

export const useGameStore = defineStore('game', {
  state: () => ({
    // Estado de um jogo individual (uma mão)
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
      playerStartedTrick: true, // Importante: controla quem jogou a 1ª carta da vaza
      gameFinished: false
    },
    // Estado da partida inteira (Match)
    playerMatchScore: 0,
    botMatchScore: 0,
    gameNumber: 1,
    currentCoins: 100,
    moveError: null,
    isChoosingTrunfo: false,
    cardSkinUrl: '/assets/card_back.png', // Pode ser sobrescrito pela View se usares API
    lastGameResult: "" // Guarda a mensagem de quem ganhou o último jogo
  }),

  actions: {
    startNextGame() {
      // Inicializa um novo jogo usando o motor
      const newState = engine.initializeNewGame();
      
      // Se houver trunfo, adicionamo-lo visualmente ao fundo do deck
      // (A lógica interna já o removeu, mas visualmente queremos vê-lo)
      if (newState.trunfo) {
        newState.deck.push(newState.trunfo);
      }

      this.gameState = newState;
      this.isChoosingTrunfo = true;
      this.lastGameResult = ""; // Limpa a mensagem anterior
    },

    confirmStartGame() {
      this.isChoosingTrunfo = false;
      // Se for a vez do bot (ex: perdeu o jogo anterior), ele joga
      if (!this.gameState.playerTurn) {
        this.handleBotTurn();
      }
    },

    async handlePlayerCardPlayed(card) {
      // Se não for a vez do jogador ou o jogo acabou, ignora
      if (!this.gameState.playerTurn || this.gameState.gameFinished) return;

      const cardOnTable = this.gameState.tableCards[0];
      
      // Validação de Naipe (apenas se o deck estiver vazio e houver carta na mesa)
      if (this.gameState.deck.length === 0 && cardOnTable) {
        const isValid = engine.isMoveValid(card, this.gameState.playerHand, cardOnTable);
        if (!isValid) {
          this.moveError = "Tens de assistir ao naipe!";
          setTimeout(() => this.moveError = null, 2000);
          return;
        }
      }

      // 1. Remove da mão do jogador
      this.gameState.playerHand = this.gameState.playerHand.filter(c => c !== card);
      // 2. Coloca na mesa
      this.gameState.tableCards.push(card);
      // 3. Passa a vez
      this.gameState.playerTurn = false;

      // Se já houver 2 cartas na mesa, resolve a vaza
      if (this.gameState.tableCards.length === 2) {
        await new Promise(r => setTimeout(r, 1000)); // Pequeno delay para veres a carta
        this.resolveTrick();
      } else {
        // Se for a 1ª carta, o bot responde a seguir
        await new Promise(r => setTimeout(r, 500));
        this.handleBotTurn();
      }
    },

    async handleBotTurn() {
      if (this.gameState.gameFinished) return;

      // Pede ao motor a jogada do bot
      const botCard = engine.getBotMove(this.gameState);
      
      // 1. Remove da mão do bot
      this.gameState.botHand = this.gameState.botHand.filter(c => c !== botCard);
      // 2. Coloca na mesa
      this.gameState.tableCards.push(botCard);
      // 3. Passa a vez
      this.gameState.playerTurn = true;

      // Se já houver 2 cartas, resolve
      if (this.gameState.tableCards.length === 2) {
        await new Promise(r => setTimeout(r, 1000));
        this.resolveTrick();
      }
    },

    resolveTrick() {
      const c1 = this.gameState.tableCards[0]; // 1ª carta jogada
      const c2 = this.gameState.tableCards[1]; // 2ª carta jogada
      
      if (!c1 || !c2) return;

      // --- 1. Determinar quem ganhou ---
      const winningCard = engine.getWinningCard(c1, c2, this.gameState.trunfoSuit, c1);
      
      const playerStarted = this.gameState.playerStartedTrick;
      let winnerIsPlayer = false;

      // Se o Player começou, c1 é dele. Se c1 ganha, Player ganha.
      // Se o Bot começou, c1 é do Bot. Se c1 ganha, Bot ganha.
      if (playerStarted) {
        winnerIsPlayer = (winningCard === c1);
      } else {
        winnerIsPlayer = (winningCard === c2);
      }

      // --- 2. Calcular Pontos ---
      // Soma o valor das duas cartas (A=11, 7=10, K=4, J=3, Q=2, Resto=0)
      const points = c1.rank.value + c2.rank.value;

      if (winnerIsPlayer) {
        this.gameState.playerScore += points;
      } else {
        this.gameState.botScore += points;
      }

      // --- 3. Limpar e Preparar Próxima Vaza ---
      this.gameState.tableCards = [];
      this.gameState.playerStartedTrick = winnerIsPlayer; // Quem ganha joga primeiro
      this.gameState.playerTurn = winnerIsPlayer;
      
      // --- 4. Pescar Cartas (Draw) ---
      this.drawCards(winnerIsPlayer ? 'player' : 'bot');

      // --- 5. Verificar Fim de Jogo ---
      // Se não há mais cartas nas mãos, o jogo acabou
      if (this.gameState.playerHand.length === 0 && this.gameState.botHand.length === 0) {
        this.endGame();
      } else if (!winnerIsPlayer) {
        // Se o bot ganhou a vaza, ele joga imediatamente a próxima carta (após delay)
        setTimeout(() => {
             if (!this.gameState.gameFinished) this.handleBotTurn();
        }, 1000);
      }
    },

    drawCards(winner) {
       const deck = this.gameState.deck;
       
       // Se o deck estiver vazio, removemos visualmente o trunfo (se ainda lá estiver)
       if (deck.length === 0) {
           this.gameState.trunfo = null; 
           return;
       }

       // Bisca: Quem ganha a vaza pesca a primeira carta do topo
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
       
       const pScore = this.gameState.playerScore;
       const bScore = this.gameState.botScore;
       
       // --- Lógica de Pontos da Partida (Match Points) ---
       let pPoints = 0;
       let bPoints = 0;

       if (pScore === 120) { pPoints = 4; }         // Bandeira (120-0)
       else if (bScore === 120) { bPoints = 4; }
       else if (pScore > 90) { pPoints = 2; }       // Capote (>90)
       else if (bScore > 90) { bPoints = 2; }
       else if (pScore > 60) { pPoints = 1; }       // Vitória Simples (>60)
       else if (bScore > 60) { bPoints = 1; }
       else { 
           // Empate 60-60
           this.lastGameResult = "Empate! Ninguém pontua.";
           return; 
       }

       this.playerMatchScore += pPoints;
       this.botMatchScore += bPoints;
       this.gameNumber++; // Avança para o próximo jogo

       // Define mensagem para o utilizador ver no modal
       if (pPoints > 0) {
           this.lastGameResult = `Ganhaste! (+${pPoints} pts)`;
       } else {
           this.lastGameResult = `Perdeste... O Bot ganhou (+${bPoints} pts)`;
       }
    }
  }
});