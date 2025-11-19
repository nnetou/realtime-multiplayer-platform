<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class GameMatch extends Model
{
    use HasFactory;

    // Campos que podem ser preenchidos
    protected $fillable = [
        'type',
        'status',
        'player1_user_id',
        'player2_user_id',
        'winner_user_id',
        'loser_user_id',
        'player1_marks',
        'player2_marks',
        'player1_points',
        'player2_points',
        'total_time',
        'began_at',
        'ended_at',
        'custom',
        'stake'
    ];

    // IMPORTANTE: Conversão automática de tipos
    protected $casts = [
        'custom' => 'array', // Converte JSON da BD para Array PHP automaticamente
        'began_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    // Relações com a tabela Users
    
    public function player1()
    {
        return $this->belongsTo(User::class, 'player1_user_id');
    }

    public function player2()
    {
        return $this->belongsTo(User::class, 'player2_user_id');
    }

    public function winner()
    {
        return $this->belongsTo(User::class, 'winner_user_id');
    }

    public function loser()
    {
        return $this->belongsTo(User::class, 'loser_user_id');
    }
    
    // Opcional: Se tiveres relação com jogos individuais (Games)
    public function games()
    {
        return $this->hasMany(Game::class);
    }
}