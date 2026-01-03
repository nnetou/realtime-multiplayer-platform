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

        // 1. Transações de Jogo e Loja (Tabela coin_transactions)
        $gameTransactions = CoinTransaction::with('type')
            ->where('user_id', $userId)
            ->get()
            ->map(function ($t) {
                $typeName = $t->type->name ?? 'Transaction';
                $isDebit = false;

                // --- LÓGICA DE DÉBITO CORRIGIDA ---
                
                // 1. Confiar na base de dados se tiver tipo 'D'
                if (($t->type->type ?? '') === 'D') $isDebit = true;
                
                // 2. Taxas de jogo são débitos
                if (stripos($typeName, 'fee') !== false) $isDebit = true; 
                
                // 3. CORREÇÃO AQUI: 
                // Apenas 'Item Purchase' (Loja) é débito.
                // 'Coin purchase' (Dinheiro -> Moedas) NÃO é débito, é crédito.
                if (stripos($typeName, 'Item Purchase') !== false) $isDebit = true;

                return [
                    'id' => 'game_' . $t->id,
                    'type' => $typeName,
                    'amount' => $isDebit ? -abs($t->coins) : abs($t->coins),
                    'date' => $t->transaction_datetime,
                    'description' => $t->custom['source'] ?? 'System',
                    'category' => 'game' // Categoria 'game' usa o ícone da moeda
                ];
            });

        // 2. Registos de Pagamento em Euros (Tabela coin_purchases)
        // Serve apenas como "recibo" do pagamento em dinheiro real
        $purchases = CoinPurchase::where('user_id', $userId)
            ->get()
            ->map(function ($p) {
                return [
                    'id' => 'purchase_' . $p->id,
                    'type' => 'Coin Pack',
                    // Mostra o valor em Euros positivo
                    'amount' => abs($p->euros), 
                    'currency' => 'EUR', 
                    'date' => $p->purchase_datetime,
                    'description' => 'Payment: ' . ($p->payment_type ?? 'MB'),
                    'category' => 'purchase' // Categoria 'purchase' usa o símbolo €/MB
                ];
            });

        // Junta e ordena por data (mais recente primeiro)
        $all = $gameTransactions->concat($purchases)->sortByDesc('date')->values();

        return response()->json($all);
    }
}