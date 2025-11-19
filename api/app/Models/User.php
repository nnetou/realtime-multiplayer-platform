<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

// IMPORTANTE: Importar os models
use App\Models\MatchModel;
use App\Models\Achievement;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'type', 'nickname', 
        'blocked', 'photo_avatar_filename', 'coins_balance', 'custom'
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'blocked' => 'boolean',
        'coins_balance' => 'integer',
        'custom' => 'array',
    ];

    // --- ESTAS SÃO AS FUNÇÕES QUE FALTAM PARA O GLOBAL RANKING ---

    // 1. Relação de Vitórias (Para o "Most Matches Won")
    public function matchesWon()
    {
        // Nota: Usa MatchModel::class e a chave 'winner_user_id'
        return $this->hasMany(MatchModel::class, 'winner_user_id');
    }

    // 2. Relação de Achievements (Para o "Most Achievements")
    public function achievements()
    {
        return $this->hasMany(Achievement::class, 'user_id');
    }
}