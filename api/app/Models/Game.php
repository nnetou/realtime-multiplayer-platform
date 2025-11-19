<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Game extends Model
{
    protected $table = 'games';

    public $timestamps = false;

    protected $fillable = [
        'match_id', 'type', 'player1_user_id', 'player2_user_id', 
        'is_draw', 'winner_user_id', 'loser_user_id', 'status', 
        'began_at', 'ended_at', 'total_time', 
        'player1_points', 'player2_points', 'custom'
    ];

    protected $casts = [
        'custom' => 'array',
        'is_draw' => 'boolean',
        'began_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    // --- CORREÇÃO: Usar string 'App\Models\Match' ---
    public function match()
    {
        return $this->belongsTo('App\Models\MatchModel');
    }

    public function player1() { return $this->belongsTo('App\Models\User', 'player1_user_id'); }
    public function player2() { return $this->belongsTo('App\Models\User', 'player2_user_id'); }
    public function winner()  { return $this->belongsTo('App\Models\User', 'winner_user_id'); }
    public function loser()   { return $this->belongsTo('App\Models\User', 'loser_user_id'); }
}