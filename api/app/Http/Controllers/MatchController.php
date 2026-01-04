<?php

namespace App\Http\Controllers;

use App\Models\MatchModel;
use App\Models\Game;
use App\Models\User;
use App\Models\Achievement;
use App\Models\CoinTransaction;
use App\Models\CoinTransactionType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MatchController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $query = MatchModel::where(function ($q) use ($userId) {
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

    public function store(Request $request)
    {
        $validated = $request->validate([
            'player_score' => 'required|integer',
            'opponent_score' => 'required|integer',
            'winner' => 'required|string',
            'duration_seconds' => 'required|integer',
            'type' => 'nullable|string',
            'custom' => 'nullable|array',
        ]);

        $user = $request->user();
        $entryFee = 3;
        $isSimulation = isset($validated['custom']['coins_change']);
        $simulationDelta = $isSimulation ? (int) $validated['custom']['coins_change'] : 0;

        if ($user->coins_balance < $entryFee && $simulationDelta < 0) {
            return response()->json(['error' => 'Saldo insuficiente.', 'required_coins' => $entryFee], 402);
        }

        $bot = User::firstOrCreate(['nickname' => 'Bot'], ['name' => 'System Bot', 'email' => 'bot@sys.com', 'password' => '123', 'type' => 'P']);

        try {
            return DB::transaction(function () use ($validated, $user, $bot, $simulationDelta) {
                $match = new MatchModel();
                $rawType = $validated['type'] ?? '3';
                if (in_array($rawType, ['3', 'bisca_3'])) {
                    $match->type = '3';
                } elseif (in_array($rawType, ['9', 'bisca_9'])) {
                    $match->type = '9';
                } else {
                    $match->type = $rawType;
                }

                $match->status = 'Ended';
                $match->player1_user_id = $user->id;
                $match->player2_user_id = $bot->id;
                $match->timestamps = false;

                if ($validated['winner'] === 'player') {
                    $match->winner_user_id = $user->id;
                } else {
                    $match->loser_user_id = $user->id;
                    $match->winner_user_id = $bot->id;
                }

                $match->player1_marks = $validated['player_score'];
                $match->player2_marks = $validated['opponent_score'];
                $match->total_time = $validated['duration_seconds'];
                $match->began_at = now()->subSeconds($validated['duration_seconds']);
                $match->ended_at = now();
                $match->stake = $simulationDelta;
                $match->save();


                if ($simulationDelta != 0) {
                    $typeName = ($simulationDelta > 0) ? 'Bonus' : 'Game fee';
                    $transType = CoinTransactionType::where('name', $typeName)->first() ?? CoinTransactionType::first();
                    CoinTransaction::create([
                        'user_id' => $user->id,
                        'match_id' => $match->id,
                        'coin_transaction_type_id' => $transType->id,
                        'coins' => abs($simulationDelta),
                        'transaction_datetime' => now(),
                        'custom' => ['source' => 'game_result']
                    ]);
                }

                $user->coins_balance += $simulationDelta;
                $user->save();
                return $match->load('games');
            });
        } catch (\Exception $e) {
            Log::error('Erro store match: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function settleBet(Request $request)
    {
        $validated = $request->validate([
            'winner_id' => 'required|integer',
            'loser_id' => 'required|integer',
            'amount' => 'required|integer',
            'game_type' => 'nullable',
            'p1_score' => 'nullable|integer',
            'p2_score' => 'nullable|integer',
            'reason' => 'nullable|string'
        ]);

        Log::info("SETTLE BET START: Winner {$validated['winner_id']} vs Loser {$validated['loser_id']} | Amount: {$validated['amount']}");

        try {
            return DB::transaction(function () use ($validated) {
                $winner = User::find($validated['winner_id']);
                $loser = User::find($validated['loser_id']);

                if (!$winner || !$loser) {
                    throw new \Exception("Utilizadores não encontrados na DB.");
                }

                $amount = (int) $validated['amount'];

                if ($amount > 0) {
                    $loser->coins_balance -= $amount;
                    $loser->save();

                    $winner->coins_balance += $amount;
                    $winner->save();

                    $typeBet = CoinTransactionType::firstOrCreate(['name' => 'Bet Loss']);
                    CoinTransaction::create([
                        'user_id' => $loser->id,
                        'coin_transaction_type_id' => $typeBet->id,
                        'coins' => $amount,
                        'transaction_datetime' => now(),
                        'custom' => ['opponent_id' => $winner->id, 'reason' => $validated['reason'] ?? 'loss']
                    ]);

                    $typeWin = CoinTransactionType::firstOrCreate(['name' => 'Bet Win']);
                    CoinTransaction::create([
                        'user_id' => $winner->id,
                        'coin_transaction_type_id' => $typeWin->id,
                        'coins' => $amount,
                        'transaction_datetime' => now(),
                        'custom' => ['opponent_id' => $loser->id, 'reason' => $validated['reason'] ?? 'win']
                    ]);
                }

                $match = new MatchModel();

                $type = $validated['game_type'] ?? '3';
                $match->type = ($type == 9) ? '9' : '3';

                $match->status = 'Ended';
                $match->player1_user_id = $winner->id;
                $match->player2_user_id = $loser->id;
                $match->winner_user_id = $winner->id;
                $match->loser_user_id = $loser->id;

                $match->player1_marks = $validated['p1_score'] ?? 120;
                $match->player2_marks = $validated['p2_score'] ?? 0;

                $match->total_time = 0;
                $match->began_at = now();
                $match->ended_at = now();
                $match->stake = $amount;

                if (($validated['reason'] ?? '') === 'forfeit') {
                    $match->custom = ['termination' => 'forfeit'];
                }

                $match->save();

                Log::info("MATCH SAVED ID: " . $match->id);

                return response()->json(['message' => 'Liquidado com sucesso']);
            });

        } catch (\Exception $e) {
            Log::error("ERRO CRÍTICO SETTLEBET: " . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function personalScoreboard(Request $request)
    {
        $user = $request->user();
        $total = MatchModel::where('player1_user_id', $user->id)->orWhere('player2_user_id', $user->id)->count();
        $won = MatchModel::where('winner_user_id', $user->id)->count();

        return response()->json([
            'user_id' => $user->id,
            'total_matches' => $total,
            'won_matches' => $won,
            'lost_matches' => max(0, $total - $won),
            'win_rate' => $total > 0 ? round(($won / $total) * 100, 2) : 0,
            'capote_count' => Achievement::where('user_id', $user->id)->where('type', 'Capote')->count(),
            'bandeira_count' => Achievement::where('user_id', $user->id)->where('type', 'Bandeira')->count(),
            'coins_balance' => $user->coins_balance,
        ]);
    }

    public function globalScoreboard(Request $request)
    {
        $filter = $request->query('filter', 'wins');
        $perPage = $request->query('per_page', 10);
        $page = $request->query('page', 1);

        $query = User::where('type', 'P');

        if ($filter === 'wins') {
            $query = $query->withCount('matchesWon')
                ->orderByDesc('matches_won_count')
                ->orderByDesc('created_at');
        } elseif ($filter === 'coins') {
            $query = $query->orderByDesc('coins_balance')
                ->orderByDesc('created_at');
        } elseif ($filter === 'achievements') {
            $query = $query->withCount('achievements as achievements_count')
                ->orderByDesc('achievements_count')
                ->orderByDesc('created_at');
        } else {
            $query = $query->withCount('matchesWon')
                ->orderByDesc('matches_won_count')
                ->orderByDesc('created_at');
        }

        $data = $query->paginate($perPage, ['*'], 'page', $page);

        $transformedData = $data->getCollection()->map(function ($user) use ($filter) {
            $userData = [
                'id' => $user->id,
                'name' => $user->name,
                'nickname' => $user->nickname,
                'email' => $user->email,
                'coins_balance' => $user->coins_balance,
                'matches_won_count' => $user->matches_won_count ?? 0,
                'achievements_count' => $user->achievements_count ?? 0,
            ];

            return $userData;
        });

        $data->setCollection($transformedData);

        return response()->json($data);
    }

    public function getUserRank(Request $request)
    {
        $category = $request->query('category');
        $userId = $request->query('user_id');

        if ($category === 'wins') {
            $users = User::where('type', 'P')
                ->withCount('matchesWon')
                ->orderByDesc('matches_won_count')
                ->orderByDesc('created_at')
                ->get();

            $rank = $users->search(function ($user) use ($userId) {
                return $user->id == $userId;
            });

            return response()->json(['rank' => $rank !== false ? $rank + 1 : 0]);
        } elseif ($category === 'coins') {
            $users = User::where('type', 'P')
                ->orderByDesc('coins_balance')
                ->orderByDesc('created_at')
                ->get();
            $rank = $users->search(function ($user) use ($userId) {
                return $user->id == $userId;
            });

            return response()->json(['rank' => $rank !== false ? $rank + 1 : 0]);
        } elseif ($category === 'achievements') {
            $users = User::where('type', 'P')
                ->withCount('achievements as achievements_count')
                ->orderByDesc('achievements_count')
                ->orderByDesc('created_at')
                ->get();

            $rank = $users->search(function ($user) use ($userId) {
                return $user->id == $userId;
            });

            return response()->json(['rank' => $rank !== false ? $rank + 1 : 0]);
        }

        return response()->json(['rank' => 0]);
    }

    public function createMatch(Request $request)
    {
        $validated = $request->validate([
            'player1_user_id' => 'required|integer|exists:users,id',
            'bet_amount' => 'required|integer|min:0',
            'game_type' => 'nullable|string',
            'status' => 'nullable|string'
        ]);

        try {
            $player1 = User::find($validated['player1_user_id']);
            if ($player1->coins_balance < $validated['bet_amount']) {
                return response()->json([
                    'error' => 'Saldo insuficiente para criar a partida.'
                ], 402);
            }

            $match = new MatchModel();
            $match->player1_user_id = $validated['player1_user_id'];
            $match->player2_user_id = null;
            $match->type = $validated['game_type'] ?? '3';
            $match->status = $validated['status'] ?? 'Pending';
            $match->stake = $validated['bet_amount'];
            $match->began_at = now();
            $match->save();

            Log::info("Match criado: ID {$match->id} | Player1: {$match->player1_user_id} | Aposta: {$match->stake}");

            return response()->json([
                'id' => $match->id,
                'player1_user_id' => $match->player1_user_id,
                'type' => $match->type,
                'status' => $match->status,
                'stake' => $match->stake
            ], 201);

        } catch (\Exception $e) {
            Log::error('Erro ao criar match: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function updateMatch(Request $request, $id)
    {
        $validated = $request->validate([
            'player2_user_id' => 'nullable|integer|exists:users,id',
            'status' => 'nullable|string',
            'winner_user_id' => 'nullable|integer|exists:users,id'
        ]);

        try {
            $match = MatchModel::find($id);

            if (!$match) {
                return response()->json(['error' => 'Match não encontrado'], 404);
            }

            if (isset($validated['player2_user_id'])) {
                $match->player2_user_id = $validated['player2_user_id'];
            }

            if (isset($validated['status'])) {
                $match->status = $validated['status'];
            }

            if (isset($validated['winner_user_id'])) {
                $match->winner_user_id = $validated['winner_user_id'];
            }

            $match->save();

            Log::info("Match atualizado: ID {$match->id}");

            return response()->json([
                'id' => $match->id,
                'player1_user_id' => $match->player1_user_id,
                'player2_user_id' => $match->player2_user_id,
                'status' => $match->status
            ], 200);

        } catch (\Exception $e) {
            Log::error('Erro ao atualizar match: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Cria um Game individual dentro de uma Match (ronda)
     */
    public function createGameInMatch(Request $request)
    {
        $validated = $request->validate([
            'match_id' => 'required|integer|exists:matches,id',
            'winner_user_id' => 'required|integer|exists:users,id',
            'loser_user_id' => 'required|integer|exists:users,id',
            'player1_points' => 'required|integer|min:0',
            'player2_points' => 'required|integer|min:0',
            'duration_seconds' => 'nullable|integer|min:0',
            'reason' => 'nullable|string'
        ]);

        try {
            $match = MatchModel::findOrFail($validated['match_id']);

            $game = new Game();
            $game->match_id = $validated['match_id'];
            $game->type = $match->type;
            $game->player1_user_id = $match->player1_user_id;
            $game->player2_user_id = $match->player2_user_id;
            $game->winner_user_id = $validated['winner_user_id'];
            $game->loser_user_id = $validated['loser_user_id'];
            $game->player1_points = $validated['player1_points'];
            $game->player2_points = $validated['player2_points'];
            $game->status = 'Ended';
            $game->began_at = now()->subSeconds($validated['duration_seconds'] ?? 0);
            $game->ended_at = now();
            $game->total_time = $validated['duration_seconds'] ?? 0;

            if (isset($validated['reason'])) {
                $game->custom = ['termination' => $validated['reason']];
            }

            $game->save();

            Log::info("Game criado dentro da Match {$match->id}: Game ID {$game->id}");

            return response()->json([
                'id' => $game->id,
                'match_id' => $game->match_id,
                'winner_user_id' => $game->winner_user_id,
                'player1_points' => $game->player1_points,
                'player2_points' => $game->player2_points
            ], 201);

        } catch (\Exception $e) {
            Log::error('Erro ao criar game na match: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function finalizeMatch(Request $request, $id)
    {
        $validated = $request->validate([
            'winner_user_id' => 'required|integer|exists:users,id',
            'loser_user_id' => 'required|integer|exists:users,id',
            'player1_total_points' => 'required|integer|min:0',
            'player2_total_points' => 'required|integer|min:0',
            'player1_marks' => 'required|integer|min:0|max:4',
            'player2_marks' => 'required|integer|min:0|max:4',
            'reason' => 'nullable|string'
        ]);

        try {
            return DB::transaction(function () use ($id, $validated) {
                $match = MatchModel::findOrFail($id);

                $match->status = 'Ended';
                $match->winner_user_id = $validated['winner_user_id'];
                $match->loser_user_id = $validated['loser_user_id'];
                $match->player1_points = $validated['player1_total_points'];
                $match->player2_points = $validated['player2_total_points'];
                $match->player1_marks = $validated['player1_marks'];
                $match->player2_marks = $validated['player2_marks'];
                $match->ended_at = now();

                if ($match->began_at) {
                    $match->total_time = now()->diffInSeconds($match->began_at);
                }

                if (isset($validated['reason'])) {
                    $match->custom = ['termination' => $validated['reason']];
                }

                $match->save();

                if ($match->stake > 0) {
                    $winner = User::findOrFail($validated['winner_user_id']);
                    $loser = User::findOrFail($validated['loser_user_id']);

                    $loser->coins_balance -= $match->stake;
                    $loser->save();

                    $winner->coins_balance += $match->stake;
                    $winner->save();

                    $typeLoss = CoinTransactionType::firstOrCreate(['name' => 'Match stake', 'type' => 'D']);
                    CoinTransaction::create([
                        'user_id' => $loser->id,
                        'match_id' => $match->id,
                        'coin_transaction_type_id' => $typeLoss->id,
                        'coins' => $match->stake,
                        'transaction_datetime' => now(),
                        'custom' => ['opponent_id' => $winner->id, 'reason' => 'match_loss']
                    ]);

                    $typeWin = CoinTransactionType::firstOrCreate(['name' => 'Match payout', 'type' => 'C']);
                    CoinTransaction::create([
                        'user_id' => $winner->id,
                        'match_id' => $match->id,
                        'coin_transaction_type_id' => $typeWin->id,
                        'coins' => $match->stake,
                        'transaction_datetime' => now(),
                        'custom' => ['opponent_id' => $loser->id, 'reason' => 'match_win']
                    ]);
                }

                Log::info("Match finalizada: ID {$match->id} | Vencedor: {$match->winner_user_id}");

                return response()->json([
                    'message' => 'Match finalizada com sucesso',
                    'match' => $match->load('games')
                ], 200);
            });

        } catch (\Exception $e) {
            Log::error('Erro ao finalizar match: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function startGameInMatch(Request $request)
    {
        $validated = $request->validate([
            'match_id' => 'required|integer|exists:matches,id'
        ]);

        try {
            $match = MatchModel::findOrFail($validated['match_id']);

            $game = new Game();
            $game->match_id = $validated['match_id'];
            $game->type = $match->type;
            $game->player1_user_id = $match->player1_user_id;
            $game->player2_user_id = $match->player2_user_id;
            $game->status = 'Playing';
            $game->began_at = now();
            $game->save();

            Log::info("Game individual criado para Match {$match->id}: Game ID {$game->id}");

            return response()->json([
                'id' => $game->id,
                'match_id' => $game->match_id,
                'status' => $game->status
            ], 201);

        } catch (\Exception $e) {
            Log::error('Erro ao criar game na match: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function finishGameInMatch(Request $request, $gameId)
    {
        $validated = $request->validate([
            'winner_user_id' => 'required|integer|exists:users,id',
            'loser_user_id' => 'required|integer|exists:users,id',
            'player1_points' => 'required|integer|min:0',
            'player2_points' => 'required|integer|min:0',
            'reason' => 'nullable|string'
        ]);

        try {
            $game = Game::findOrFail($gameId);

            $game->winner_user_id = $validated['winner_user_id'];
            $game->loser_user_id = $validated['loser_user_id'];
            $game->player1_points = $validated['player1_points'];
            $game->player2_points = $validated['player2_points'];
            $game->status = 'Ended';
            $game->ended_at = now();
            $game->total_time = now()->diffInSeconds($game->began_at);

            if (isset($validated['reason'])) {
                $game->custom = ['termination' => $validated['reason']];
            }

            $game->save();

            Log::info("Game {$game->id} finalizado: {$validated['winner_user_id']} venceu {$validated['loser_user_id']}");

            return response()->json([
                'id' => $game->id,
                'winner_user_id' => $game->winner_user_id,
                'status' => $game->status
            ], 200);

        } catch (\Exception $e) {
            Log::error('Erro ao finalizar game: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
