<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GameController;
use App\Http\Controllers\MatchController;
use App\Http\Controllers\ShopController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\UserStatisticsController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| Todas as rotas da API da plataforma Bisca
| Autenticação via Laravel Sanctum
|--------------------------------------------------------------------------
*/

// =======================
// AUTH (público)
// =======================
Route::post('/login', [AuthController::class, 'login']);

// =======================
// ROTAS AUTENTICADAS
// =======================
Route::middleware('auth:sanctum')->group(function () {

    // ---------- AUTH ----------
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/users/me', [AuthController::class, 'me']);
    Route::put('/users/me', [AuthController::class, 'update']);

    // ---------- SHOP ----------
    Route::get('/shop', [ShopController::class, 'index']);
    Route::post('/shop/buy', [ShopController::class, 'buy']);          // compra de itens (coins)
    Route::post('/shop/purchase', [ShopController::class, 'purchase']); // compra de coins (gateway)
    Route::post('/shop/equip', [ShopController::class, 'equip']);

    // ---------- IMAGENS (proxy) ----------
    Route::get('/image-proxy/{filename}', [ShopController::class, 'getImage']);
    Route::get('/card-image-proxy/{filename}', [ShopController::class, 'getCardImage']);

    // ---------- JOGOS / PARTIDAS ----------
    Route::get('/games', [GameController::class, 'index']);
    Route::post('/matches', [MatchController::class, 'store']);

    // ---------- ESTATÍSTICAS ----------
    Route::get('/statistics', [UserStatisticsController::class, 'index']);

    // =======================
    // ADMIN (restrito)
    // =======================
    Route::middleware('isAdmin')->group(function () {
        Route::get('/admin/users', [AdminController::class, 'users']);
        Route::get('/admin/games', [AdminController::class, 'games']);
        Route::get('/admin/transactions', [AdminController::class, 'transactions']);
    });
});
