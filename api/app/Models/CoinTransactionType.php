<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CoinTransactionType extends Model
{
    protected $table = 'coin_transaction_types';

    public $timestamps = false;

    protected $fillable = [
        'name',
        'type',      // 'C' = crédito, 'D' = débito
        'custom'
    ];

    protected $casts = [
        'custom' => 'array'
    ];

    public function transactions()
    {
        return $this->hasMany(CoinTransaction::class, 'coin_transaction_type_id');
    }
}
