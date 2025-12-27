<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\MatchController;
use App\Http\Controllers\CoinController;
use App\Http\Controllers\ShopController;

// 1. LOGIN
Route::post('/login', [AuthController::class, 'login'])->name('login');

// 2. ROTAS PÚBLICAS
Route::get('/image-proxy/{filename}', [ShopController::class, 'getImage']);
Route::get('/card-image-proxy/{filename}', [ShopController::class, 'getCardImage']);
Route::get('/scoreboard/global', [MatchController::class, 'globalScoreboard']);
// Só para checkar o estado da API na página de About
Route::get('/status', function () {
    $status = ['api' => 'ok'];
    try {
        DB::select('SELECT 1');
        $status['database'] = 'ok';
    } catch (\Throwable $e) {
        $status['database'] = 'error';
    }

    return response()->json([
        'status' => $status,
        'timestamp' => now()->toISOString(),
    ], 200);
});

// *** IMPORTANTE: Esta rota deve estar AQUI (Pública) ***
Route::get('/shop', [ShopController::class, 'index']);

// 3. ROTAS PROTEGIDAS
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/users/me', function (Request $request) {
        return $request->user();
    });
    Route::put('/users/me', [AuthController::class, 'updateProfile']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::post('/matches', [MatchController::class, 'store']);
    Route::get('/history/matches', [MatchController::class, 'index']);
    Route::get('/scoreboard/personal', [MatchController::class, 'personalScoreboard']);

    Route::get('/me/coins', [CoinController::class, 'getBalance']);
    Route::get('/me/coin-transactions', [CoinController::class, 'getTransactions']);
    Route::get('/me/achievements', [AuthController::class, 'getAchievements']);
    Route::post('/me/account/delete', [AuthController::class, 'deleteAccount']);

    // Ações de compra continuam protegidas
    Route::post('/shop/buy', [ShopController::class, 'buy']);
    Route::post('/shop/equip', [ShopController::class, 'equip']);
});

// Para confirmar que a API está funcionando
