<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\MatchController;
// Imports
use App\Models\Game;
use App\Models\Achievement;
use Illuminate\Database\QueryException; // Necessário para apanhar o erro

// --- ROTA PÚBLICA (LOGIN) ---
Route::post('/login', [AuthController::class, 'login']);

// --- ROTAS PROTEGIDAS ---
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/users/me', function (Request $request) {
        return $request->user();
    });
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::post('/matches', [MatchController::class, 'store']); 
    Route::get('/history/matches', [MatchController::class, 'index']); 

    Route::get('/scoreboard/personal', [MatchController::class, 'personalScoreboard']);
});

Route::get('/scoreboard/global', [MatchController::class, 'globalScoreboard']);


// ==========================================================================
// ROTA DE CORREÇÃO - VERSÃO FINAL (COM TRY-CATCH)
// ==========================================================================
Route::get('/fix-achievements', function () {
    // 1. Busca jogos com pontuação alta (>90) que tenham IDs válidos
    $games = \App\Models\Game::where('player1_points', '>=', 91)
                 ->whereNotNull('player1_user_id')
                 ->whereNotNull('match_id')
                 ->get();

    $count = 0;
    
    foreach ($games as $game) {
        // 2. Verifica se o User e o Match AINDA existem (para evitar erro de Foreign Key)
        $userExists = \App\Models\User::find($game->player1_user_id);
        $matchExists = \App\Models\MatchModel::find($game->match_id); // Confirma se usas Match ou MatchModel

        if (!$userExists || !$matchExists) {
            continue; // Salta este registo estragado
        }

        // 3. Define o tipo de Prémio
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

        // 4. Tenta criar (com try-catch para não parar se der erro)
        if ($type) {
            try {
                // Verifica duplicados
                $exists = \App\Models\Achievement::where('game_match_id', $game->match_id)
                                     ->where('type', $type)
                                     ->exists();

                if (!$exists) {
                    \App\Models\Achievement::create([
                        'user_id'       => $game->player1_user_id,
                        'game_match_id' => $game->match_id,
                        'type'          => $type,
                        'description'   => $desc
                    ]);
                    $count++;
                }
            } catch (\Exception $e) {
                // Ignora silenciosamente qualquer erro e continua
                continue;
            }
        }
    }

    return "Seeder concluído! Foram criados $count achievements. Vai ver a app!";
});
