import { defineStore } from 'pinia';
import { BiscaEngine } from '../lib/BiscaEngine';
import { Card, Suit, Rank } from '../lib/Card';
import { toast } from 'vue-sonner'
import { useAuthStore } from './auth';
import { useSocketStore } from './socket';

const engine = new BiscaEngine();

const reviveCard = (plainCard) => {
  if (!plainCard || plainCard instanceof Card) {
    return plainCard; // Já é uma instância ou é nulo
  }

  const suitValue = plainCard.suit.name || plainCard.suit;
  const rankObject = plainCard.rank;

  // Encontra o objeto Suit e Rank correspondente com base nos dados do objeto simples
  const suit = Object.values(Suit).find(s => s === suitValue);
  const rank = Object.values(Rank).find(r => r.name === rankObject.name);

  console.log("Reviving card:", plainCard, "to Suit: ", suit, ", Rank: ", rank);
  if (suit && rank) {
    console.log("Successfully revived card:", suit, rank);
    return new Card(suit, rank);
  }
  return plainCard; // Retorna o original se algo falhar
};

export const useGameStore = defineStore('game', {
  state: () => ({
    gameType: null, // 'singleplayer' ou 'multiplayer' (vai depender da rota em que o jogo é iniciado)
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
      isProcessingMove: false,
      playMode: 'match', // 'match' ou 'single_game'
    },

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
    biscaType: sessionStorage.getItem('biscaType') || '3',
    games: [],
    myGames: [],
    availableGames: [],

    // Dados para API
    matchStartTime: null,
    trickHistory: []
  }),

  getters: {
    getMyGames: (state) => {
      const authStore = useAuthStore();
      if (!authStore.currentUser) return [];
      return state.games.filter(g => g.player1.id === authStore.currentUser.id && g.status === 'pending');
    },
    getAvailableGames: (state) => {
      const authStore = useAuthStore();
      if (!authStore.currentUser) return state.games.filter(g => g.status === 'pending');
      return state.games.filter(g => g.player1.id !== authStore.currentUser.id && g.status === 'pending');
    }
  },

  actions: {
    createGame(playMode, biscaType) {

      const socketStore = useSocketStore();
      socketStore.emitCreateGame(
        playMode,
        biscaType
      );
    },
    joinGame(gameId) {
      const authStore = useAuthStore();
      if (!authStore.currentUser) {
        toast.error('You must be logged in to join a game');
        return;
      }
      console.log('[GameStore] Joining game with ID:', gameId, ' and Im going to the socketStore.emitJoinGame()');
      const socketStore = useSocketStore();
      socketStore.emitJoinGame(gameId);
    },

    cancelGame(gameId) {
      const socketStore = useSocketStore();
      // Vamos criar uma função na socketStore para manter o padrão
      socketStore.emitCancelGame(gameId);
    },

    refreshGamesList() {
      const socketStore = useSocketStore();
      socketStore.emitGetGames();
    },
    // Adicione esta ação para garantir que o estado é atualizado corretamente
    setGames(games) {
      // Log de depuração para ver a estrutura real do objeto
      if (games.length > 0) {
        console.log("[GameStore] Inspecting last game object from server:", JSON.parse(JSON.stringify(games[games.length - 1])));
      }
      this.games = games;
      // Atualiza também as propriedades diretas para evitar qualquer problema de reatividade
      const authStore = useAuthStore();
      const pendingGames = games.filter(g => g.status === 'Pending');

      if (!authStore.currentUser) {
        this.myGames = [];
        this.availableGames = pendingGames;
        return;
      }
      // Filtra os jogos criados pelo utilizador atual que estão à espera de um oponente
      this.myGames = pendingGames.filter(g => g.player1.id === authStore.currentUser.id);

      // Filtra os jogos criados por outros utilizadores que estão à espera de um oponente
      this.availableGames = pendingGames.filter(g => g.player1.id !== authStore.currentUser.id);

      console.log(`[GameStore] Games updated. My games: ${this.myGames.length}, Available: ${this.availableGames.length}`);
    },

    setGameType(type) {
      if (type === 'singleplayer' || type === 'multiplayer') {
        this.gameType = type;
      }
    },

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

    setBiscaType(type) {
      this.biscaType = type;
      // --- GUARDA NA SESSÃO ---
      sessionStorage.setItem('biscaType', type);
    },

    startGame(gameType, playMode, biscaType) {
      this.setGameType(gameType);
      this.setPlayMode(playMode);
      this.setBiscaType(biscaType);
      if (gameType === "singleplayer") {
        this.startSinglePlayerGame(); // Chama a lógica antiga
      } else {
        // CORREÇÃO: Em vez de emitir um evento inválido,
        // chamamos a ação 'createGame' que já existe e funciona corretamente.
        console.log(`[GameStore] 'startGame' in multiplayer mode is calling 'createGame'...`);
        this.createGame(playMode, biscaType);
      }
    },

    startSinglePlayerGame() {
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
      const targetHandSize = this.biscaType === '9' ? 9 : 3;

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


      if (this.gameType === 'singleplayer') {
        this.gameState.isProcessingMove = true;
        this.processPlayerMove(card); // Lógica antiga
      } else {
        // Para multiplayer, apenas emitimos a jogada.
        // O servidor validará e enviará o novo estado.
        const socket = useSocketStore();
        socket.emitPlayMove({ gameId: this.gameState.id, card: card });
        const cardIndex = this.gameState.playerHand.findIndex(c =>
          c.rank.name === card.rank.name && c.suit === card.suit
        );
        if (cardIndex > -1) {
          this.gameState.playerHand.splice(cardIndex, 1);
        }

        this.gameState.tableCards.push(card);
        this.gameState.playerTurn = false;

        if (this.gameState.tableCards.length === 2) {
          this.gameState.isProcessingMove = true; // Bloqueia para resolver a vaza
          setTimeout(() => {
            this.resolveTrick();
          }, 1000);
        }
      }
    },

    //MULTIPLAYER (tudo o que tem bot é o player2)
    generateAndShareInitialState(gameData) {
      console.log('[GameStore] Generating initial state for multiplayer game...');
      // Se for o início do match, reseta tempos e histórico
      if (this.gameNumber === 1 && this.playerMatchScore === 0 && this.botMatchScore === 0) {
        this.matchStartTime = Date.now();
        this.trickHistory = [];
      }

      // 1. REUTILIZA A LÓGICA DE 'startSinglePlayerGame' PARA GERAR O ESTADO
      const newStateFromEngine = engine.initializeNewGame();

      //Pelo que percebi, o socket "destrói" o objeto Card do BiscaEngine, então temos de o "normalizar"

      if (newStateFromEngine.trunfo) {
        newStateFromEngine.deck.push(newStateFromEngine.trunfo);
      }

      const targetHandSize = gameData.biscaType === '9' ? 9 : 3;

      const adjustHand = (hand, deck) => {
        while (hand.length < targetHandSize && deck.length > 0) {
          hand.push(deck.shift());
        }
        while (hand.length > targetHandSize) {
          deck.unshift(hand.pop());
        }
      };

      adjustHand(newStateFromEngine.playerHand, newStateFromEngine.deck);
      adjustHand(newStateFromEngine.botHand, newStateFromEngine.deck);

      newStateFromEngine.playerHand.sort((a, b) => {
        const sA = a.suit.name || a.suit;
        const sB = b.suit.name || b.suit;
        if (sA !== sB) return sA.localeCompare(sB);
        return b.rank.value - a.rank.value;
      });

      const fullGameState = {
        ...gameData, // id, player1, player2, status, playMode, biscaType
        ...newStateFromEngine, // deck, playerHand, botHand, trunfo, playerTurn, etc.
        playerScore: 0,
        botScore: 0,
        gameFinished: false,
        isProcessingMove: false,
        // Adicionar propriedades em falta de startSinglePlayerGame
        isChoosingTrunfo: true,
        lastGameResult: "",
        // Garante que o modo de jogo está no estado partilhado
        playMode: gameData.playMode,
      };

      // // 3. ATUALIZA A SUA PRÓPRIA STORE (O JOGADOR 1 FICA PRONTO)
      this.updateStateFromServer(fullGameState);

      // // 4. PEDE À SOCKETSTORE PARA PARTILHAR ESTE ESTADO COM O SERVIDOR
      const socketStore = useSocketStore();
      socketStore.emitSyncInitialState(fullGameState);
    },

    updateStateFromServer(serverState) {
      console.log("[GameStore] Updating state from server. Reviving Card instances...");

      // --- CORREÇÃO: REIDRATAÇÃO ---
      // Percorre todas as coleções de cartas e converte cada objeto simples numa instância de Card.
      const rehydratedState = { ...serverState };
      rehydratedState.deck = rehydratedState.deck.map(reviveCard);
      rehydratedState.playerHand = rehydratedState.playerHand.map(reviveCard);
      rehydratedState.botHand = rehydratedState.botHand.map(reviveCard);
      rehydratedState.tableCards = rehydratedState.tableCards.map(reviveCard);
      rehydratedState.trunfo = reviveCard(rehydratedState.trunfo);

      // Atribui o estado reidratado
      this.gameState = rehydratedState;
      this.playMode = rehydratedState.playMode;
      this.biscaType = rehydratedState.biscaType;
      this.gameType = 'multiplayer';
    },

    // SINGLEPLAYER AÇÃO INTERNA - Contém a lógica do jogo
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

    //MULTIPLAYER
    handleOpponentMove(card) {
      // Verifica se o jogo está em modo multiplayer
      if (this.gameType !== 'multiplayer' || this.gameState.isProcessingMove) {
        return;
      }

      console.log('[GameStore] Handling opponent move with plain object:', card);

      // --- CORREÇÃO: Reidratar a carta recebida ---
      const revivedCard = reviveCard(card);
      if (!revivedCard || !(revivedCard instanceof Card)) {
        console.error("Failed to revive opponent's card:", card);
        this.gameState.isProcessingMove = false;
        return; // Aborta se a carta não puder ser recriada
      }
      console.log('[GameStore] Revived opponent card instance:', revivedCard);

      // Encontra a carta na mão do oponente (que está em 'botHand' no seu estado)
      // e remove-a. Agora comparamos com a instância recriada.
      const cardIndex = this.gameState.botHand.findIndex(c => c.suit === revivedCard.suit.name && c.rank === revivedCard.rank.name);
      if (cardIndex > -1) {
        this.gameState.botHand.splice(cardIndex, 1);
      }

      // Adiciona a INSTÂNCIA da carta à mesa
      this.gameState.tableCards.push(revivedCard);

      // Muda o turno para o jogador local
      this.gameState.playerTurn = true;

      // Se agora há 2 cartas na mesa, a vaza terminou.
      if (this.gameState.tableCards.length === 2) {
        // A sua função resolveTrick já contém a lógica para determinar o vencedor da vaza,
        // contar pontos e dar as cartas seguintes. Podemos reutilizá-la.
        setTimeout(() => {
          this.resolveTrick();
        }, 1000); // Um pequeno atraso para que os jogadores possam ver a jogada
      } else {
        // Se a vaza ainda não terminou, apenas liberta o processamento.
        this.gameState.isProcessingMove = false;
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

      if (this.gameType === 'multiplayer') {
        const winnerId = winnerIsPlayer ? this.gameState.player1.id : this.gameState.player2.id;
        this.gameState.currentPlayerId = winnerId;
      }

      this.drawCards(winnerIsPlayer ? 'player' : 'bot');

      if (this.gameState.playerHand.length === 0 && this.gameState.botHand.length === 0) {
        this.endGame();
      } else if (!winnerIsPlayer) {
        setTimeout(() => {
          if (!this.gameState.gameFinished) this.handleBotTurn();
        }, 1000);
      }

      this.gameState.isProcessingMove = false;
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
      if (this.gameType === 'singleplayer') {
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
          this.lastGameResult = `Perdeste... O Bot ganhou (-${bPoints} pts)`;
        }
      }
      else {
        console.log('[GameStore] Multiplayer game finished. Notifying server.');
        const socketStore = useSocketStore();
        socketStore.emitDeclareEnd(this.gameState.id);
      }
    },

    async saveGame() {
      // Só guarda se for um jogo multiplayer que tenha terminado
      if (this.gameType !== 'multiPlayer' || !this.gameState.gameFinished) {
        return;
      }

      const apiStore = useAPIStore();
      const authStore = useAuthStore();

      // Dados comuns a ambos os modos
      const player1 = this.gameState.player1;
      const player2 = this.gameState.player2;
      const winner = this.gameState.winner; // Assumindo que o servidor envia o objeto do vencedor
      const loser = winner.id === player1.id ? player2 : player1;
      const endedAt = new Date();
      const totalTime = this.matchStartTime ? Math.round((endedAt.getTime() - this.matchStartTime) / 1000) : 0;

      if (this.playMode === 'match') {
        // --- LÓGICA PARA GUARDAR UM MATCH COMPLETO ---
        const matchData = {
          type: this.biscaType,
          player1_user_id: player1.id,
          player2_user_id: player2.id,
          winner_user_id: winner.id,
          loser_user_id: loser.id,
          status: 'Ended',
          stake: 1, // Exemplo: pode vir do estado do jogo se for variável
          began_at: this.matchStartTime ? new Date(this.matchStartTime).toISOString() : null,
          ended_at: endedAt.toISOString(),
          total_time: totalTime,
          player1_marks: this.playerMatchScore,
          player2_marks: this.botMatchScore, // Nota: 'botMatchScore' deve ser renomeado para 'player2MatchScore'
          player1_points: this.gameState.playerScore, // Pontos do último jogo
          player2_points: this.gameState.botScore,    // Pontos do último jogo
        };

        try {
          console.log('[GameStore] Saving match data to DB:', matchData);
          await apiStore.post('/matches', matchData); // Endpoint de exemplo
          toast.success('Match results saved!');
        } catch (error) {
          console.error('Failed to save match data:', error);
          toast.error('Could not save match results.');
        }

      } else {
        // --- LÓGICA PARA GUARDAR UM SINGLE GAME ---
        const gameData = {
          type: this.biscaType,
          player1_user_id: player1.id,
          player2_user_id: player2.id,
          is_draw: this.gameState.playerScore === 60,
          winner_user_id: this.gameState.playerScore !== 60 ? winner.id : null,
          loser_user_id: this.gameState.playerScore !== 60 ? loser.id : null,
          match_id: null, // Não faz parte de um match
          status: 'Ended',
          began_at: this.matchStartTime ? new Date(this.matchStartTime).toISOString() : null,
          ended_at: endedAt.toISOString(),
          total_time: totalTime,
          player1_points: this.gameState.playerScore,
          player2_points: this.gameState.botScore,
        };

        try {
          console.log('[GameStore] Saving single game data to DB:', gameData);
          await apiStore.post('/games', gameData); // Endpoint de exemplo
          toast.success('Game results saved!');
        } catch (error) {
          console.error('Failed to save single game data:', error);
          toast.error('Could not save game results.');
        }
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