<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cartas', function (Blueprint $table) {
            $table->id();
            $table->string('naipe');
            $table->string('valor');
            $table->integer('peso');
            $table->string('imagem');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cartas');
    }
};
