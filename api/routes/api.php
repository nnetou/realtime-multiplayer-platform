<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GameMatchController;
use App\Http\Controllers\CartasController;

// ------------------------------
// AUTH
// ------------------------------
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {

    Route::get('/users/me', function (Request $request) {
        return $request->user();
    });

    Route::post('/logout', [AuthController::class, 'logout']);
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
