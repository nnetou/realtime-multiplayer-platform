<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\GameMatch;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'password',
        'type',
        'nickname',
        'blocked',
        'photo_avatar_filename',
        'coins_balance',
        'custom',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'blocked'           => 'boolean',
        'coins_balance'     => 'integer',
        'custom'            => 'array',
    ];

    // Relações existentes
    public function matchesAsPlayer1()
    {
        return $this->hasMany(GameMatch::class, 'player1_user_id');
    }

    public function matchesAsPlayer2()
    {
        return $this->hasMany(GameMatch::class, 'player2_user_id');
    }

    public function matchesWon()
    {
        return $this->hasMany(GameMatch::class, 'winner_user_id');
    }

    public function matchesLost()
    {
        return $this->hasMany(GameMatch::class, 'loser_user_id');
    }

    public function isAdmin(): bool
    {
        return $this->type === 'A';
    }


    // Junta todos os matches (onde é player1 ou player2)
    public function allMatches()
    {
        return GameMatch::where('player1_user_id', $this->id)
            ->orWhere('player2_user_id', $this->id);
    }

    // Número total de vitórias (já tens matchesWon, isto só devolve contagem)
    public function winsCount()
    {
        return $this->matchesWon()->count();
    }

    // Número total de derrotas
    public function lossesCount()
    {
        return $this->matchesLost()->count();
    }

    // Winrate (%) calculado automaticamente
    public function winrate()
    {
        $total = $this->allMatches()->count();
        if ($total === 0) return 0;

        return round(($this->winsCount() / $total) * 100, 2);
    }

    // Conta quantos “capotes” o player deu (4-0)
    public function capoteCount()
    {
        return $this->matchesWon()
            ->where(function ($q) {
                $q->where('player1_points', 4)->where('player2_points', 0)
                  ->orWhere(function ($q2) {
                      $q2->where('player2_points', 4)->where('player1_points', 0);
                  });
            })->count();
    }

    // Bandeira = 4-1 (ou 4-2, depende da tua regra, ajustamos se quiseres)
    public function bandeiraCount()
    {
        return $this->matchesWon()
            ->where(function ($q) {
                $q->where('player1_points', 4)->where('player2_points', 1)
                  ->orWhere(function ($q2) {
                      $q2->where('player2_points', 4)->where('player1_points', 1);
                  });
            })->count();
    }
}
