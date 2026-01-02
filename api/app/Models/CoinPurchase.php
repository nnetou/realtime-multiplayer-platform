<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CoinPurchase extends Model
{
    protected $table = 'coin_purchases';
    public $timestamps = false; // A tabela não tem created_at/updated_at padrão

    protected $fillable = [
        'user_id',
        'coin_transaction_id', // Ligação opcional à transação interna
        'euros',
        'purchase_datetime',
        'payment_type',
        'payment_reference',
        'custom'
    ];

    protected $casts = [
        'purchase_datetime' => 'datetime',
        'custom' => 'array',
        'euros' => 'decimal:2'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}