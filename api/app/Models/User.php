<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\SoftDeletes;

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


    public function matchesAsPlayer1()
    {
        return $this->hasMany(Game::class, 'player1_user_id');
    }

    public function matchesAsPlayer2()
    {
        return $this->hasMany(Game::class, 'player2_user_id');
    }

    public function matchesWon()
    {
        return $this->hasMany(Game::class, 'winner_user_id');
    }

    public function matchesLost()
    {
        return $this->hasMany(Game::class, 'loser_user_id');
    }

    public function allMatches()
    {
        return Game::where('player1_user_id', $this->id)
            ->orWhere('player2_user_id', $this->id);
    }

    public function winsCount()
    {
        return $this->matchesWon()->count();
    }

    public function lossesCount()
    {
        return $this->matchesLost()->count();
    }

    public function winrate()
    {
        $total = $this->allMatches()->count();
        if ($total === 0) return 0;

        return round(($this->winsCount() / $total) * 100, 2);
    }

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

    public function isAdmin(): bool
    {
        return $this->type === 'A';
    }
}
