<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\MatchController;
use App\Http\Controllers\CoinController;

use App\Models\Game;
use App\Models\Achievement;

// LOGIN (público)
Route::post('/login', [AuthController::class, 'login']);

// ROTAS PROTEGIDAS
Route::middleware('auth:sanctum')->group(function () {

    Route::get('/users/me', function (Request $request) {
        return $request->user();
    });

    Route::post('/logout', [AuthController::class, 'logout']);

    // MATCHES
    Route::post('/matches', [MatchController::class, 'store']);
    Route::get('/history/matches', [MatchController::class, 'index']);
    Route::get('/scoreboard/personal', [MatchController::class, 'personalScoreboard']);

    // COINS
    Route::get('/me/coins', [CoinController::class, 'getBalance']);
    Route::get('/me/coin-transactions', [CoinController::class, 'getTransactions']);
});

// SCOREBOARD GLOBAL (não precisa login)
Route::get('/scoreboard/global', [MatchController::class, 'globalScoreboard']);


// ==========================================================================
// ROTA PARA CORRIGIR ACHIEVEMENTS (NÃO TOCAR)
// ==========================================================================
Route::get('/fix-achievements', function () {

    $games = Game::where('player1_points', '>=', 91)
                 ->whereNotNull('player1_user_id')
                 ->whereNotNull('match_id')
                 ->get();

    $count = 0;

    foreach ($games as $game) {
        $userExists  = \App\Models\User::find($game->player1_user_id);
        $matchExists = \App\Models\MatchModel::find($game->match_id);

        if (!$userExists || !$matchExists) {
            continue;
        }

        $points = $game->player1_points;
        $type = null;
        $desc = null;

        if ($points == 120) {
            $type = 'Bandeira';
            $desc = 'Clean Sweep! 120 Points (Bandeira)';
        } elseif ($points >= 91) {
            $type = 'Capote';
            $desc = 'Heavy Win! 91-119 Points (Capote)';
        }

        if ($type) {
            try {
                $exists = Achievement::where('game_match_id', $game->match_id)
                                     ->where('type', $type)
                                     ->exists();

                if (!$exists) {
                    Achievement::create([
                        'user_id'       => $game->player1_user_id,
                        'game_match_id' => $game->match_id,
                        'type'          => $type,
                        'description'   => $desc
                    ]);
                    $count++;
                }
            } catch (\Exception $e) {
                continue;
            }
        }
    }

    return "Seeder concluído! Foram criados $count achievements. Vai ver a app!";
});
