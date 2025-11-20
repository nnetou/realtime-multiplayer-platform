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
            'player_score'     => 'required|integer',
            'opponent_score'   => 'required|integer',
            'winner'           => 'required|string',
            'duration_seconds' => 'required|integer',
            'custom'           => 'nullable|array',
        ]);

        $user = $request->user();

        $entryFee      = 2;
        $baseWinReward = 10;
        $bonusCapote   = 20;
        $bonusBandeira = 50;

        if ($user->coins_balance < $entryFee) {
            return response()->json([
                'error'           => 'Saldo de coins insuficiente para iniciar o jogo.',
                'required_coins'  => $entryFee,
                'current_balance' => $user->coins_balance,
            ], 402);
        }

        $bot = User::firstOrCreate(
            ['nickname' => 'Bot'],
            ['name' => 'System Bot', 'email' => 'bot@sys.com', 'password' => '123', 'type' => 'P']
        );

        try {
            return DB::transaction(function () use ($validated, $user, $bot, $entryFee, $baseWinReward, $bonusCapote, $bonusBandeira) {

                $match = new MatchModel();
                $match->type = '3';
                $match->status = 'Ended';
                $match->player1_user_id = $user->id;
                $match->player2_user_id = $bot->id;
                $match->timestamps = false;

                $isWinner = $validated['winner'] === 'player';

                if ($isWinner) {
                    $match->winner_user_id = $user->id;
                } else {
                    $match->loser_user_id  = $user->id;
                    $match->winner_user_id = $bot->id;
                }

                $match->player1_marks = $validated['player_score'];
                $match->player2_marks = $validated['opponent_score'];
                $match->total_time    = $validated['duration_seconds'];
                $match->began_at      = now()->subSeconds($validated['duration_seconds']);
                $match->ended_at      = now();
                $match->stake         = 0;
                $match->save();

                $gameFeeType = CoinTransactionType::where('name', 'Game fee')->firstOrFail();
                $payoutType  = CoinTransactionType::where('name', 'Game payout')->firstOrFail();
                $bonusType   = CoinTransactionType::where('name', 'Bonus')->firstOrFail();

                CoinTransaction::create([
                    'user_id'                  => $user->id,
                    'match_id'                 => $match->id,
                    'coin_transaction_type_id' => $gameFeeType->id,
                    'coins'                    => $entryFee,
                    'transaction_datetime'     => now(),
                ]);

                $baseReward = 0;

                if ($isWinner) {
                    $baseReward = $baseWinReward;

                    CoinTransaction::create([
                        'user_id'                  => $user->id,
                        'match_id'                 => $match->id,
                        'coin_transaction_type_id' => $payoutType->id,
                        'coins'                    => $baseReward,
                        'transaction_datetime'     => now(),
                    ]);
                }

                $bonusReward = 0;

                if (!empty($validated['custom']['trick_breakdown'])) {
                    $trickBreakdown = $validated['custom']['trick_breakdown'];

                    $gamesData = [];
                    foreach ($trickBreakdown as $trick) {
                        $idx = $trick['game_index'] ?? 1;
                        $gamesData[$idx][] = $trick;
                    }

                    foreach ($gamesData as $idx => $tricks) {
                        $game = new Game();
                        $game->match_id = $match->id;
                        $game->type = '3';
                        $game->player1_user_id = $user->id;
                        $game->timestamps = false;

                        $pPoints = 0;
                        $bPoints = 0;

                        foreach ($tricks as $t) {
                            if (strtolower($t['winner'] ?? '') === 'player') {
                                $pPoints += ($t['points'] ?? 0);
                            } else {
                                $bPoints += ($t['points'] ?? 0);
                            }
                        }

                        $game->player1_points = $pPoints;
                        $game->player2_points = $bPoints;

                        if ($pPoints > $bPoints) {
                            $game->winner_user_id = $user->id;
                        } elseif ($bPoints > $pPoints) {
                            $game->winner_user_id = $bot->id;
                        }

                        $game->custom = ['trick_breakdown' => $tricks];
                        $game->save();

                        if ($pPoints > $bPoints && $game->winner_user_id == $user->id) {
                            $achType = null;

                            if ($pPoints == 120) {
                                $achType     = 'Bandeira';
                                $bonusReward += $bonusBandeira;
                            } elseif ($pPoints >= 91) {
                                $achType     = 'Capote';
                                $bonusReward += $bonusCapote;
                            }

                            if ($achType) {
                                try {
                                    Achievement::create([
                                        'user_id'       => $user->id,
                                        'game_match_id' => $match->id,
                                        'type'          => $achType,
                                        'description'   => $achType,
                                    ]);
                                } catch (\Exception $e) {
                                }
                            }
                        }
                    }
                }

                if ($bonusReward > 0) {
                    CoinTransaction::create([
                        'user_id'                  => $user->id,
                        'match_id'                 => $match->id,
                        'coin_transaction_type_id' => $bonusType->id,
                        'coins'                    => $bonusReward,
                        'transaction_datetime'     => now(),
                    ]);
                }

                $netDelta = -$entryFee + $baseReward + $bonusReward;

                $match->stake = $netDelta;
                $match->save();

                $user->coins_balance += $netDelta;
                $user->save();

                return $match->load('games');
            });
        } catch (\Exception $e) {
            Log::error('Erro ao guardar match: '.$e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function personalScoreboard(Request $request)
    {
        $user = $request->user();

        $total = MatchModel::where('player1_user_id', $user->id)
                           ->orWhere('player2_user_id', $user->id)
                           ->count();

        $won = MatchModel::where('winner_user_id', $user->id)->count();

        return response()->json([
            'total_matches'  => $total,
            'won_matches'    => $won,
            'lost_matches'   => max(0, $total - $won),
            'win_rate'       => $total > 0 ? round(($won / $total) * 100, 2) : 0,
            'capote_count'   => Achievement::where('user_id', $user->id)->where('type', 'Capote')->count(),
            'bandeira_count' => Achievement::where('user_id', $user->id)->where('type', 'Bandeira')->count(),
            'coins_balance'  => $user->coins_balance,
        ]);
    }

    public function globalScoreboard()
    {
        return response()->json([
            'most_wins'        => User::where('type', 'P')->withCount('matchesWon')->orderByDesc('matches_won_count')->take(10)->get(),
            'most_coins'       => User::where('type', 'P')->orderByDesc('coins_balance')->take(10)->get(),
            'most_achievements'=> User::where('type', 'P')->withCount('achievements as achievements_count')->has('achievements')->orderByDesc('achievements_count')->take(10)->get(),
        ]);
    }
}
