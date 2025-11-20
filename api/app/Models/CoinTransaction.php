<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CoinTransaction extends Model
{
    protected $table = 'coin_transactions';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'match_id',
        'game_id',
        'coin_transaction_type_id',
        'coins',
        'transaction_datetime',
        'custom'
    ];

    protected $casts = [
        'custom' => 'array'
    ];

    public function type()
    {
        return $this->belongsTo(CoinTransactionType::class, 'coin_transaction_type_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
