<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_matches', function (Blueprint $table) {
            $table->id();

            $table->string('type')->nullable();

            $table->foreignId('player1_user_id')
                ->nullable()->constrained('users')->nullOnDelete();

            $table->foreignId('player2_user_id')
                ->nullable()->constrained('users')->nullOnDelete();

            $table->foreignId('winner_user_id')
                ->nullable()->constrained('users')->nullOnDelete();

            $table->foreignId('loser_user_id')
                ->nullable()->constrained('users')->nullOnDelete();

            $table->string('status')->default('Pending');
            $table->integer('stake')->default(0);

            $table->timestamp('began_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->integer('total_time')->nullable();

            $table->integer('player1_marks')->default(0);
            $table->integer('player2_marks')->default(0);

            $table->integer('player1_points')->default(0);
            $table->integer('player2_points')->default(0);

            $table->json('custom')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_matches');
    }
};
