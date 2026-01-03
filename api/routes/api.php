<?php

use App\Http\Controllers\UserStatisticsController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

// Importação dos Controladores
use App\Http\Controllers\AuthController;
use App\Http\Controllers\MatchController;
use App\Http\Controllers\CoinController;
use App\Http\Controllers\ShopController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\GameController;

/*
|--------------------------------------------------------------------------
| ROTAS PÚBLICAS (Abertas ou usadas pelo Node.js)
|--------------------------------------------------------------------------
*/

Route::post('/login', [AuthController::class, 'login'])->name('login');
Route::post('/auth/register', [AuthController::class, 'register'])->name('register');

// Recursos Loja
Route::get('/image-proxy/{filename}', [ShopController::class, 'getImage']);
Route::get('/card-image-proxy/{filename}', [ShopController::class, 'getCardImage']);
Route::get('/shop', [ShopController::class, 'index']);

// Scoreboards Públicos
Route::get('/scoreboard/global', [MatchController::class, 'globalScoreboard']);
Route::get('/scoreboard/user-rank', [MatchController::class, 'getUserRank']);

// Transaction Types (for filtering)
Route::get('/coin-transaction-types', [AdminController::class, 'getTransactionTypes']);

// *** ROTA CRÍTICA PARA O NODE.JS (MULTIPLAYER) ***
Route::post('/game/settle', [MatchController::class, 'settleBet']);
Route::patch('/matches/{id}', [MatchController::class, 'updateMatch']);
Route::patch('/games/{id}/status', [GameController::class, 'updateGameStatus']);

// Health Check
Route::get('/status', function () {
    $status = ['api' => 'ok'];
    try {
        DB::select('SELECT 1');
        $status['database'] = 'ok';
    } catch (\Throwable $e) {
        $status['database'] = 'error';
    }
    return response()->json(['status' => $status, 'timestamp' => now()->toISOString()], 200);
});

/*
|--------------------------------------------------------------------------
| ROTAS PROTEGIDAS (Requerem Login)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    // User Profile
    Route::get('/users/me', function (Request $request) {
        return $request->user();
    });
    Route::put('/users/me', [AuthController::class, 'updateProfile']);
    Route::delete('/users/me', [AuthController::class, 'deleteAccount']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Jogo MultiPlayer
    Route::get('/games/{id}', [GameController::class, 'show']);
    Route::post('/games/create-multiplayer', [GameController::class, 'createMultiplayerGame']);
    Route::post('/game/settle', [GameController::class, 'settleBet']);

    // Match (Partida Multiplayer)
    Route::post('/matches', [MatchController::class, 'createMatch']);


    // Histórico e Stats
    Route::get('/history/matches', [MatchController::class, 'index']);

    // Estatísticas
    Route::get('/me/statistics', [UserStatisticsController::class, 'index']);
    Route::get('/scoreboard/personal', [MatchController::class, 'personalScoreboard']);

    // Moedas e Achievements
    Route::get('/me/coins', [CoinController::class, 'getBalance']);
    Route::get('/me/coin-transactions', [CoinController::class, 'getTransactions']);
    Route::get('/me/achievements', [AuthController::class, 'getAchievements']);

    // Loja (Ações)
    Route::post('/shop/buy', [ShopController::class, 'buy']);
    Route::post('/shop/purchase', [ShopController::class, 'purchase']);
    Route::post('/shop/equip', [ShopController::class, 'equip']);

    // --- ÁREA DE ADMINISTRAÇÃO ---
    Route::middleware('admin')->group(function () {

        // Histórico Global
        Route::get('/admin/history', [MatchController::class, 'index']);
        Route::get('/admin/transactions', [AdminController::class, 'listTransactions']);
        Route::get('/admin/games', [AdminController::class, 'listGames']);

        // Gestão de Users
        Route::get('/admin/users', [AdminController::class, 'listUsers']);
        Route::post('/admin/users', [AdminController::class, 'createAdmin']);
        Route::patch('/admin/users/{id}/block', [AdminController::class, 'blockUser']);
        Route::patch('/admin/users/{id}/unblock', [AdminController::class, 'unblockUser']);
        Route::delete('/admin/users/{id}', [AdminController::class, 'deleteUser']);

        // Estatísticas Globais
        Route::get('/statistics/global', [AdminController::class, 'getGlobalStats']);

        // Ver stats de um user específico
        Route::get('/admin/users/{id}/stats', [UserStatisticsController::class, 'index']);
    });
});
