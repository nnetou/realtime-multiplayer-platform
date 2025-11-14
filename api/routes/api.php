<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\GameMatchController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get('/metadata', function (Request $request) {
    return [
        "name" => "DAD 2025/26 Project API",
        "version" => "0.0.1"
    ];
});

Route::get('/game-matches', [GameMatchController::class, 'index']);
Route::post('/game-matches', [GameMatchController::class, 'store']);
Route::get('/game-matches/{id}', [GameMatchController::class, 'show']);
Route::put('/game-matches/{id}', [GameMatchController::class, 'update']);
Route::delete('/game-matches/{id}', [GameMatchController::class, 'destroy']);
