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
        // 1. Validação
        $validated = $request->validate([
            'player_score'     => 'required|integer',
            'opponent_score'   => 'required|integer',
            'winner'           => 'required|string',
            'duration_seconds' => 'required|integer',
            'custom'           => 'nullable|array',
        ]);

        $user = $request->user();
        $entryFee = 2;

        // O Android envia sempre 'coins_change', logo isto é sempre TRUE
        $isSimulation = isset($validated['custom']['coins_change']);
        $simulationDelta = $isSimulation ? (int)$validated['custom']['coins_change'] : 0;

        // Verificação de saldo básico
        if ($user->coins_balance < $entryFee && $simulationDelta < 0) {
            return response()->json([
                'error'           => 'Saldo insuficiente.',
                'required_coins'  => $entryFee,
            ], 402);
        }

        // Criar ou obter o Bot
        $bot = User::firstOrCreate(
            ['nickname' => 'Bot'],
            ['name' => 'System Bot', 'email' => 'bot@sys.com', 'password' => '123', 'type' => 'P']
        );

        try {
            return DB::transaction(function () use ($validated, $user, $bot, $simulationDelta) {

                // --- PASSO 1: CRIAR O MATCH ---
                $match = new MatchModel();
                $match->type = '3';
                $match->status = 'Ended';
                $match->player1_user_id = $user->id;
                $match->player2_user_id = $bot->id;
                $match->timestamps = false;

                // Definir vencedor
                if ($validated['winner'] === 'player') {
                    $match->winner_user_id = $user->id;
                } else {
                    $match->loser_user_id  = $user->id;
                    $match->winner_user_id = $bot->id;
                }

                $match->player1_marks = $validated['player_score'];
                $match->player2_marks = $validated['opponent_score'];
                $match->total_time    = $validated['duration_seconds'];
                $match->began_at      = now()->subSeconds($validated['duration_seconds']);
                $match->ended_at      = now();
                $match->stake         = $simulationDelta; // Grava quanto se ganhou/perdeu
                $match->save();

                // --- PASSO 2: GRAVAR OS DETALHES (TRICKS) ---
                // (Isto estava a ser ignorado antes, agora corre SEMPRE)
                if (!empty($validated['custom']['trick_breakdown'])) {
                    $trickBreakdown = $validated['custom']['trick_breakdown'];
                    
                    // Agrupar tricks por jogo (game_index)
                    $gamesData = [];
                    foreach ($trickBreakdown as $trick) {
                        $idx = $trick['game_index'] ?? 1;
                        $gamesData[$idx][] = $trick;
                    }

                    foreach ($gamesData as $idx => $tricks) {
                        $game = new Game();
                        $game->match_id = $match->id;
                        $game->type = '3';
                        $game->player1_user_id = $user->id;
                        $game->player2_user_id = $bot->id;
                        $game->status = 'Ended';
                        $game->began_at = $match->began_at;
                        $game->ended_at = $match->ended_at;
                        $game->total_time = $match->total_time;
                        $game->timestamps = false;

                        $pPoints = 0;
                        $bPoints = 0;

                        // Calcular pontos deste jogo específico
                        foreach ($tricks as $t) {
                            if (strtolower($t['winner'] ?? '') === 'player') {
                                $pPoints += ($t['points'] ?? 0);
                            } else {
                                $bPoints += ($t['points'] ?? 0);
                            }
                        }

                        $game->player1_points = $pPoints;
                        $game->player2_points = $bPoints;

                        if ($pPoints > $bPoints) {
                            $game->winner_user_id = $user->id;
                            $game->loser_user_id = $bot->id;
                        } elseif ($bPoints > $pPoints) {
                            $game->winner_user_id = $bot->id;
                            $game->loser_user_id = $user->id;
                        }

                        // Guardar o breakdown no JSON do jogo
                        $game->custom = ['trick_breakdown' => $tricks];
                        $game->save();

                        // --- PASSO 2.1: ACHIEVEMENTS (Agora funcionam!) ---
                        if ($pPoints > $bPoints && $game->winner_user_id == $user->id) {
                            $achType = null;
                            if ($pPoints == 120) $achType = 'Bandeira';
                            elseif ($pPoints >= 91) $achType = 'Capote';

                            if ($achType) {
                                try {
                                    Achievement::firstOrCreate([
                                        'user_id'       => $user->id,
                                        'game_match_id' => $match->id,
                                        'type'          => $achType
                                    ], ['description' => $achType]);
                                } catch (\Exception $e) {}
                            }
                        }
                    }
                }

                // --- PASSO 3: ATUALIZAR MOEDAS ---
                // Só cria transação se houver mudança de valor
                if ($simulationDelta != 0) {
                    $typeName = ($simulationDelta > 0) ? 'Bonus' : 'Game fee';
                    $transType = CoinTransactionType::where('name', $typeName)->first() ?? CoinTransactionType::first();

                    CoinTransaction::create([
                        'user_id'                  => $user->id,
                        'match_id'                 => $match->id,
                        'coin_transaction_type_id' => $transType->id,
                        'coins'                    => abs($simulationDelta),
                        'transaction_datetime'     => now(),
                        'custom'                   => ['source' => 'game_result']
                    ]);
                }

                // Atualizar saldo do user
                $user->coins_balance += $simulationDelta;
                $user->save();
                
                // Retornar o match com os jogos carregados para a App ver
                return $match->load('games');
            });
        } catch (\Exception $e) {
            Log::error('Erro ao guardar match: '.$e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function personalScoreboard(Request $request)
    {
        $user = $request->user();

        $total = MatchModel::where('player1_user_id', $user->id)
                           ->orWhere('player2_user_id', $user->id)
                           ->count();

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
            'most_wins' => User::where('type', 'P')
                ->withCount('matchesWon')
                ->orderByDesc('matches_won_count')
                ->orderByDesc('updated_at')
                ->get(),

            'most_coins' => User::where('type', 'P')
                ->orderByDesc('coins_balance')
                ->orderByDesc('updated_at')
                ->get(),

            'most_achievements' => User::where('type', 'P')
                ->withCount('achievements as achievements_count')
                ->has('achievements')
                ->orderByDesc('achievements_count')
                ->orderByDesc('updated_at')
                ->get(),
        ]);
    }
}