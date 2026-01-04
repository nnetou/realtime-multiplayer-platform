<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class MatchModel extends Model
{
    use HasFactory;
    protected $table = 'matches';

    public $timestamps = false;

    protected $fillable = [
        'type',
        'player1_user_id',
        'player2_user_id',
        'winner_user_id',
        'loser_user_id',
        'status',
        'stake',
        'began_at',
        'ended_at',
        'total_time',
        'player1_marks',
        'player2_marks',
        'player1_points',
        'player2_points',
        'custom'
    ];

    protected $casts = [
        'began_at' => 'datetime',
        'ended_at' => 'datetime',
        'custom' => 'array',
    ];

    public function games()
    {
        return $this->hasMany(Game::class, 'match_id');
    }
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
}