<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Achievement extends Model
{
    protected $table = 'achievements';
    
    protected $fillable = [
        'user_id', 'game_match_id', 'type', 'description'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}