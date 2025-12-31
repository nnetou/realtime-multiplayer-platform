import { defineStore } from 'pinia';
import { BiscaEngine } from '../lib/BiscaEngine'; // Confirma se o caminho está certo!
import { useAuthStore } from './auth';

// Instância do motor de jogo
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
        matchType: '3', // '3' ou '9'
        matchStartTime: null
    }),

    actions: {
        bindSocket(s) { this.socket = s; },
        setGames(games) { this.availableGames = games; },

        // =========================================
        // LÓGICA SINGLE PLAYER (NOVA)
        // =========================================
        startSinglePlayerGame() {
            this.resetForNewPlay();
            this.isMultiplayer = false;
            this.matchStartTime = Date.now();

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
            // O engine dá 3 cartas por defeito. Se for de 9, damos mais 6 a cada um.
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
                // O engine decide a carta do bot (neste caso, joga a primeira válida)
                // Podes melhorar isto no BiscaEngine.js depois
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

            // Quem jogou a primeira carta?
            // Se foi a vez do jogador e ele jogou, a carta 1 é dele? Não necessariamente.
            // Lógica: Se o jogador jogou e a mesa tinha 0 cartas, card1 é Player.
            // Vamos assumir que quem ganhou a vaza anterior (ou começou o jogo) jogou a card1.

            // Para simplificar, precisamos saber quem jogou a primeira carta da mesa.
            // No Single Player: 
            // Se playerTurn era TRUE antes de jogar, Player jogou a 1ª? Depende da ordem.

            // CORREÇÃO: Vamos usar a flag `playerTurn` para saber quem vai ganhar a próxima.
            // Mas a `playerTurn` muda durante a jogada.
            // Vamos inferir pelo fluxo: 
            // Se eu joguei a 2ª carta, a 1ª era do Bot.
            // Se o Bot jogou a 2ª carta, a 1ª era minha.

            let playerPlayedFirst = !this.gameState.playerTurn; // Se agora é a vez de ninguém (resolução), e o último a jogar foi quem completou.

            // Espera... A lógica mais sólida é:
            // O `playCard` mete a carta e passa o turno.
            // Se a mesa tem 2 cartas, chamamos o resolve.

            // Vamos recalcular o vencedor usando o Engine
            const winningCard = engine.getWinningCard(card1, card2, this.gameState.trunfoSuit, card1);

            let playerWon = false;

            // Se a carta vencedora for igual a uma das cartas que eu joguei... 
            // Problema: Objetos diferentes. Comparar por naipe e rank.
            const isCard1Player = (this.gameState.playerTurn === false); // Se estou a resolver e não é a minha vez, fui eu que joguei a ultima? Não.

            // Vamos simplificar:
            // No `playCard` (Player) -> Adiciona à mesa. Se mesa=2, resolve. (Player jogou em 2º)
            // No `botPlay` (Bot) -> Adiciona à mesa. Se mesa=2, resolve. (Bot jogou em 2º)

            if (this.gameState.playerTurn === false) {
                // O bot acabou de jogar (botPlay chamou resolve). O Bot jogou a 2ª carta.
                // Logo Card1 = Player, Card2 = Bot.
                if (winningCard === card1) playerWon = true; // Player ganhou (jogou a 1ª)
                else playerWon = false; // Bot ganhou (jogou a 2ª e venceu)
            } else {
                // O player acabou de jogar (playCard chamou resolve). O Player jogou a 2ª carta.
                // Logo Card1 = Bot, Card2 = Player.
                if (winningCard === card2) playerWon = true; // Player ganhou (jogou a 2ª e venceu)
                else playerWon = false; // Bot ganhou (jogou a 1ª)
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
            // Se o baralho acabou, verifica se o jogo acabou
            if (this.gameState.deck.length === 0) {
                if (this.gameState.playerHand.length === 0) {
                    this.finishSinglePlayerGame();
                } else {
                    // Jogo continua sem pescar, quem ganhou joga
                    if (!playerWon) this.botPlay();
                }
                return;
            }

            // Pescar cartas (Vencedor pesca primeiro)
            const c1 = this.gameState.deck.pop();
            const c2 = this.gameState.deck.pop(); // Pode ser undefined se for a última (trunfo já saiu?) 
            // Nota: O trunfo está no fundo, mas numa array normal o fundo é o index 0 ou length-1?
            // No initializeNewGame: trunfo = deck[0]. O baralho deve ser puxado do fim.

            // Se só sobrar uma carta (o trunfo)
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

            // Se o Bot ganhou, ele joga a próxima imediatamente (após o delay da mesa)
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
                if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
                return b.rank.value - a.rank.value;
            });
        },

        // =========================================
        // AÇÕES GERAIS / MULTIPLAYER
        // =========================================

        createGame(socket) {
            if (socket) {
                const authStore = useAuthStore();
                const user = authStore.user;
                const playerName = user?.nickname || user?.name || user?.username || "Jogador";
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
                // Usar o engine para validar
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
                const cleanCard = JSON.parse(JSON.stringify(card));
                this.socket.emit('play-card', { gameId: String(this.multiplayerGame.id), card: cleanCard });

                // No multiplayer, a resposta vem do servidor, apenas removemos da mão visualmente
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
            // Reset manual do gameState para não perder as pontuações do Match
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
                isProcessingMove: false
            };
            this.moveError = null;
        }
    }
});