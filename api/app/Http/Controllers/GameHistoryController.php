<?php

namespace App\Http\Controllers;

use App\Models\GameMatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GameHistoryController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();

        // buscar jogos onde o user participou
        $matches = GameMatch::where('player1_user_id', $user->id)
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
                'coins'     => $match->stake ?? 0,
                'is_win'    => $match->winner_user_id === $user->id,
                'opponent'  => $isPlayer1 
                                ? $match->player2->username ?? 'Bot'
                                : $match->player1->username ?? 'Bot',
            ];
        })->values();
    }

    public function show($id)
    {
        $match = GameMatch::with('games')->findOrFail($id);

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
