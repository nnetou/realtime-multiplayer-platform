<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB; // <--- OBRIGATÓRIO PARA A SOMA DOS EUROS
use App\Models\User;
use App\Models\MatchModel;
use App\Models\CoinPurchase;

class AdminController extends Controller
{
    // --- FUNÇÕES DE GESTÃO DE USERS ---

    public function listUsers(Request $request)
    {
        $perPage = $request->query('per_page', 15);
        $query = User::withTrashed();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('nickname', 'like', "%{$search}%");
            });
        }

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($status = $request->query('status')) {
            if ($status === 'active') {
                $query->where('blocked', false);
            } elseif ($status === 'blocked') {
                $query->where('blocked', true);
            }
        }

        if ($deleted = $request->query('deleted')) {
            if ($deleted === 'yes') {
                $query->whereNotNull('deleted_at');
            } elseif ($deleted === 'no') {
                $query->whereNull('deleted_at');
            }
        }

        $users = $query->paginate($perPage);
        return response()->json($users);
    }

    public function blockUser(Request $request, $id)
    {
        $user = User::findOrFail($id);
        if ($request->user()->id === $user->id) {
            return response()->json(['error' => 'Cannot block yourself'], 422);
        }
        $user->update(['blocked' => true]);
        return response()->json(['message' => 'User blocked successfully', 'user' => $user]);
    }

    public function unblockUser(Request $request, $id)
    {
        $user = User::findOrFail($id);
        if ($request->user()->id === $user->id) {
            return response()->json(['error' => 'Cannot unblock yourself'], 422);
        }
        $user->update(['blocked' => false]);
        return response()->json(['message' => 'User unblocked successfully', 'user' => $user]);
    }

    public function deleteUser(Request $request, $id)
    {
        $user = User::findOrFail($id);
        if ($request->user()->id === $user->id) {
            return response()->json(['error' => 'Cannot delete yourself'], 422);
        }
        if ($user->type === 'A') {
            return response()->json(['error' => 'Cannot delete admin users'], 422);
        }
        $user->tokens()->delete();
        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }

    public function createAdmin(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:users,name',
            'email' => 'required|email|unique:users,email',
            'nickname' => 'required|string|max:20|unique:users,nickname|regex:/^\S+$/',
            'password' => 'required|string|min:3',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'nickname' => $request->nickname,
            'password' => Hash::make($request->password),
            'type' => 'A',
            'coins_balance' => 0,
        ]);

        return response()->json(['message' => 'Admin user created successfully', 'user' => $user], 201);
    }

    // --- ESTATÍSTICAS GLOBAIS ---
    public function getGlobalStats(Request $request)
    {
        $isAdmin = $request->user()->type === 'A';

        // 1. Dados Básicos (Totais)
        $totalUsers = User::where('type', 'P')->count();
        $totalGames = MatchModel::count(); // Ou Game::count() dependendo do seu Model
        $totalCoinsInCirculation = User::sum('coins_balance');

        // --- A CORREÇÃO ESTÁ AQUI: SOMA DOS EUROS NA TABELA coin_purchases ---
        $totalEur = DB::table('coin_purchases')->sum('euros');

        $response = [
            'total_users' => $totalUsers,
            'total_games' => $totalGames,
            'total_coins' => $totalCoinsInCirculation,
            'total_eur' => $totalEur, // <--- Enviado para o Frontend (Cartão Roxo)
        ];

        // 2. Dados Avançados (APENAS ADMIN)
        if ($isAdmin) {
            $purchases = [];
            $games = [];

            // --- GRÁFICO 1: COMPRAS (Últimos 12 Meses) ---
            try {
                // Verifica se o Model existe, senão usa DB::table
                if (class_exists(CoinPurchase::class)) {
                    $rawPurchases = CoinPurchase::where('purchase_datetime', '>=', now()->subMonths(12))
                        ->orderBy('purchase_datetime')
                        ->get();

                    // Agrupa por Mês (YYYY-MM)
                    $purchases = $rawPurchases->groupBy(function ($item) {
                        return $item->purchase_datetime ? $item->purchase_datetime->format('Y-m') : 'N/A';
                    })->map(function ($group, $key) {
                        return [
                            'month' => $key,
                            'total' => $group->sum('euros'),
                            'count' => $group->count()
                        ];
                    })->values();
                } else {
                    // Fallback se não tiver Model (Usa DB Query Builder)
                    $rawPurchases = DB::table('coin_purchases')
                        ->where('purchase_datetime', '>=', now()->subMonths(12))
                        ->orderBy('purchase_datetime')
                        ->get();

                    // Lógica de agrupamento manual se necessário...
                    // (Mantive a lógica do Model acima pois parece que você o tem)
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Erro Stats Compras: " . $e->getMessage());
            }

            // --- GRÁFICO 2: JOGOS (Últimos 30 Dias) ---
            try {
                $rawGames = MatchModel::where('began_at', '>=', now()->subDays(30))
                    ->orderBy('began_at')
                    ->get();

                // Agrupa por Dia (YYYY-MM-DD)
                $games = $rawGames->groupBy(function ($item) {
                    return $item->began_at ? $item->began_at->format('Y-m-d') : 'N/A';
                })->map(function ($group, $key) {
                    return [
                        'date' => $key,
                        'count' => $group->count()
                    ];
                })->values();
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("Erro Stats Jogos: " . $e->getMessage());
            }

            $response['admin_charts'] = [
                'purchases' => $purchases,
                'games_activity' => $games
            ];
        }

        return response()->json($response);
    }
}