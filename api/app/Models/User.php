<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Casts\Attribute;

use Illuminate\Database\Eloquent\SoftDeletes;

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
        'description',
        'custom'
    ];

    protected $appends = ['photo_url'];

    protected function photoUrl(): Attribute
    {
        return Attribute::make(
            get: function () {
                if ($this->photo_avatar_filename) {
                    return url('storage/photos_avatars/' . $this->photo_avatar_filename);
                }

                return url('storage/photos_avatars/anonymous.png');
            },
        );
    }

    protected $hidden = ['password', 'remember_token'];

    protected $dates = ['deleted_at'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'blocked' => 'boolean',
        'coins_balance' => 'integer',
        'custom' => 'array',
    ];


    public function matchesWon()
    {
        return $this->hasMany(MatchModel::class, 'winner_user_id');
    }

    public function achievements()
    {
        return $this->hasMany(Achievement::class, 'user_id');
    }
}
