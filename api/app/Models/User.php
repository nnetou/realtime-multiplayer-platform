<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Casts\Attribute;

// Importar models
use App\Models\MatchModel;
use App\Models\Achievement;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'type',
        'nickname',
        'blocked',
        'photo_avatar_filename',
        'coins_balance',
        'custom' // <--- O 'custom' já cá estava, mantém assim.
    ];

    protected $appends = ['photo_url'];

    // Helper para devolver o URL completo da imagem
    protected function photoUrl(): Attribute
    {
        return Attribute::make(
            get: function () {
                if ($this->photo_avatar_filename) {
                    // Constrói o URL absoluto para a foto do utilizador
                    return url('storage/photos_avatars/' . $this->photo_avatar_filename);
                }

                // Constrói o URL absoluto para a foto anónima
                return url('storage/photos_avatars/anonymous.png');
            },
        );
    }

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'blocked' => 'boolean',
        'coins_balance' => 'integer',

        // --- MUITO IMPORTANTE ---
        // Isto faz com que o Laravel converta automaticamente o JSON da BD para Array no PHP
        'custom' => 'array',
    ];

    // Relações
    public function matchesWon()
    {
        return $this->hasMany(MatchModel::class, 'winner_user_id');
    }

    public function achievements()
    {
        return $this->hasMany(Achievement::class, 'user_id');
    }
}