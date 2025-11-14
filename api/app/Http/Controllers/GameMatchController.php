<?php

namespace App\Http\Controllers;

use App\Models\GameMatch;
use Illuminate\Http\Request;

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
        $data = $request->validate([
            'type'            => 'required|in:3,9',          // ENUM '3' ou '9'
            'player1_user_id' => 'required|exists:users,id',
            'player2_user_id' => 'nullable|exists:users,id',
            'stake'           => 'nullable|integer|min:0',
        ]);

        $match = GameMatch::create([
            'type'            => $data['type'],
            'player1_user_id' => $data['player1_user_id'],
            'player2_user_id' => $data['player2_user_id'] ?? null,
            'stake'           => $data['stake'] ?? 0,
            'status'          => 'Pending',
        ]);

        return response()->json(
            GameMatch::with(['player1', 'player2'])->find($match->id),
            201
        );
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
