<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MatchModel;

class UserStatisticsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // Total de partidas jogadas (onde o usuário participou e o jogo terminou)
        $totalMatches = MatchModel::where(function ($query) use ($user) {
            $query->where('player1_id', $user->id)
                  ->orWhere('player2_id', $user->id);
        })->whereNotNull('winner_user_id')->count();

        // Total de vitórias
        $totalWins = $user->matchesWon()->count();

        // Vitórias por tipo de jogo
        $bisca3Wins = $user->matchesWon()->whereIn('type', ['3', 'bisca_3'])->count();
    $bisca9Wins = $user->matchesWon()->whereIn('type', ['9', 'bisca_9'])->count();
    // ---------------------
        return response()->json([
            'total_matches' => $totalMatches,
            'total_wins' => $totalWins,
            'bisca_3_wins' => $bisca3Wins,
            'bisca_9_wins' => $bisca9Wins,
        ]);
    }
}
