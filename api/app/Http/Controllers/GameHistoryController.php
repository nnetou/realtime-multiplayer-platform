<?php

namespace App\Http\Controllers;

use App\Models\Game;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GameHistoryController extends Controller
{
    public function index(Request $request)
{
    $user = Auth::user();

    // Buscar jogos onde o user participou
    $matches = Game::where('player1_user_id', $user->id)
        ->orWhere('player2_user_id', $user->id)
        ->orderBy('began_at', 'desc')
        ->get();

    return $matches->map(function ($match) use ($user) {

        $isPlayer1 = $match->player1_user_id === $user->id;

        return [
            'id'        => $match->id,
            'date'      => optional($match->began_at)->format('Y-m-d H:i'),
            'duration'  => $this->duration($match),
            'result'    => $match->player1_points . ' - ' . $match->player2_points,
            'coins'     => 0, // tabela games não tem stake — decisão pendente
            'is_win'    => $match->winner_user_id === $user->id,
            'opponent'  => $isPlayer1
                            ? ($match->player2->nickname ?? 'Bot')
                            : ($match->player1->nickname ?? 'Bot'),
        ];
    })->values();
}


    public function show($id)
    {
        $match = Game::with('games')->findOrFail($id);

        return [
            'id'       => $match->id,
            'date'     => optional($match->began_at)->format('Y-m-d H:i'),
            'duration' => $this->duration($match),
            'result'   => $match->player1_points . ' - ' . $match->player2_points,
            'winner'   => $match->winner->username ?? 'Bot',
            'loser'    => $match->loser->username ?? 'Bot',

            'tricks'   => $match->games->map(function ($g) {
                return [
                    'n'        => $g->round_number ?? null,
                    'player'   => $g->player_points ?? 0,
                    'opponent' => $g->opponent_points ?? 0,
                ];
            })
        ];
    }

    private function duration($match)
    {
        if (!$match->began_at || !$match->ended_at) return null;

        return $match->ended_at->diffInMinutes($match->began_at) . 'm';
    }
}
