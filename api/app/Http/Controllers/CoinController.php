<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CoinTransaction;

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

        $transactions = CoinTransaction::with('type')
            ->where('user_id', $userId)
            ->orderBy('transaction_datetime', 'desc')
            ->get();

        return response()->json($transactions);
    }
}
