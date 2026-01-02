<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CoinTransaction;
use App\Models\CoinPurchase;

class CoinController extends Controller
{
    public function getBalance(Request $request)
    {
        $userId = $request->user()->id;

        $credits = CoinTransaction::where('user_id', $userId)
            ->whereHas('type', function ($q) {
                $q->where('type', 'C');
            })
            ->sum('coins');

        $debits = CoinTransaction::where('user_id', $userId)
            ->whereHas('type', function ($q) {
                $q->where('type', 'D');
            })
            ->sum('coins');

        return response()->json([
            'balance' => $credits - $debits
        ]);
    }

    public function getTransactions(Request $request)
    {
        $userId = $request->user()->id;

        // 1. Buscar transações de jogo (Ganhos/Perdas/Bónus)
        $gameTransactions = CoinTransaction::with('type')
            ->where('user_id', $userId)
            ->get()
            ->map(function ($t) {
                return [
                    'id' => 'game_' . $t->id,
                    'type' => $t->type->name ?? 'Game Transaction',
                    'amount' => $t->type->type === 'D' ? -$t->coins : $t->coins, // D = Débito (negativo)
                    'date' => $t->transaction_datetime,
                    'description' => $t->custom['source'] ?? 'Game/System',
                    'category' => 'game'
                ];
            });

        // 2. Buscar compras de moedas (Dinheiro Real)
        $purchases = CoinPurchase::where('user_id', $userId)
            ->get()
            ->map(function ($p) {
                // Assumindo que 1 Euro = X moedas, ou se a compra regista as moedas noutro lado.
                // Vou assumir que é uma entrada positiva.
                return [
                    'id' => 'purchase_' . $p->id,
                    'type' => 'Store Purchase',
                    'amount' => $p->euros, // Ou converte para moedas se preferires mostrar moedas
                    'currency' => 'EUR', // Indicador visual
                    'date' => $p->purchase_datetime,
                    'description' => 'Payment: ' . $p->payment_type,
                    'category' => 'purchase'
                ];
            });

        // 3. Juntar e Ordenar
        $all = $gameTransactions->concat($purchases)->sortByDesc('date')->values();

        return response()->json($all);
    }
}
