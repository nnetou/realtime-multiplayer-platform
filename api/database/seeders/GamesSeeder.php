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

    // --- NOVA LÓGICA: SIMULAÇÃO DE BARALHO ---
    // Isto garante que:
    // 1. A soma das vazas dá SEMPRE 120.
    // 2. Não existem vazas com pontos impossíveis (ex: 1, 5, 24).
    // 3. A lista bate sempre certo com o resultado final.
    private function generateRealDeckGameData($gameIndex) {
        // 1. Criar Baralho com valores reais da Bisca
        $deckValues = [];
        // 4 naipes x (A, 7, K, J, Q, 6, 5, 4, 3, 2)
        // Valores: 11, 10, 4, 3, 2, 0, 0, 0, 0, 0
        $suitValues = [11, 10, 4, 3, 2, 0, 0, 0, 0, 0];
        
        for ($i = 0; $i < 4; $i++) { // 4 Naipes
            foreach ($suitValues as $val) {
                $deckValues[] = $val;
            }
        }

        // 2. Baralhar
        shuffle($deckValues);

        $tricks = [];
        $p1Total = 0;
        $p2Total = 0;

        // 3. Jogar 20 Vazas
        for ($i = 1; $i <= 20; $i++) {
            // Retira 2 cartas do baralho
            $card1 = array_pop($deckValues);
            $card2 = array_pop($deckValues);
            
            $points = $card1 + $card2;

            // Decide vencedor aleatoriamente (podes ajustar o peso para equilibrar)
            $winner = (rand(0, 100) > 50) ? 'Player' : 'Bot';

            if ($winner === 'Player') {
                $p1Total += $points;
            } else {
                $p2Total += $points;
            }

            $tricks[] = [
                'game_index' => $gameIndex, 
                'trick' => $i,
                'winner' => $winner,
                'points' => $points
            ];
        }

        return [
            'player1_points' => $p1Total,
            'player2_points' => $p2Total,
            'trick_breakdown' => $tricks
        ];
    }

    public function run(): void
    {
        $this->command->info("Games seeder - Start (Fixed Logic)");

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
            // --- MATCH LOGIC ---
            if (rand(1, $this->ratioStandaloneToMatch) === 1) {
                $match = $this->newMatch($filteredPlayers, $userIDPlayer1, $userIDPlayer2, $d);
                $playersMarks = [0, 0];
                $playersPoints = [0, 0];
                
                $gameCounter = 1; 

                while($playersMarks[0] < 4 && $playersMarks[1] < 4) {
                    // Agora passamos a lógica de geração para dentro do newGame
                    $newGame = $this->newGame($filteredPlayers, $match, $userIDPlayer1, $userIDPlayer2, $d, $gameCounter);
                    $games[] = $newGame;
                    
                    $ach = $this->checkAchievement($newGame);
                    if ($ach) $achievements[] = $ach;

                    $playersPoints[0] += $newGame['player1_points'];
                    $playersPoints[1] += $newGame['player2_points'];
                    
                    // Calculo dos pontos de jogo (4, 2 ou 1)
                    $p1GamePts = $newGame['player1_points'];
                    $p2GamePts = $newGame['player2_points'];

                    if ($p1GamePts > $p2GamePts) {
                        if ($p1GamePts >= 120) $playersMarks[0]+= 4;
                        elseif ($p1GamePts >= 91) $playersMarks[0] += 2;
                        else $playersMarks[0]++;
                    } elseif ($p2GamePts > $p1GamePts) {
                        if ($p2GamePts >= 120) $playersMarks[1]+= 4;
                        elseif ($p2GamePts >= 91) $playersMarks[1] += 2;
                        else $playersMarks[1]++;
                    }
                    // Nota: Empates (60-60) não dão marks a ninguém
                    
                    $gameCounter++;
                }
                $this->updateMatchWinner($match, $playersMarks[0], $playersMarks[1], $playersPoints[0], $playersPoints[1], $d);
                $matches[] = $match;
            } else {
                // --- SINGLE GAME LOGIC ---
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
        
        // --- ALTERAÇÃO: Geramos os dados REAIS primeiro ---
        $gameData = $this->generateRealDeckGameData($gameIndex);
        
        // Agora usamos os totais calculados da simulação
        $pointsUser1 = $gameData['player1_points'];
        $pointsUser2 = $gameData['player2_points'];
        
        // Preparamos o JSON com a breakdown gerada
        // AVISO: Envolvemos num array 'trick_breakdown' para manter compatibilidade com o Android
        $customJson = json_encode(['trick_breakdown' => $gameData['trick_breakdown']]);

        $duration = random_int(200, 900);
        $d->addSeconds($duration);

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