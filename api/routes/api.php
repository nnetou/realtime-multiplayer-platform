<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GameController;
use App\Http\Controllers\MatchController;
use App\Http\Controllers\ShopController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\GameController;
// use App\Http\Controllers\UserStatisticsController; // Comenta isto se não tiveres o ficheiro

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

// Recursos Loja
Route::get('/image-proxy/{filename}', [ShopController::class, 'getImage']);
Route::get('/card-image-proxy/{filename}', [ShopController::class, 'getCardImage']);
Route::get('/shop', [ShopController::class, 'index']);

// Scoreboards Públicos
Route::get('/scoreboard/global', [MatchController::class, 'globalScoreboard']);

// Transaction Types (for filtering)
Route::get('/coin-transaction-types', [AdminController::class, 'getTransactionTypes']);

// *** ROTA CRÍTICA PARA O NODE.JS (MULTIPLAYER) ***
// Tem de ser pública porque o Node.js não envia token de utilizador
Route::post('/game/settle', [MatchController::class, 'settleBet']);

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

    // ---------- AUTH ----------
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/users/me', [AuthController::class, 'me']);
    Route::put('/users/me', [AuthController::class, 'update']);

    // ---------- SHOP ----------
    Route::get('/shop', [ShopController::class, 'index']);
    Route::post('/shop/buy', [ShopController::class, 'buy']);          // compra de itens (coins)
    Route::post('/shop/purchase', [ShopController::class, 'purchase']); // compra de coins (gateway)
    // Jogo MultiPlayer (Guarda o resultado enviado pelo cliente)
    //Game (Match null)
    Route::get('/games/{id}', [GameController::class, 'show']);
    Route::post('/games/create-multiplayer', [GameController::class, 'createMultiplayerGame']); // <-- ADICIONAR ESTA LINHA
    Route::post('/game/settle', [GameController::class, 'settleBet']);



    // Histórico e Stats
    Route::get('/history/matches', [MatchController::class, 'index']);

    // Mapeamento das Estatísticas Pessoais (Usamos o MatchController que já tem a lógica)
    //Route::get('/me/statistics', [MatchController::class, 'personalScoreboard']);
    Route::get('/me/statistics', [UserStatisticsController::class, 'index']);
    Route::get('/scoreboard/personal', [MatchController::class, 'personalScoreboard']);

    // Moedas e Achievements
    Route::get('/me/coins', [CoinController::class, 'getBalance']);
    Route::get('/me/coin-transactions', [CoinController::class, 'getTransactions']);
    Route::get('/me/achievements', [AuthController::class, 'getAchievements']);

    // Loja (Ações)
    Route::post('/shop/buy', [ShopController::class, 'buy']);
    Route::post('/shop/equip', [ShopController::class, 'equip']);

    // ---------- IMAGENS (proxy) ----------
    Route::get('/image-proxy/{filename}', [ShopController::class, 'getImage']);
    Route::get('/card-image-proxy/{filename}', [ShopController::class, 'getCardImage']);

        // Histórico Global
        Route::get('/admin/history', [MatchController::class, 'index']); // Reutiliza index (filtra tudo se for admin)
        Route::get('/admin/transactions', [AdminController::class, 'listTransactions']); // Novo: Transações globais
        Route::get('/admin/games', [AdminController::class, 'listGames']); // Novo: Jogos globais

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
