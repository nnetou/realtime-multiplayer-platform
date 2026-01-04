<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CoinTransaction;
use App\Models\CoinPurchase;

class CoinController extends Controller
{
    public function getBalance(Request $request)
    {
        return response()->json([
            'balance' => $request->user()->coins_balance
        ]);
    }

    public function getTransactions(Request $request)
    {
        $userId = $request->user()->id;
        $gameTransactions = CoinTransaction::with('type')
            ->where('user_id', $userId)
            ->get()
            ->map(function ($t) {
                $typeName = $t->type->name ?? 'Transaction';
                $isDebit = false;

                if (($t->type->type ?? '') === 'D')
                    $isDebit = true;

                if (stripos($typeName, 'fee') !== false)
                    $isDebit = true;

                if (stripos($typeName, 'Item Purchase') !== false)
                    $isDebit = true;

                return [
                    'id' => 'game_' . $t->id,
                    'type' => $typeName,
                    'amount' => $isDebit ? -abs($t->coins) : abs($t->coins),
                    'date' => $t->transaction_datetime,
                    'description' => $t->custom['source'] ?? 'System',
                    'category' => 'game'
                ];
            });

        $purchases = CoinPurchase::where('user_id', $userId)
            ->get()
            ->map(function ($p) {
                return [
                    'id' => 'purchase_' . $p->id,
                    'type' => 'Coin Pack',
                    'amount' => abs($p->euros),
                    'currency' => 'EUR',
                    'date' => $p->purchase_datetime,
                    'description' => 'Payment: ' . ($p->payment_type ?? 'MB'),
                    'category' => 'purchase'
                ];
            });

        $all = $gameTransactions->concat($purchases)->sortByDesc('date')->values();

        return response()->json($all);
    }
}