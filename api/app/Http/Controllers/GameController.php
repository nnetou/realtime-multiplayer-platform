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
            $game->player2_user_id = $playerPending->id;
            $game->status = 'Pending';
            $game->type = $validated['game_type'];
            $game->began_at = now();

            $game->save();

            Log::info('✅ Jogo criado e guardado na base de dados:', $game->toArray());
            return response()->json($game, 201);

        } catch (\Exception $e) {
            Log::error("Erro ao criar jogo multiplayer: " . $e->getMessage());
            return response()->json(['error' => 'Não foi possível criar o jogo.', $e->getMessage()], 500);
        }
    }

    public function updateGameStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:Pending,Playing,Ended,Interrupted',
            'player2_user_id' => 'sometimes|integer|exists:users,id'
        ]);

        try {
            $game = Game::findOrFail($id);
            $game->status = $validated['status'];

            if (isset($validated['player2_user_id'])) {
                $game->player2_user_id = $validated['player2_user_id'];
            }

            $game->save();

            return response()->json([
                'message' => 'Game status atualizado com sucesso.',
                'game' => $game
            ]);
        } catch (\Exception $e) {
            Log::error("Erro ao atualizar status do game: " . $e->getMessage());
            return response()->json(['error' => 'Não foi possível atualizar o game.'], 500);
        }
    }

    public function settleBet(Request $request)
    {
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
                    $price = 6;
                } elseif ($winnerScore >= 91) {
                    $price = 4;
                } elseif ($winnerScore >= 61) {
                    $price = 3;
                } elseif ($winnerScore == $loserScore) {
                    $price = 1;
                }



                $loser->coins_balance -= $entryFee;
                $winner->coins_balance -= $entryFee;
                $winner->coins_balance += $price;
                if ($price == 1) {
                    $loser->coins_balance += $price;
                }
                $winner->save();
                $loser->save();

                $typeFee = CoinTransactionType::firstOrCreate(['name' => 'Game Fee']);
                CoinTransaction::create([
                    'user_id' => $loser->id,
                    'coin_transaction_type_id' => $typeFee->id,
                    'coins' => -$entryFee,
                    'transaction_datetime' => now(),
                    'custom' => ['opponent_id' => $winner->id, 'reason' => 'entry_fee']
                ]);

                CoinTransaction::create([
                    'user_id' => $winner->id,
                    'coin_transaction_type_id' => $typeFee->id,
                    'coins' => -$entryFee,
                    'transaction_datetime' => now(),
                    'custom' => ['opponent_id' => $loser->id, 'reason' => 'entry_fee']
                ]);

                if ($price > 0) {
                    $typeTransaction = CoinTransactionType::firstOrCreate(['name' => 'Game Payout']);
                    if ($price == 1) {
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