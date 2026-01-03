<?php

namespace App\Http\Controllers;

use App\Models\Game;
use App\Models\MatchModel;
use App\Models\User;
use App\Models\CoinTransaction;
use App\Models\CoinTransactionType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;

class GameController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $query = Game::where(function ($q) use ($userId) {
            $q->where('player1_user_id', $userId)
                ->orWhere('player2_user_id', $userId);
        });

        if ($request->has('result')) {
            if ($request->result === 'win') {
                $query->where('winner_user_id', $userId);
            } elseif ($request->result === 'loss') {
                $query->whereNotNull('winner_user_id')
                    ->where('winner_user_id', '!=', $userId);
            }
        }

        if ($request->has('date_from') && !empty($request->date_from)) {
            $query->whereDate('began_at', $request->date_from);
        }

        return $query->with(['games', 'player1', 'player2', 'winner'])
            ->orderBy('id', 'desc')
            ->get();
    }

    public function createMultiplayerGame(Request $request)
    {
        $playerPending = User::firstOrCreate(['nickname' => 'PlayerPending'], ['name' => 'Waiting Player', 'email' => 'bot@sys.com', 'password' => '123', 'type' => 'P']);

        $validated = $request->validate([
            'player1_user_id' => 'required|integer|exists:users,id',
            'game_type' => 'required|in:3,9',
            'play_mode' => 'required|string',
        ]);

        try {
            $game = new Game();
            $game->player1_user_id = $validated['player1_user_id'];
            $game->player2_user_id = $playerPending->id; // Jogador temporário
            $game->status = 'Pending'; // Estado inicial
            //$game->bet_amount = $validated['bet_amount'];
            $game->type = $validated['game_type'];
            $game->began_at = now(); // Marcar quando foi criado

            $game->save();

            // Retorna o jogo recém-criado com o seu ID da base de dados
            Log::info('✅ Jogo criado e guardado na base de dados:', $game->toArray());
            return response()->json($game, 201);

        } catch (\Exception $e) {
            Log::error("Erro ao criar jogo multiplayer: " . $e->getMessage());
            return response()->json(['error' => 'Não foi possível criar o jogo.', $e->getMessage()], 500);
        }
    }

    //MUDAR A FUNÇÃO DE EMPATE, PORQUE O WINNER E LOSER PODEM SER NULL
    // public function store(Request $request)
    // {
    //     // ... (MANTÉM A TUA FUNÇÃO STORE ORIGINAL AQUI - NÃO VOU REPETIR PARA POUPAR ESPAÇO) ...
    //     // Se precisares dela completa, avisa, mas podes manter a que já tinhas para o Singleplayer.
    //     // Vou assumir que o código que mandaste para o store() continua aqui igual.

    //     // --- CÓDIGO DO STORE QUE MANDASTE ANTES ---
    //     $validated = $request->validate([
    //         'player_score' => 'required|integer',
    //         'opponent_score' => 'required|integer',
    //         'winner' => 'required|string',
    //         'duration_seconds' => 'required|integer',
    //         'type' => 'nullable|string',
    //         'custom' => 'nullable|array',
    //         'player2_id' => 'nullable|integer|exists:users,id',
    //     ]);

    //     $user = $request->user();
    //     $entryFee = 2;
    //     $isSimulation = isset($validated['custom']['coins_change']);
    //     $simulationDelta = $isSimulation ? (int) $validated['custom']['coins_change'] : 0;

    //     if ($user->coins_balance < $entryFee && $simulationDelta < 0) {
    //         return response()->json(['error' => 'Saldo insuficiente.', 'required_coins' => $entryFee], 402);
    //     }

    //     $player2 = null;
    //     if (!empty($validated['player2_id'])) {
    //         $player2 = User::find($validated['player2_id']);
    //     } else {
    //         Log::error('Player 2 ID não fornecido para jogo multiplayer.');
    //     }

    //     try {
    //         return DB::transaction(function () use ($validated, $user, $player2, $simulationDelta) {
    //             $game = new Game();
    //             $rawType = $validated['type'] ?? '3';
    //             if (in_array($rawType, ['3', 'bisca_3'])) {
    //                 $game->type = '3';
    //             } elseif (in_array($rawType, ['9', 'bisca_9'])) {
    //                 $game->type = '9';
    //             } else {
    //                 $game->type = $rawType;
    //             }

    //             $game->status = 'Ended';
    //             $game->player1_user_id = $user->id;
    //             $game->player2_user_id = $player2->id;
    //             $game->timestamps = false;

    //             if ($validated['winner'] === 'player') {
    //                 $game->winner_user_id = $user->id;
    //                 $game->loser_user_id = $player2->id;
    //             } else {
    //                 $game->loser_user_id = $user->id;
    //                 $game->winner_user_id = $player2->id;
    //             }

    //             $game->player1_marks = $validated['player_score'];
    //             $game->player2_marks = $validated['opponent_score'];
    //             $game->total_time = $validated['duration_seconds'];
    //             $game->began_at = now()->subSeconds($validated['duration_seconds']);
    //             $game->ended_at = now();
    //             $game->stake = $simulationDelta;
    //             $game->save();

    //             // Gravar Game (Trick breakdown) se existir
    //             if (!empty($validated['custom']['trick_breakdown'])) {
    //                 // ... (Tua lógica de tricks mantida) ...
    //             }

    //             // Transação de moedas
    //             if ($simulationDelta != 0) {
    //                 $typeName = ($simulationDelta > 0) ? 'Bonus' : 'Game fee';
    //                 $transType = CoinTransactionType::where('name', $typeName)->first() ?? CoinTransactionType::first();
    //                 CoinTransaction::create([
    //                     'user_id' => $user->id,
    //                     'match_id' => $game->match_id,
    //                     'coin_transaction_type_id' => $transType->id,
    //                     'coins' => abs($simulationDelta),
    //                     'transaction_datetime' => now(),
    //                     'custom' => ['source' => 'game_result']
    //                 ]);
    //             }

    //             $user->coins_balance += $simulationDelta;
    //             $user->save();
    //             return $game;
    //         });
    //     } catch (\Exception $e) {
    //         Log::error('Erro store game: ' . $e->getMessage());
    //         return response()->json(['error' => $e->getMessage()], 500);
    //     }
    // }

    // --- FUNÇÃO NOVA PARA O MULTIPLAYER (CHAMADA PELO NODE.JS) ---
    public function settleBet(Request $request)
    {
        // 1. Validar dados (Relaxamos as regras para aceitar forfeits)
        $validated = $request->validate([
            'winner_id' => 'required|integer|exists:users,id',
            'loser_id' => 'required|integer|exists:users,id',
            'game_type' => 'nullable',
            'p1_score' => 'required|integer|min:0',
            'p2_score' => 'required|integer|min:0',
            'reason' => 'nullable|string'
        ]);

        Log::info("SETTLE BET START: Winner {$validated['winner_id']} vs Loser {$validated['loser_id']} | Amount: {$validated['amount']}");

        try {
            return DB::transaction(function () use ($validated) {
                $winner = User::findOrFail($validated['winner_id']);
                $loser = User::findOrFail($validated['loser_id']);
                $winnerScore = (int) $validated['p1_score'];
                $loserScore = (int) $validated['p2_score'];
                $entryFee = 2;

                if (!$winner || !$loser) {
                    throw new \Exception("Utilizadores não encontrados na DB.");
                }

                $price = 0;
                if ($winnerScore == 120) {
                    $price = 6; // Prémio Bandeira
                } elseif ($winnerScore >= 91) {
                    $price = 4; // Prémio Capote
                } elseif ($winnerScore >= 61) {
                    $price = 3; // Prémio Normal
                } elseif ($winnerScore == $loserScore) {
                    $price = 1; // Prémio Empate
                }

                // // --- 1. TRANSFERÊNCIA DE MOEDAS ---
                // if ($amount > 0) {
                //     // Retirar do perdedor (Permite saldo negativo? Se não, adicionar verificação)
                //     $loser->coins_balance -= $amount;
                //     $loser->save();

                //     // Adicionar ao vencedor
                //     $winner->coins_balance += $amount;
                //     $winner->save();

                //     // Transação - Perda
                //     $typeBet = CoinTransactionType::firstOrCreate(['name' => 'Bet Loss']);
                //     CoinTransaction::create([
                //         'user_id' => $loser->id,
                //         'coin_transaction_type_id' => $typeBet->id,
                //         'coins' => $amount,
                //         'transaction_datetime' => now(),
                //         'custom' => ['opponent_id' => $winner->id, 'reason' => $validated['reason'] ?? 'loss']
                //     ]);

                //     // Transação - Ganho
                //     $typeWin = CoinTransactionType::firstOrCreate(['name' => 'Bet Win']);
                //     CoinTransaction::create([
                //         'user_id' => $winner->id,
                //         'coin_transaction_type_id' => $typeWin->id,
                //         'coins' => $amount,
                //         'transaction_datetime' => now(),
                //         'custom' => ['opponent_id' => $loser->id, 'reason' => $validated['reason'] ?? 'win']
                //     ]);
                // }

                $loser->coins_balance -= $entryFee;
                $winner->coins_balance -= $entryFee;
                $winner->coins_balance += $price;
                if ($price == 1) {
                    // Em caso de empate, o vencedor só recebe o prémio, não paga a taxa
                    $loser->coins_balance += $price;
                }
                $winner->save();
                $loser->save();

                // Registar transação da taxa para o perdedor
                $typeFee = CoinTransactionType::firstOrCreate(['name' => 'Game Fee']);
                CoinTransaction::create([
                    'user_id' => $loser->id,
                    'coin_transaction_type_id' => $typeFee->id,
                    'coins' => -$entryFee,
                    'transaction_datetime' => now(),
                    'custom' => ['opponent_id' => $winner->id, 'reason' => 'entry_fee']
                ]);

                // Registar transação da taxa para o vencedor
                CoinTransaction::create([
                    'user_id' => $winner->id,
                    'coin_transaction_type_id' => $typeFee->id,
                    'coins' => -$entryFee,
                    'transaction_datetime' => now(),
                    'custom' => ['opponent_id' => $loser->id, 'reason' => 'entry_fee']
                ]);

                // Registar transação do prémio para o vencedor (se houver prémio)
                if ($price > 0) {
                    $typeTransaction = CoinTransactionType::firstOrCreate(['name' => 'Game Payout']);
                    if ($price == 1) {
                        // Em caso de empate, registar também para o perdedor
                        CoinTransaction::create([
                            'user_id' => $loser->id,
                            'coin_transaction_type_id' => $typeTransaction->id,
                            'coins' => $price,
                            'transaction_datetime' => now(),
                            'custom' => ['opponent_id' => $winner->id, 'reason' => 'draw_prize']
                        ]);
                        CoinTransaction::create([
                            'user_id' => $winner->id,
                            'coin_transaction_type_id' => $typeTransaction->id,
                            'coins' => $price,
                            'transaction_datetime' => now(),
                            'custom' => ['opponent_id' => $loser->id, 'reason' => 'draw_prize']
                        ]);
                    } else {
                        CoinTransaction::create([
                            'user_id' => $winner->id,
                            'coin_transaction_type_id' => $typeTransaction->id,
                            'coins' => $price,
                            'transaction_datetime' => now(),
                            'custom' => ['opponent_id' => $loser->id, 'reason' => 'win_prize']
                        ]);
                    }
                }

                // --- 2. GRAVAR NO HISTÓRICO (Game) ---
                // Forçamos a criação do registo mesmo que o jogo tenha sido curto
                $game = new Game();
                $type = $validated['game_type'] ?? '3';
                $game->type = ($type == 9) ? '9' : '3';
                $game->status = 'Ended';
                $game->player1_user_id = $winner->id;
                $game->player2_user_id = $loser->id;
                $game->winner_user_id = $winner->id;
                $game->loser_user_id = $loser->id;
                $game->player1_marks = $winnerScore;
                $game->player2_marks = (int) $validated['p2_score'];
                $game->total_time = 0;
                $game->began_at = now();
                $game->ended_at = now();

                if (($validated['reason'] ?? '') === 'forfeit') {
                    $game->custom = ['termination' => 'forfeit'];
                }

                $game->save();

                Log::info("GAME SAVED ID: " . $game->id . " | Winner prize: " . $price);

                return response()->json([
                    'message' => 'Jogo liquidado com sucesso.',
                    'winner_price' => $price,
                    'entry_fee' => $entryFee
                ]);
            });

        } catch (\Exception $e) {
            Log::error("ERRO CRÍTICO SETTLEBET: " . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        return Game::findOrFail($id);
    }
}