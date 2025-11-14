<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('matches', function (Blueprint $table) {
            $table->id();

            $table->enum('type', ['3', '9']); // Bisca de 3 ou 9

            $table->foreignId('player1_user_id')->constrained('users');
            $table->foreignId('player2_user_id')->constrained('users');

            $table->foreignId('winner_user_id')
                  ->nullable()
                  ->constrained('users');

            $table->foreignId('loser_user_id')
                  ->nullable()
                  ->constrained('users');

            $table->enum('status', ['Pending', 'Playing', 'Ended', 'Interrupted'])
                  ->default('Pending');

            $table->integer('stake')->default(3);

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
        Schema::dropIfExists('matches');
    }
};
