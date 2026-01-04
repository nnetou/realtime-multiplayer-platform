<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\MatchModel;
use App\Models\CoinTransaction;

class UserStatisticsController extends Controller
{
    public function index(Request $request, $id = null)
    {
        $user = $request->user();
        $targetUser = $user;

        if ($id && $user->type === 'A') {
            $targetUser = User::find($id);
            if (!$targetUser) {
                return response()->json(['error' => 'User not found'], 404);
            }
        }

        $userId = $targetUser->id;

        $totalMatches = 0;
        $wins = 0;
        $losses = 0;
        $winRate = 0;
        $coinsWon = 0;
        $coinsLost = 0;
        $chartData = [];

        try {
            $totalMatches = MatchModel::where(function ($q) use ($userId) {
                $q->where('player1_user_id', $userId)
                    ->orWhere('player2_user_id', $userId);
            })->whereNotNull('winner_user_id')->count();

            $wins = MatchModel::where('winner_user_id', $userId)->count();

            $losses = MatchModel::where('loser_user_id', $userId)->count();

            if ($totalMatches > 0) {
                $winRate = round(($wins / $totalMatches) * 100, 1);
            }

            $coinsWon = CoinTransaction::where('user_id', $userId)
                ->where('coins', '>', 0)
                ->sum('coins');

            $coinsLost = CoinTransaction::where('user_id', $userId)
                ->where('coins', '<', 0)
                ->sum('coins');

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
            \Illuminate\Support\Facades\Log::error("Erro Stats: " . $e->getMessage());
        }

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