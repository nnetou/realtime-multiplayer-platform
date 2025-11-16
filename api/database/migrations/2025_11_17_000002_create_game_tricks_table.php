<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_tricks', function (Blueprint $table) {
            $table->id();

            // Cada trick pertence a um game (ronda)
            $table->foreignId('game_id')
                ->constrained('games')
                ->cascadeOnDelete();

            // Número da vaza (1, 2, 3, ...)
            $table->unsignedInteger('trick_number');

            // Pontos feitos pelo jogador
            $table->unsignedInteger('player_points')->default(0);

            // Pontos feitos pelo adversário
            $table->unsignedInteger('opponent_points')->default(0);

            // JSON extra para armazenar cartas, vencedor, etc.
            $table->json('custom')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_tricks');
    }
};
