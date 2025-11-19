<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GameMatchController;
use App\Models\GameMatch;
use App\Models\User;

// ------------------------------
// AUTH (Público)
// ------------------------------
Route::post('/login', [AuthController::class, 'login']);

Route::get('/metadata', function () {
    return [
        "name"    => "DAD 2025/26 Project API",
        "version" => "0.0.1"
    ];
});

// ------------------------------
// ROTAS PROTEGIDAS (Exigem Token)
// ------------------------------
Route::middleware('auth:sanctum')->group(function () {

    Route::get('/users/me', function (Request $request) {
        return $request->user();
    });

    Route::post('/logout', [AuthController::class, 'logout']);

    // ------------------------------
    // GAME MATCHES (AGORA ESTÃO AQUI DENTRO)
    // ------------------------------
    // Importante: O POST tem de estar aqui para sabermos quem é o $user
    Route::get('/game-matches', [GameMatchController::class, 'index']);
    Route::post('/game-matches', [GameMatchController::class, 'store']);
    Route::get('/game-matches/{id}', [GameMatchController::class, 'show']);
    Route::put('/game-matches/{id}', [GameMatchController::class, 'update']);
    Route::delete('/game-matches/{id}', [GameMatchController::class, 'destroy']);

    // ------------------------------
    // HISTORY
    // ------------------------------
    Route::get('/history/matches', function (Request $request) {
        $user = $request->user();
        $query = GameMatch::where(function($q) use ($user) {
                $q->where('player1_user_id', $user->id)
                  ->orWhere('player2_user_id', $user->id);
            })
            ->where('status', 'Ended')
            ->with(['player1', 'player2', 'winner', 'loser']); // Removi 'games' se não existir a relação

        if ($request->has('result')) {
            if ($request->result === 'win') {
                $query->where('winner_user_id', $user->id);
            } elseif ($request->result === 'loss') {
                $query->where('loser_user_id', $user->id);
            }
        }

        $orderBy = $request->get('order_by', 'created_at');
        $orderDir = $request->get('order_dir', 'desc');
        $query->orderBy($orderBy, $orderDir);

        return response()->json($query->get());
    });

    // ------------------------------
    // SCOREBOARD
    // ------------------------------
    Route::get('/scoreboard/personal', function (Request $request) {
        $user = $request->user();
        
        $totalMatches = GameMatch::where(function($query) use ($user) {
            $query->where('player1_user_id', $user->id)
                  ->orWhere('player2_user_id', $user->id);
        })->where('status', 'Ended')->count();

        $wonMatches = GameMatch::where('winner_user_id', $user->id)
            ->where('status', 'Ended')->count();

        return response()->json([
            'total_matches' => $totalMatches,
            'won_matches' => $wonMatches,
            'lost_matches' => $totalMatches - $wonMatches,
            'win_rate' => $totalMatches > 0 ? round(($wonMatches / $totalMatches) * 100, 2) : 0,
            'capote_count' => 0, // Implementar lógica se necessário
            'bandeira_count' => 0,
            'coins_balance' => $user->coins_balance,
        ]);
    });

    Route::get('/scoreboard/global', function () {
        $mostWins = User::where('type', 'P')
            ->withCount(['matchesWon' => function ($q) {
                $q->where('status', 'Ended');
            }])
            ->orderByDesc('matches_won_count')
            ->take(10)
            ->get(['id', 'name', 'nickname', 'matches_won_count']);

        $mostCoins = User::where('type', 'P')
            ->orderByDesc('coins_balance')
            ->take(10)
            ->get(['id', 'name', 'nickname', 'coins_balance']);

        // Simplificado para evitar erros se a relação achievements não existir
        $mostAchievements = []; 

        return response()->json([
            'most_wins' => $mostWins,
            'most_coins' => $mostCoins,
            'most_achievements' => $mostAchievements
        ]);
    });

});