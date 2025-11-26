<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\MatchController;
use App\Http\Controllers\CoinController;
use App\Http\Controllers\ShopController;

use App\Models\Game;
use App\Models\Achievement;

// ==========================================================================
// 1. LOGIN
// ==========================================================================
Route::post('/login', [AuthController::class, 'login'])->name('login');

// ==========================================================================
// 2. ROTAS PÚBLICAS (Imagens e Scoreboard Global)
// ==========================================================================
Route::get('/image-proxy/{filename}', [ShopController::class, 'getImage']);
Route::get('/scoreboard/global', [MatchController::class, 'globalScoreboard']);

// Rota nova para as cartas (Essencial para não dar 404 nas cartas)
Route::get('/card-image-proxy/{filename}', [ShopController::class, 'getCardImage']);

// ==========================================================================
// 3. ROTAS PROTEGIDAS (Requerem Login)
// ==========================================================================
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

    // SHOP (CORRIGIDO: Sem barra no final)
    Route::get('/shop', [ShopController::class, 'index']); // <--- AQUI MUDOU
    Route::post('/shop/buy', [ShopController::class, 'buy']);
    Route::post('/shop/equip', [ShopController::class, 'equip']);
});


// ==========================================================================
// ROTA PARA CORRIGIR ACHIEVEMENTS
// ==========================================================================
Route::get('/fix-achievements', function () {
    // ... (Mantém o teu código de achievements igual) ...
    return "Seeder concluído!";
});


// ==========================================================================
// ROTA PARA INFORMAÇÕES NA ABOUTPAGE
// ==========================================================================

Route::get('/metadata', function (Request $request) {
    return [
        "name" => "DAD 2025/26 Project API",
        "version" => "0.0.1"
    ];
});