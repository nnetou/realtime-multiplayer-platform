<?php

namespace App\Http\Controllers;

use App\Models\GameMatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;


class GameMatchController extends Controller
{
    /**
     * GET /api/game-matches
     * Lista todas as partidas.
     */
    public function index()
    {
        return GameMatch::with(['player1', 'player2', 'winner', 'loser'])->get();
    }

    /**
     * POST /api/game-matches
     * Cria uma nova partida.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'player_score'     => 'required|integer',
            'opponent_score'   => 'required|integer',
            'winner'           => 'required|string|in:player,bot',
            'duration_seconds' => 'required|integer',
            'custom'           => 'nullable|array',
        ]);

        $user = $request->user();

        return DB::transaction(function () use ($validated, $user) {
            
            $match = new GameMatch();
            $match->type = 'SinglePlayer';
            $match->status = 'Ended';
            
            $match->player1_user_id = $user->id;
            $match->player2_user_id = null;

            if ($validated['winner'] === 'player') {
                $match->winner_user_id = $user->id;
                $match->loser_user_id = null;
            } else {
                $match->winner_user_id = null;
                $match->loser_user_id = $user->id;
            }

            $match->player1_marks = $validated['player_score'];
            $match->player2_marks = $validated['opponent_score'];
            $match->player1_points = 0; 
            $match->player2_points = 0;

            $match->total_time = $validated['duration_seconds'];
            $match->began_at = now()->subSeconds($validated['duration_seconds']);
            $match->ended_at = now();

            // --- CORREÇÃO IMPORTANTE ---
            // Se não houver custom, guardamos null. 
            // Se guardarmos [], o Android crasha porque espera um Objeto {}.
            $match->custom = !empty($validated['custom']) ? $validated['custom'] : null;

            $coinsEarned = 0;
            if ($validated['winner'] === 'player') {
                $coinsEarned = 10; 
                if ($validated['player_score'] >= 4 && $validated['opponent_score'] == 0) {
                    $coinsEarned += 10; 
                }
            } else {
                $coinsEarned = 2;
            }

            $match->stake = $coinsEarned;
            $match->save();

            if ($coinsEarned > 0) {
                $user->coins_balance += $coinsEarned;
                $user->save();
            }

            return $match->load(['player1', 'winner']);
        });
    }
    /**
     * GET /api/game-matches/{id}
     * Mostra uma partida específica.
     */
    public function show($id)
    {
        $match = GameMatch::with(['player1', 'player2', 'winner', 'loser'])->findOrFail($id);
        return $match;
    }

    /**
     * PUT /api/game-matches/{id}
     * Atualiza uma partida (ex: estado, pontuações, vencedor).
     */
    public function update(Request $request, $id)
    {
        $match = GameMatch::findOrFail($id);

        $data = $request->validate([
            'status'          => 'nullable|in:Pending,Playing,Ended,Interrupted',
            'winner_user_id'  => 'nullable|exists:users,id',
            'loser_user_id'   => 'nullable|exists:users,id',
            'player1_marks'   => 'nullable|integer|min:0',
            'player2_marks'   => 'nullable|integer|min:0',
            'player1_points'  => 'nullable|integer|min:0',
            'player2_points'  => 'nullable|integer|min:0',
            'began_at'        => 'nullable|date',
            'ended_at'        => 'nullable|date',
            'total_time'      => 'nullable|integer|min:0',
            'stake'           => 'nullable|integer|min:0',
            'custom'          => 'nullable|array',
        ]);

        $match->update($data);

        return GameMatch::with(['player1', 'player2', 'winner', 'loser'])->find($match->id);
    }

    /**
     * DELETE /api/game-matches/{id}
     * Apaga uma partida.
     */
    public function destroy($id)
    {
        $match = GameMatch::findOrFail($id);
        $match->delete();

        return response()->json(['message' => 'Match deleted']);
    }
}
