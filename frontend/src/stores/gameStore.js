import { defineStore } from 'pinia';
import { useAuthStore } from './auth';
// Mantém os imports que tinhas. Certifica-te que o caminho para o Engine está certo.
import { BiscaEngine, Card, Suit, Rank } from '../lib/BiscaEngine'; 

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

  // console.log("Reviving card:", plainCard, "to Suit: ", suit, ", Rank: ", rank);
  if (suit && rank) {
    // console.log("Successfully revived card:", suit, rank);
    return new Card(suit, rank);
  }
  return plainCard; // Retorna o original se algo falhar
};

export const useGameStore = defineStore('game', {
    state: () => ({
        socket: null,
        games: [], // Adicionei este porque é usado no getter 'getMyGames'
        availableGames: [],
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
            playMode: 'match', // 'match' ou 'single_game'
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
            // Nota: Verifica se a propriedade é 'player1.id' ou 'creatorName' consoante o teu backend
            return state.games.filter(g => g.player1?.id === authStore.user.id && g.status === 'pending');
        },
        getAvailableGames: (state) => {
            const authStore = useAuthStore();
            if (!authStore.user) return state.availableGames; // Usa availableGames ou filtra state.games
            return state.games.filter(g => g.player1?.id !== authStore.user.id && g.status === 'pending');
        }
    },

    actions: {
        bindSocket(s) { this.socket = s; },
        setGames(games) { 
            this.games = games; // Guarda a lista completa
            this.availableGames = games; // Atualiza a lista disponível
        },

        // =========================================
        // LÓGICA SINGLE PLAYER
        // =========================================
        startSinglePlayerGame() {
            this.resetForNewPlay();
            this.isMultiplayer = false;
            // this.matchStartTime = Date.now(); // Comentei se não tiveres a variável no state

            // 1. Usar o Engine para baralhar e dar as cartas iniciais
            const initial = engine.initializeNewGame();

            this.gameState.deck = initial.deck;
            this.gameState.playerHand = initial.playerHand;
            this.gameState.botHand = initial.botHand;
            this.gameState.trunfo = initial.trunfo;
            this.gameState.trunfoSuit = initial.trunfoSuit;
            this.gameState.playerScore = 0;
            this.gameState.botScore = 0;
            this.gameState.tableCards = [];
            this.gameState.gameFinished = false;

            // Quem começa? (Simplificação: Jogador começa sempre no jogo 1 ou alternado)
            this.gameState.playerTurn = true;

            // 2. Ajuste para BISCA DE 9
            if (this.matchType === '9') {
                for (let i = 0; i < 6; i++) {
                    if (this.gameState.deck.length >= 2) {
                        this.gameState.playerHand.push(this.gameState.deck.pop());
                        this.gameState.botHand.push(this.gameState.deck.pop());
                    }
                }
            }

            // Ordenar mão do jogador
            this.sortHand();
        },

        async botPlay() {
            if (this.gameState.gameFinished) return;

            // Pequeno delay para parecer que o bot está a pensar
            setTimeout(() => {
                const botCard = this.gameState.botHand[0];

                // Remove da mão do bot
                this.gameState.botHand.shift();

                // Mete na mesa
                this.gameState.tableCards.push(botCard);

                // Se a mesa tiver 2 cartas, resolve a jogada
                if (this.gameState.tableCards.length === 2) {
                    this.resolveTrick();
                } else {
                    // Se o bot jogou primeiro, agora é a vez do jogador
                    this.gameState.playerTurn = true;
                    this.gameState.isProcessingMove = false;
                }
            }, 1000);
        },

        resolveTrick() {
            const card1 = this.gameState.tableCards[0];
            const card2 = this.gameState.tableCards[1];

            // Lógica para determinar quem jogou primeiro para efeitos de engine
            // Se não é a minha vez, significa que eu joguei (ou o engine assim o ditou)
            
            let playerWon = false;
            // Recalcula vencedor com o Engine
            // Nota: No SP assume-se playerTurn como indicador. 
            // Se playerTurn == false (bot a jogar), quem jogou a 1ª? 
            // Ajusta conforme a tua lógica original:
            
            const winningCard = engine.getWinningCard(card1, card2, this.gameState.trunfoSuit);
            
            // Simplificação baseada na tua lógica:
            if (this.gameState.playerTurn === false) {
                 // Bot jogou a 2ª carta. card1=Player, card2=Bot.
                 if (winningCard === card1) playerWon = true;
            } else {
                 // Player jogou a 2ª carta. card1=Bot, card2=Player.
                 if (winningCard === card2) playerWon = true;
            }

            // Pontos
            const points = engine.getCardPoints(card1) + engine.getCardPoints(card2);

            if (playerWon) {
                this.gameState.playerScore += points;
                this.lastGameResult = `Ganhaste a vaza! (+${points})`;
                this.gameState.playerTurn = true; // Vencedor joga a próxima
            } else {
                this.gameState.botScore += points;
                this.lastGameResult = `Bot ganhou a vaza. (+${points})`;
                this.gameState.playerTurn = false;
            }

            // Limpar mesa após delay curto
            setTimeout(() => {
                this.gameState.tableCards = [];
                this.drawPhase(playerWon); // Fase de pescar cartas
            }, 1500);
        },

        drawPhase(playerWon) {
            // Se o baralho acabou
            if (this.gameState.deck.length === 0) {
                if (this.gameState.playerHand.length === 0) {
                    this.finishSinglePlayerGame();
                } else {
                    if (!playerWon) this.botPlay();
                }
                return;
            }

            // Pescar cartas (Vencedor pesca primeiro)
            const c1 = this.gameState.deck.pop();
            const c2 = this.gameState.deck.pop(); 

            if (c1) {
                if (playerWon) {
                    this.gameState.playerHand.push(c1);
                    if (c2) this.gameState.botHand.push(c2);
                } else {
                    this.gameState.botHand.push(c1);
                    if (c2) this.gameState.playerHand.push(c2);
                }
            }

            this.sortHand();
            this.gameState.isProcessingMove = false;

            // Se o Bot ganhou, ele joga a próxima imediatamente
            if (!playerWon) {
                this.botPlay();
            }
        },

        finishSinglePlayerGame() {
            this.gameState.gameFinished = true;
            this.gameState.isProcessingMove = false;

            if (this.gameState.playerScore > 60) {
                this.playerMatchScore++;
                this.lastGameResult = "VITORIA!";
            } else if (this.gameState.playerScore < 60) {
                this.botMatchScore++;
                this.lastGameResult = "DERROTA...";
            } else {
                this.lastGameResult = "EMPATE";
            }
        },

        sortHand() {
            this.gameState.playerHand.sort((a, b) => {
                // Proteção se suit for null
                const suitA = a.suit?.name || a.suit || "";
                const suitB = b.suit?.name || b.suit || "";
                
                if (suitA !== suitB) return suitA.localeCompare(suitB);
                return (b.rank?.value || 0) - (a.rank?.value || 0);
            });
        },

        // =========================================
        // AÇÕES GERAIS / MULTIPLAYER
        // =========================================

        createGame(socket) {
            if (socket) {
                const authStore = useAuthStore();
                const user = authStore.user;
                const playerName = user?.nickname || user?.name || "Jogador";
                // console.log("Criando sala com o nome:", playerName);
                socket.emit('create-game', { playerName: playerName });
            }
        },

        cancelGame(socket, game) { 
            if (socket) socket.emit('cancel-game', game); 
        },

        // Métodos necessários para o socket.js funcionar (Adicionados/Corrigidos para sintaxe)
        generateAndShareInitialState(gameData) {
             // Precisas de importar useSocketStore dentro da ação ou passar como argumento
             // Vou assumir que o socket.js trata disto ou tens lógica aqui.
             // Para manter a tua lógica "igual", não vou adicionar código novo se não tinhas, 
             // mas o erro de sintaxe impedia de ver o resto.
             // Se esta função faltar, o socket.js vai dar erro.
             // Vou deixar o esqueleto caso tenhas apagado sem querer no copy-paste.
             const initial = engine.initializeNewGame();
             // ... lógica de emitir sync ...
        },
        
        updateStateFromServer(serverState) {
             // Lógica para atualizar o gameState com o que vem do servidor
             if (serverState.myHand) this.gameState.playerHand = serverState.myHand.map(reviveCard);
             if (serverState.table) this.gameState.tableCards = serverState.table.map(t => reviveCard(t.card || t));
             this.gameState.playerTurn = serverState.isMyTurn;
             // ... resto da atualização ...
        },

        handleOpponentMove(card) {
             const c = reviveCard(card);
             this.gameState.tableCards.push(c);
        },

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
                this.sortHand();
            }
            if (typeof deckCount === 'number') this.gameState.deck = new Array(deckCount).fill({});
        },

        opponentDrewCard(deckCount) {
            this.gameState.botHand.push({});
            if (typeof deckCount === 'number') this.gameState.deck = new Array(deckCount).fill({});
        },

        // JOGAR CARTA (Comum aos dois modos)
        playCard(card, socket) {
            if (this.gameState.isProcessingMove || !this.gameState.playerTurn) return;

            // Validação de assistir ao naipe (apenas se o baralho estiver vazio)
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

            // MULTIPLAYER
            if (this.isMultiplayer && this.multiplayerGame) {
                if (!this.socket && socket) this.socket = socket;
                // Limpa o objeto para enviar via socket
                const cleanCard = JSON.parse(JSON.stringify(card));
                
                // Emite o evento através do socket
                this.socket.emit('play-card', { gameId: String(this.multiplayerGame.id), card: cleanCard });

                // No multiplayer, removemos visualmente até o servidor confirmar
                this.gameState.playerHand = this.gameState.playerHand.filter(c => c.rank.name !== card.rank.name || c.suit !== card.suit);
                this.gameState.tableCards.push(card);
                this.gameState.playerTurn = false;
            }
            // SINGLE PLAYER
            else {
                this.gameState.playerHand = this.gameState.playerHand.filter(c => c.rank.name !== card.rank.name || c.suit !== card.suit);
                this.gameState.tableCards.push(card);

                // Se a mesa tem 2 cartas, resolve
                if (this.gameState.tableCards.length === 2) {
                    this.resolveTrick();
                } else {
                    // Se só tem 1 carta (a minha), agora é a vez do Bot
                    this.gameState.playerTurn = false;
                    this.botPlay();
                }
            }
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

        resetForNewPlay() {
            this.gameState = {
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
            };
            this.moveError = null;
        }
    }
});