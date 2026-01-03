<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB; // Importante para as datas do gráfico
use App\Models\User;
use App\Models\MatchModel;
use App\Models\CoinTransaction;

class UserStatisticsController extends Controller
{
    public function index(Request $request, $id = null)
    {
        // 1. Determinar qual user estamos a ver
        // Se for admin e passar ID, vê o outro user. Senão, vê o próprio.
        $user = $request->user();
        $targetUser = $user;

        if ($id && $user->type === 'A') {
            $targetUser = User::find($id);
            if (!$targetUser) {
                return response()->json(['error' => 'User not found'], 404);
            }
        }

        $userId = $targetUser->id;

        // 2. Valores por defeito (para evitar erros 500 se a DB falhar)
        $totalMatches = 0;
        $wins = 0;
        $losses = 0;
        $winRate = 0;
        $coinsWon = 0;
        $coinsLost = 0;
        $chartData = [];

        try {
            // --- CÁLCULOS DE JOGO ---

            // Total Jogos: Jogador 1 OU Jogador 2, e o jogo tem vencedor definido
            $totalMatches = MatchModel::where(function ($q) use ($userId) {
                $q->where('player1_user_id', $userId)
                    ->orWhere('player2_user_id', $userId);
            })->whereNotNull('winner_user_id')->count();

            // Vitórias
            $wins = MatchModel::where('winner_user_id', $userId)->count();

            // Derrotas (Se existir a coluna loser_user_id, senão calcula pela diferença)
            $losses = MatchModel::where('loser_user_id', $userId)->count();

            // Win Rate
            if ($totalMatches > 0) {
                $winRate = round(($wins / $totalMatches) * 100, 1);
            }

            // --- CÁLCULOS FINANCEIROS ---

            // Moedas Ganhas (Créditos que não sejam compras na loja)
            // Assumimos que compras têm type ou custom source específico. 
            // Aqui filtramos genericamente onde coins > 0.
            $coinsWon = CoinTransaction::where('user_id', $userId)
                ->where('coins', '>', 0)
                // Opcional: filtrar apenas ganhos de jogo se tiveres types específicos
                ->sum('coins');

            // Moedas Perdidas (Débitos, ex: taxas de jogo, compras de itens)
            $coinsLost = CoinTransaction::where('user_id', $userId)
                ->where('coins', '<', 0)
                ->sum('coins');

            // --- DADOS PARA O GRÁFICO (Últimos 7 dias) ---
            // Usa DATE() que funciona em MySQL
            $chartData = CoinTransaction::select(
                DB::raw('DATE(transaction_datetime) as date'),
                DB::raw('SUM(coins) as total')
            )
                ->where('user_id', $userId)
                ->where('transaction_datetime', '>=', now()->subDays(7))
                ->groupBy('date')
                ->orderBy('date', 'asc')
                ->get();

        } catch (\Exception $e) {
            // Se der erro (ex: tabela não existe), fazemos log mas não crashamos a app
            \Illuminate\Support\Facades\Log::error("Erro Stats: " . $e->getMessage());
        }

        // 3. Retornar JSON
        return response()->json([
            'user' => [
                'id' => $targetUser->id,
                'name' => $targetUser->name,
                'nickname' => $targetUser->nickname,
                'photo_avatar_filename' => $targetUser->photo_avatar_filename,
                'coins_balance' => $targetUser->coins_balance,
            ],
            'total_matches' => $totalMatches,
            'wins' => $wins,
            'losses' => $losses,
            'win_rate' => $winRate,
            'coins_won' => (int) $coinsWon,
            'coins_lost' => abs((int) $coinsLost),
            'chart_data' => $chartData
        ]);
    }
}