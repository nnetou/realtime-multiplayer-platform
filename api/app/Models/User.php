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

    // Relações com GameMatch
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
}
