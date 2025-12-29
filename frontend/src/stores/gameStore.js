import { defineStore } from 'pinia';
import { BiscaEngine } from '../lib/BiscaEngine';
import { useAuthStore } from './auth';

const engine = new BiscaEngine();

export const useGameStore = defineStore('game', {
  state: () => ({
    socket: null,
    availableGames: [],
    multiplayerGame: null,
    isMultiplayer: false,

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
      isProcessingMove: false
    },
    
    playMode: 'match',
    playerMatchScore: 0,
    botMatchScore: 0,
    gameNumber: 1,
    lastGameResult: "",
    moveError: null,
    matchType: '3'
  }),

  actions: {
    bindSocket(s) { this.socket = s; },
    setGames(games) { this.availableGames = games; },
    
    createGame(socket) { 
        if (socket) {
            const authStore = useAuthStore();
            
            // 1. Tenta obter o utilizador de várias formas para garantir que não falha
            const user = authStore.user;
            
            // 2. Procura o nome em todas as propriedades possíveis (nickname, name, ou username)
            // Se o teu campo na base de dados se chamar 'username', ele vai apanhar agora
            const playerName = user?.nickname || user?.name || user?.username || "Jogador " + Math.floor(Math.random() * 1000);
            
            console.log("Criando sala com o nome:", playerName); // Verifica isto na consola (F12)

            socket.emit('create-game', { playerName: playerName }); 
        }
    },
    
    cancelGame(socket, game) { if (socket) socket.emit('cancel-game', game); },

    setupMultiplayerMatch(data) {
        this.$reset();
        this.socket = data.socket;
        this.isMultiplayer = true;
        this.multiplayerGame = { id: String(data.gameId) };
        this.gameState.playerHand = data.hand;
        this.gameState.trunfo = data.trunfo;
        this.gameState.trunfoSuit = data.trunfo.suit;
        this.gameState.deck = new Array(data.deckCount).fill({}); 
        this.gameState.botHand = new Array(3).fill({}); 
        this.gameState.playerTurn = data.myTurn;
    },

    addCardToHand(card, deckCount) {
        if (card) {
            this.gameState.playerHand.push(card);
            this.gameState.playerHand.sort((a, b) => {
                const sA = a.suit || '';
                const sB = b.suit || '';
                if (sA !== sB) return sA.localeCompare(sB);
                return (b.rank.value || 0) - (a.rank.value || 0);
            });
        }
        if (typeof deckCount === 'number') this.gameState.deck = new Array(deckCount).fill({});
    },

    opponentDrewCard(deckCount) {
        this.gameState.botHand.push({}); 
        if (typeof deckCount === 'number') this.gameState.deck = new Array(deckCount).fill({});
    },

    playCard(card, socket) {
      if (this.gameState.isProcessingMove || !this.gameState.playerTurn) return;

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
      if (!this.socket && socket) this.socket = socket;

      if (this.isMultiplayer && this.multiplayerGame) {
         const cleanCard = JSON.parse(JSON.stringify(card));
         this.socket.emit('play-card', { gameId: String(this.multiplayerGame.id), card: cleanCard });
      }
      this.processPlayerMove(card);
    },

    async processPlayerMove(card) {
      this.gameState.playerHand = this.gameState.playerHand.filter(c => c.code !== card.code);
      this.gameState.tableCards.push(card);
      this.gameState.playerTurn = false; 
    },

    onOpponentMove(card) {
      if (this.gameState.botHand.length > 0) this.gameState.botHand.pop();
      this.gameState.tableCards.push(card);

      if (this.gameState.tableCards.length === 1) {
          this.gameState.playerTurn = true;
          this.gameState.isProcessingMove = false;
      }
    },

    handleServerTrickResult(data, mySocketId) {
        const amIWinner = (data.winnerId === mySocketId);
        
        this.gameState.tableCards = []; 
        this.gameState.playerTurn = (data.nextTurn === mySocketId);
        this.gameState.isProcessingMove = false; 

        if (amIWinner) this.gameState.playerScore += data.pointsInTrick;
        else this.gameState.botScore += data.pointsInTrick;
    },

    handleGameEnd(result, mySocketId) {
        this.gameState.gameFinished = true;
        const amIWinner = (result.winnerId === mySocketId);
        
        if (amIWinner) {
             const pts = (result.p1Score > result.p2Score) ? result.p1MatchPoints : result.p2MatchPoints;
             this.playerMatchScore += pts;
             this.lastGameResult = `VITÓRIA! (+${pts} pts)`;
        } else {
             const pts = (result.p1Score > result.p2Score) ? result.p1MatchPoints : result.p2MatchPoints;
             this.botMatchScore += pts;
             this.lastGameResult = "DERROTA...";
        }
        
        this.gameState.playerScore = amIWinner ? Math.max(result.p1Score, result.p2Score) : Math.min(result.p1Score, result.p2Score);
        this.gameState.botScore = !amIWinner ? Math.max(result.p1Score, result.p2Score) : Math.min(result.p1Score, result.p2Score);
    },

    resetForNewPlay() { this.$reset(); }
  }
});