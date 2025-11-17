<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GameMatchController;
use App\Http\Controllers\CartasController;
use App\Models\GameMatch;
use App\Models\User;

// ------------------------------
// AUTH
// ------------------------------
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {

    Route::get('/users/me', function (Request $request) {
        return $request->user();
    });

    Route::post('/logout', [AuthController::class, 'logout']);

    // ------------------------------
    // US6 - HISTORY & SCOREBOARDS
    // ------------------------------

    // HISTORY - Lista de partidas do utilizador com filtros
    Route::get('/history/matches', function (Request $request) {
        $user = $request->user();

        $query = GameMatch::where(function($q) use ($user) {
                $q->where('player1_user_id', $user->id)
                  ->orWhere('player2_user_id', $user->id);
            })
            ->where('status', 'Ended')
            ->with(['player1', 'player2', 'winner', 'loser', 'games']);

        // Filtros
        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->has('result')) {
            if ($request->result === 'win') {
                $query->where('winner_user_id', $user->id);
            } elseif ($request->result === 'loss') {
                $query->where('loser_user_id', $user->id);
            }
        }

        // Ordenação
        $orderBy = $request->get('order_by', 'created_at');
        $orderDir = $request->get('order_dir', 'desc');
        $query->orderBy($orderBy, $orderDir);

        $matches = $query->get();

        return response()->json($matches);
    });

    // HISTORY - Detalhes de uma partida específica com breakdown
    Route::get('/history/matches/{id}', function (Request $request, $id) {
        $user = $request->user();

        $match = GameMatch::where('id', $id)
            ->where(function($q) use ($user) {
                $q->where('player1_user_id', $user->id)
                  ->orWhere('player2_user_id', $user->id);
            })
            ->with(['player1', 'player2', 'winner', 'loser', 'games'])
            ->firstOrFail();

        // Trick-by-trick breakdown (se estiver guardado no campo 'custom')
        $breakdown = $match->custom['trick_breakdown'] ?? [];

        return response()->json([
            'match' => $match,
            'trick_breakdown' => $breakdown
        ]);
    });

    // SCOREBOARD - Personal Bests
    Route::get('/scoreboard/personal', function (Request $request) {
        $user = $request->user();

        // Estatísticas básicas
        $totalMatches = GameMatch::where(function($query) use ($user) {
            $query->where('player1_user_id', $user->id)
                  ->orWhere('player2_user_id', $user->id);
        })->where('status', 'Ended')->count();

        $wonMatches = GameMatch::where('winner_user_id', $user->id)
            ->where('status', 'Ended')->count();

        // Capote (2+ marks)
        $capoteCount = GameMatch::where('winner_user_id', $user->id)
            ->where('status', 'Ended')
            ->where(function($q) {
                $q->where('player1_marks', '>=', 2)
                  ->orWhere('player2_marks', '>=', 2);
            })
            ->count();

        // Bandeira (120 points)
        $bandeiraCount = GameMatch::where('winner_user_id', $user->id)
            ->where('status', 'Ended')
            ->where(function($q) {
                $q->where('player1_points', 120)
                  ->orWhere('player2_points', 120);
            })
            ->count();

        return response()->json([
            'total_matches' => $totalMatches,
            'won_matches' => $wonMatches,
            'lost_matches' => $totalMatches - $wonMatches,
            'win_rate' => $totalMatches > 0 ? round(($wonMatches / $totalMatches) * 100, 2) : 0,
            'capote_count' => $capoteCount,
            'bandeira_count' => $bandeiraCount,
            'coins_balance' => $user->coins_balance,
        ]);
    });

    // SCOREBOARD - Global Rankings
    Route::get('/scoreboard/global', function () {

        $mostWins = User::where('type', 'P')
            ->withCount(['matchesWon' => function ($q) {
                $q->where('status', 'Ended');
            }])
            ->orderByDesc('matches_won_count')
            ->take(10)
            ->get([
                'id',
                'name',
                'nickname',
                'matches_won_count'
            ]);

        $mostCoins = User::where('type', 'P')
            ->orderByDesc('coins_balance')
            ->take(10)
            ->get([
                'id',
                'name',
                'nickname',
                'coins_balance'
            ]);

        $mostAchievements = User::where('type', 'P')
            ->withCount(['matchesWon as achievements_count' => function ($q) {
                $q->where('status', 'Ended')
                ->where(function ($query) {
                    // Capote
                    $query->where(function ($sub) {
                        $sub->where('player1_points', 4)->where('player2_points', 0);
                    })->orWhere(function ($sub) {
                        $sub->where('player2_points', 4)->where('player1_points', 0);
                    })
                    // Bandeira
                    ->orWhere('player1_points', 120)
                    ->orWhere('player2_points', 120);
                });
            }])
            ->orderByDesc('achievements_count')
            ->take(10)
            ->get([
                'id',
                'name',
                'nickname',
                'achievements_count'
            ]);


        return response()->json([
            'most_wins'         => $mostWins,
            'most_coins'        => $mostCoins,
            'most_achievements' => $mostAchievements
        ]);
});

});

// ------------------------------
// METADATA
// ------------------------------
Route::get('/metadata', function () {
    return [
        "name"    => "DAD 2025/26 Project API",
        "version" => "0.0.1"
    ];
});

// ------------------------------
// GAME MATCHES
// ------------------------------
Route::get('/game-matches', [GameMatchController::class, 'index']);
Route::post('/game-matches', [GameMatchController::class, 'store']);
Route::get('/game-matches/{id}', [GameMatchController::class, 'show']);
Route::put('/game-matches/{id}', [GameMatchController::class, 'update']);
Route::delete('/game-matches/{id}', [GameMatchController::class, 'destroy']);

// ------------------------------
// CARTAS
// ------------------------------
Route::get('/cartas', [CartasController::class, 'index']);
Route::get('/baralho', [CartasController::class, 'baralho']);
