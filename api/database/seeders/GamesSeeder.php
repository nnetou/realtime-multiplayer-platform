<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class GamesSeeder extends Seeder
{
    private $ratioStandaloneToMatch = 15;

    private function calculateRandomSeconds($filteredCollection)
    {
        $totalPlayers = $filteredCollection->count() + 1;
        return (12 * 60 * 60) / $totalPlayers + rand(0, 2000);
    }

    private function nextGameDateTime(&$d, $filteredPlayers, $withinSameMatch = false) {
        if ($withinSameMatch) {
            $deltaSegundos = rand(300, 900);
        } else {
            $deltaSegundos = $this->calculateRandomSeconds($filteredPlayers);
        }
        $d->addSeconds($deltaSegundos);
    }

    // --- CORREÇÃO: 20 VAZAS (TRICKS) ---
    private function generateFakeTricks($gameIndex, $p1Score, $p2Score) {
        $tricks = [];
        $pointsDistributed = 0;

        // Bisca 1v1 = 40 cartas / 2 jogadores = 20 vazas
        for ($i = 1; $i <= 20; $i++) {
            
            $points = 0;

            if ($i == 20) {
                // Na última vaza, atribuímos os pontos que faltam para totalizar 120
                $points = max(0, 120 - $pointsDistributed);
            } else {
                // Nas outras, pontos aleatórios (mas baixos, para não esgotar logo)
                // Cartas valem: A(11), 7(10), K(4), J(3), Q(2). Máximo numa vaza é 21 (11+10), mínimo 0.
                // Média segura para distribuição:
                $points = rand(0, 11); 
                
                // Se já estivermos perto de 120, reduz
                if (($pointsDistributed + $points) > 120) {
                    $points = 0;
                }
            }
            
            $pointsDistributed += $points;

            // Decide quem ganhou a vaza baseado na pontuação final do jogo
            // Se o P1 ganhou o jogo, tem mais probabilidade de ganhar cada vaza
            $winner = ($p1Score > $p2Score) 
                ? (rand(0, 100) > 40 ? 'Player' : 'Bot') 
                : (rand(0, 100) > 40 ? 'Bot' : 'Player');

            $tricks[] = [
                'game_index' => $gameIndex, 
                'trick' => $i,
                'winner' => $winner,
                'points' => $points
            ];
        }
        return ['trick_breakdown' => $tricks];
    }

    public function run(): void
    {
        $this->command->info("Games seeder - Start");

        $start = DB::table('users')->where('type', 'P')->min('created_at');
        if (!$start) {
             $this->command->info("No players found. Skipping.");
             return;
        }

        $allPlayers = DB::table('users')->where('type', 'P')->get();
        $sortedPlayers = $allPlayers->sortBy('created_at')->values();

        $d = new \Carbon\Carbon($start);
        $d = $d->addDay();
        $now = \Carbon\Carbon::now();
        
        $games = [];
        $matches = [];
        $achievements = [];

        $i = 0;
        $filteredPlayers = null;
        $filteredPlayersIds = null;
        $nextCreatedAt = null;

        while ($d->lte($now)) {
            $i++;
            if (($filteredPlayers === null) || ($nextCreatedAt === null) || ($d->gte($nextCreatedAt))) {
                $filteredPlayers = $allPlayers->filter(function ($value) use ($d) {
                    return $d->gt($value->created_at);
                });
                $nextCreatedAtPlayer = $sortedPlayers->first(function ($value) use ($d) {
                    return $d->lte($value->created_at);
                });
                $nextCreatedAt = $nextCreatedAtPlayer ? $nextCreatedAtPlayer->created_at : new \Carbon\Carbon('9999-12-31');
                $filteredPlayersIds = $filteredPlayers->pluck('id')->toArray();
            }

            if ($filteredPlayersIds === null || empty($filteredPlayersIds) || count($filteredPlayersIds) <2) {
                $this->nextGameDateTime($d, $filteredPlayers);
                continue;
            }

            $userIdKeys = array_rand($filteredPlayersIds, 2);
            $userIDPlayer1 = $filteredPlayersIds[$userIdKeys[0]];
            $userIDPlayer2 = $filteredPlayersIds[$userIdKeys[1]];

            if ($userIDPlayer1 == $userIDPlayer2) {
                $this->nextGameDateTime($d, $filteredPlayers);
                continue;
            }
            
            $match = null;
            if (rand(1, $this->ratioStandaloneToMatch) === 1) {
                $match = $this->newMatch($filteredPlayers, $userIDPlayer1, $userIDPlayer2, $d);
                $playersMarks = [0, 0];
                $playersPoints = [0, 0];
                
                $gameCounter = 1; // Reset contador de jogos do match

                while($playersMarks[0] < 4 && $playersMarks[1] < 4) {
                    $newGame = $this->newGame($filteredPlayers, $match, $userIDPlayer1, $userIDPlayer2, $d, $gameCounter);
                    $games[] = $newGame;
                    
                    $ach = $this->checkAchievement($newGame);
                    if ($ach) $achievements[] = $ach;

                    $playersPoints[0] += $newGame['player1_points'];
                    $playersPoints[1] += $newGame['player2_points'];
                    
                    if ($newGame['player1_points'] > $newGame['player2_points']) {
                        if ($newGame['player1_points'] >= 120) $playersMarks[0]+= 4;
                        elseif ($newGame['player1_points'] >= 91) $playersMarks[0] += 2;
                        else $playersMarks[0]++;
                    } elseif ($newGame['player2_points'] > $newGame['player1_points']) {
                        if ($newGame['player2_points'] >= 120) $playersMarks[1]+= 4;
                        elseif ($newGame['player2_points'] >= 91) $playersMarks[1] += 2;
                        else $playersMarks[1]++;
                    }
                    $gameCounter++;
                }
                $this->updateMatchWinner($match, $playersMarks[0], $playersMarks[1], $playersPoints[0], $playersPoints[1], $d);
                $matches[] = $match;
            } else {
                // Single Game -> Index é sempre 1
                $newGame = $this->newGame($filteredPlayers, $match, $userIDPlayer1, $userIDPlayer2, $d, 1);
                $games[] = $newGame;
                $ach = $this->checkAchievement($newGame);
                if ($ach) $achievements[] = $ach;
            }

            if ($i >= 50) { 
                $this->bulkInsert($matches, $games, $achievements);
                $matches = []; $games = []; $achievements = [];
                $i = 0;
            }
        }
        $this->bulkInsert($matches, $games, $achievements);
        $this->command->info("Games seeder - End");
    }

    private function bulkInsert($matches, $games, $achievements) {
        if (!empty($matches)) DB::table('matches')->insert($matches);
        if (!empty($games)) DB::table('games')->insert($games);
        if (!empty($achievements)) DB::table('achievements')->insert($achievements);
    }

    private function checkAchievement($game) {
        $type = null; $desc = null; $userId = null;
        if ($game['player1_points'] >= 120) { $type = 'Bandeira'; $desc = 'Bandeira (120 pts)'; $userId = $game['player1_user_id']; } 
        elseif ($game['player1_points'] >= 91) { $type = 'Capote'; $desc = 'Capote (>91 pts)'; $userId = $game['player1_user_id']; } 
        elseif ($game['player2_points'] >= 120) { $type = 'Bandeira'; $desc = 'Bandeira (120 pts)'; $userId = $game['player2_user_id']; } 
        elseif ($game['player2_points'] >= 91) { $type = 'Capote'; $desc = 'Capote (>91 pts)'; $userId = $game['player2_user_id']; }

        if ($type && $userId && isset($game['match_id'])) {
            return [
                'user_id' => $userId,
                'game_match_id' => $game['match_id'],
                'type' => $type,
                'description' => $desc,
                'created_at' => $game['ended_at'],
                'updated_at' => $game['ended_at']
            ];
        }
        return null;
    }

    private $matchID = 0;
    private function newMatch($filteredPlayers,$user1, $user2, $d)
    {
        $this->matchID++;
        $this->nextGameDateTime($d, $filteredPlayers);
        return [
            'id' => $this->matchID,
            'type' => random_int(1,2) == 1 ? '3' : '9', 
            'player1_user_id' => $user1,
            'player2_user_id' => $user2,
            'winner_user_id' => null,
            'loser_user_id' => null,
            'status' => 'Ended',
            'stake' => random_int(1,4) > 1 ? 3 : random_int(4,100),
            'began_at' => $d->copy(),
            'ended_at' => null,
            'total_time' => null,
            'player1_marks' => null,
            'player2_marks' => null,
            'player1_points' => null,
            'player2_points' => null,
            'custom' => null
        ];
    }

    private function updateMatchWinner(&$match, $player1Marks, $player2Marks, $totalPlayers1, $totalPlayers2, $d)
    {
        $match['player1_marks'] = $player1Marks;
        $match['player2_marks'] = $player2Marks;
        $match['player1_points'] = $totalPlayers1;
        $match['player2_points'] = $totalPlayers2;
        $match['ended_at'] = $d->copy();
        $match['total_time'] = $match['began_at']->diffInSeconds($match['ended_at']);
        $match['winner_user_id'] = $player1Marks > $player2Marks ? $match['player1_user_id'] : ($player2Marks > $player1Marks ? $match['player2_user_id'] : null);
        $match['loser_user_id'] = $player1Marks > $player2Marks ? $match['player2_user_id'] : ($player2Marks > $player1Marks ? $match['player1_user_id'] : null);
    }

    private $gameID = 0;
    private function newGame($filteredPlayers, $match, $user1, $user2, $d, $gameIndex)
    {
        $this->gameID++;
        $this->nextGameDateTime($d, $filteredPlayers, $match != null);
        $begin_d = $d->copy();
        $pointsUser1 = rand(0, 120);
        $pointsUser2 = 120 - $pointsUser1;
        $duration = random_int(200, 900);
        $d->addSeconds($duration);

        // GERAR 20 VAZAS
        $tricks = $this->generateFakeTricks($gameIndex, $pointsUser1, $pointsUser2);
        $customJson = json_encode($tricks);

        return [
            'id' => $this->gameID,
            'type' => $match ? $match['type'] : (random_int(1, 2) == 1 ? '3' : '9'),
            'match_id' => $match ? $match['id'] : null,
            'player1_user_id' => $user1,
            'player2_user_id' => $user2,
            'is_draw' => $pointsUser1 == $pointsUser2,
            'winner_user_id' => $pointsUser1 > $pointsUser2 ? $user1 : ($pointsUser2 > $pointsUser1 ? $user2 : null),
            'loser_user_id' => $pointsUser1 < $pointsUser2 ? $user1 : ($pointsUser2 < $pointsUser1 ? $user2 : null),
            'status' => 'Ended',
            'began_at' => $begin_d,
            'ended_at' => $d->copy(),
            'total_time' => $duration,
            'player1_points' => $pointsUser1,
            'player2_points' => $pointsUser2,
            'custom' => $customJson 
        ];
    }
}