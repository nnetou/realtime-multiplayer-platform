<?php

namespace App\Http\Controllers;

use App\Models\GameMatch;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class ScoreboardController extends Controller
{
    public function personal()
    {
        $user = Auth::user();

        $matches = GameMatch::where('player1_user_id', $user->id)
            ->orWhere('player2_user_id', $user->id);

        $total = $matches->count();
        $wins  = (clone $matches)->where('winner_user_id', $user->id)->count();
        $loss  = $total - $wins;

        $capotes = (clone $matches)
            ->where(function ($q) use ($user) {
                $q->where('winner_user_id', $user->id)
                  ->where('player1_points', 4)
                  ->where('player2_points', 0);
            })
            ->orWhere(function ($q) use ($user) {
                $q->where('winner_user_id', $user->id)
                  ->where('player2_points', 4)
                  ->where('player1_points', 0);
            })
            ->count();

        return [
            'matches' => $total,
            'wins'    => $wins,
            'losses'  => $loss,
            'winrate' => $total > 0 ? round(($wins / $total) * 100, 1).'%' : '0%',
            'capotes' => $capotes,
        ];
    }

    public function global()
    {
         return [
            'most_wins' => User::withCount(['matchesWon'])
                ->orderByDesc('matches_won_count')
                ->take(5)
                ->get(['id','name','nickname','matches_won_count']),

            'best_winrate' => User::all()
                ->sortByDesc(fn($u) => $u->winrate())
                ->take(5)
                ->values(),

            'most_points' => User::withSum([
                'matchesWon as total_points' => function ($q) {
                    $q->selectRaw('SUM(player1_points + player2_points)');
                }
            ], 'total_points')
                ->orderByDesc('total_points')
                ->take(5)
                ->get(['id','name','nickname','total_points']),
        ];
    }
}
