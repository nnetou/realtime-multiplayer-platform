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
            'most_wins' => User::withCount(['wonMatches'])
                ->orderBy('won_matches_count', 'desc')
                ->take(10)
                ->get(),

            'best_winrate' => User::all()->sortByDesc(fn($u) => $u->winrate())->take(10),

            'most_points' => User::withSum('matches as total_points', 'player1_points')
                ->orderByDesc('total_points')
                ->take(10)
                ->get(),
        ];
    }
}
