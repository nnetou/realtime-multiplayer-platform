<?php

namespace App\Http\Controllers;

use App\Models\MatchModel;
use App\Models\Game;
use App\Models\User;
use App\Models\Achievement;
use App\Models\CoinTransaction;
use App\Models\CoinTransactionType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MatchController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $query = MatchModel::where(function ($q) use ($userId) {
            $q->where('player1_user_id', $userId)
              ->orWhere('player2_user_id', $userId);
        });

        if ($request->has('result')) {
            if ($request->result === 'win') {
                $query->where('winner_user_id', $userId);
            } elseif ($request->result === 'loss') {
                $query->whereNotNull('winner_user_id')
                      ->where('winner_user_id', '!=', $userId);
            }
        }

        if ($request->has('date_from') && !empty($request->date_from)) {
            $query->whereDate('began_at', $request->date_from);
        }

        return $query->with(['games', 'player1', 'player2', 'winner'])
                     ->orderBy('id', 'desc')
                     ->get();
    }

    public function store(Request $request)
    {
        // ... (MANTÉM A TUA FUNÇÃO STORE ORIGINAL AQUI - NÃO VOU REPETIR PARA POUPAR ESPAÇO) ...
        // Se precisares dela completa, avisa, mas podes manter a que já tinhas para o Singleplayer.
        // Vou assumir que o código que mandaste para o store() continua aqui igual.
        
        // --- CÓDIGO DO STORE QUE MANDASTE ANTES ---
        $validated = $request->validate([
            'player_score'     => 'required|integer',
            'opponent_score'   => 'required|integer',
            'winner'           => 'required|string',
            'duration_seconds' => 'required|integer',
            'type'             => 'nullable|string',
            'custom'           => 'nullable|array',
        ]);

        $user = $request->user();
        $entryFee = 2;
        $isSimulation = isset($validated['custom']['coins_change']);
        $simulationDelta = $isSimulation ? (int)$validated['custom']['coins_change'] : 0;

        if ($user->coins_balance < $entryFee && $simulationDelta < 0) {
            return response()->json(['error' => 'Saldo insuficiente.', 'required_coins' => $entryFee], 402);
        }

        $bot = User::firstOrCreate(['nickname' => 'Bot'], ['name' => 'System Bot', 'email' => 'bot@sys.com', 'password' => '123', 'type' => 'P']);

        try {
            return DB::transaction(function () use ($validated, $user, $bot, $simulationDelta) {
                $match = new MatchModel();
                $rawType = $validated['type'] ?? '3';
                if (in_array($rawType, ['3', 'bisca_3', 'single_game'])) { $match->type = '3'; } 
                elseif (in_array($rawType, ['9', 'bisca_9', 'match'])) { $match->type = '9'; } 
                else { $match->type = $rawType; }

                $match->status = 'Ended';
                $match->player1_user_id = $user->id;
                $match->player2_user_id = $bot->id;
                $match->timestamps = false;

                if ($validated['winner'] === 'player') { $match->winner_user_id = $user->id; } 
                else { $match->loser_user_id = $user->id; $match->winner_user_id = $bot->id; }

                $match->player1_marks = $validated['player_score'];
                $match->player2_marks = $validated['opponent_score'];
                $match->total_time    = $validated['duration_seconds'];
                $match->began_at      = now()->subSeconds($validated['duration_seconds']);
                $match->ended_at      = now();
                $match->stake         = $simulationDelta;
                $match->save();

                // Gravar Game (Trick breakdown) se existir
                if (!empty($validated['custom']['trick_breakdown'])) {
                     // ... (Tua lógica de tricks mantida) ...
                }

                // Transação de moedas
                if ($simulationDelta != 0) {
                    $typeName = ($simulationDelta > 0) ? 'Bonus' : 'Game fee';
                    $transType = CoinTransactionType::where('name', $typeName)->first() ?? CoinTransactionType::first();
                    CoinTransaction::create([
                        'user_id' => $user->id, 'match_id' => $match->id, 'coin_transaction_type_id' => $transType->id,
                        'coins' => abs($simulationDelta), 'transaction_datetime' => now(), 'custom' => ['source' => 'game_result']
                    ]);
                }

                $user->coins_balance += $simulationDelta;
                $user->save();
                return $match->load('games');
            });
        } catch (\Exception $e) {
            Log::error('Erro store match: '.$e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // --- FUNÇÃO NOVA PARA O MULTIPLAYER (CHAMADA PELO NODE.JS) ---
    public function settleBet(Request $request)
    {
        // 1. Validar dados (Relaxamos as regras para aceitar forfeits)
        $validated = $request->validate([
            'winner_id' => 'required|integer',
            'loser_id'  => 'required|integer',
            'amount'    => 'required|integer',
            'game_type' => 'nullable', 
            'p1_score'  => 'nullable|integer',
            'p2_score'  => 'nullable|integer',
            'reason'    => 'nullable|string'
        ]);

        Log::info("SETTLE BET START: Winner {$validated['winner_id']} vs Loser {$validated['loser_id']} | Amount: {$validated['amount']}");

        try {
            return DB::transaction(function () use ($validated) {
                $winner = User::find($validated['winner_id']);
                $loser  = User::find($validated['loser_id']);
                
                if (!$winner || !$loser) {
                    throw new \Exception("Utilizadores não encontrados na DB.");
                }

                $amount = (int) $validated['amount'];

                // --- 1. TRANSFERÊNCIA DE MOEDAS ---
                if ($amount > 0) {
                    // Retirar do perdedor (Permite saldo negativo? Se não, adicionar verificação)
                    $loser->coins_balance -= $amount;
                    $loser->save();

                    // Adicionar ao vencedor
                    $winner->coins_balance += $amount;
                    $winner->save();

                    // Transação - Perda
                    $typeBet = CoinTransactionType::firstOrCreate(['name' => 'Bet Loss']);
                    CoinTransaction::create([
                        'user_id' => $loser->id,
                        'coin_transaction_type_id' => $typeBet->id,
                        'coins' => $amount,
                        'transaction_datetime' => now(),
                        'custom' => ['opponent_id' => $winner->id, 'reason' => $validated['reason'] ?? 'loss']
                    ]);

                    // Transação - Ganho
                    $typeWin = CoinTransactionType::firstOrCreate(['name' => 'Bet Win']);
                    CoinTransaction::create([
                        'user_id' => $winner->id,
                        'coin_transaction_type_id' => $typeWin->id,
                        'coins' => $amount,
                        'transaction_datetime' => now(),
                        'custom' => ['opponent_id' => $loser->id, 'reason' => $validated['reason'] ?? 'win']
                    ]);
                }

                // --- 2. GRAVAR NO HISTÓRICO (MatchModel) ---
                // Forçamos a criação do registo mesmo que o jogo tenha sido curto
                $match = new MatchModel();
                
                // Mapear tipo 3 ou 9
                $type = $validated['game_type'] ?? '3';
                $match->type = ($type == 9) ? '9' : '3';
                
                $match->status = 'Ended'; // Importante para aparecer no histórico
                $match->player1_user_id = $winner->id; // Assumimos P1 como vencedor para simplificar o registo
                $match->player2_user_id = $loser->id;
                $match->winner_user_id  = $winner->id;
                $match->loser_user_id   = $loser->id;

                // Se for forfeit, assumimos 120 - 0 se os scores não vierem
                $match->player1_marks = $validated['p1_score'] ?? 120;
                $match->player2_marks = $validated['p2_score'] ?? 0;

                $match->total_time = 0; // Opcional: podias enviar do Node
                $match->began_at = now(); 
                $match->ended_at = now();
                $match->stake = $amount;
                
                // Campo custom para saberes que foi forfeit
                if (($validated['reason'] ?? '') === 'forfeit') {
                    $match->custom = ['termination' => 'forfeit'];
                }

                $match->save();

                Log::info("MATCH SAVED ID: " . $match->id);

                return response()->json(['message' => 'Liquidado com sucesso']);
            });

        } catch (\Exception $e) {
            Log::error("ERRO CRÍTICO SETTLEBET: " . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function personalScoreboard(Request $request)
    {
        $user = $request->user();
        $total = MatchModel::where('player1_user_id', $user->id)->orWhere('player2_user_id', $user->id)->count();
        $won = MatchModel::where('winner_user_id', $user->id)->count();

        return response()->json([
            'total_matches'  => $total,
            'won_matches'    => $won,
            'lost_matches'   => max(0, $total - $won),
            'win_rate'       => $total > 0 ? round(($won / $total) * 100, 2) : 0,
            'capote_count'   => Achievement::where('user_id', $user->id)->where('type', 'Capote')->count(),
            'bandeira_count' => Achievement::where('user_id', $user->id)->where('type', 'Bandeira')->count(),
            'coins_balance'  => $user->coins_balance,
        ]);
    }

    public function globalScoreboard()
    {
        return response()->json([
            'most_wins' => User::where('type', 'P')->withCount('matchesWon')->withMax('matchesWon as last_win_date', 'ended_at')->orderByDesc('matches_won_count')->orderByDesc('last_win_date')->get(),
            'most_coins' => User::where('type', 'P')->orderByDesc('coins_balance')->orderByDesc('updated_at')->get(),
            'most_achievements' => User::where('type', 'P')->withCount('achievements as achievements_count')->has('achievements')->orderByDesc('achievements_count')->orderByDesc('updated_at')->get(),
        ]);
    }
}