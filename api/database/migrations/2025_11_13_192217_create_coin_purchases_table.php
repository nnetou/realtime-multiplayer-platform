<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('coin_purchases', function (Blueprint $table) {
            $table->id();

            $table->timestamp('purchase_datetime');

            $table->foreignId('user_id')->constrained('users');

            $table->foreignId('coin_transaction_id')
                  ->constrained('coin_transactions');

            $table->integer('euros'); // euros charged (real money)

            $table->enum('payment_type', ['MBWAY', 'PAYPAL', 'IBAN', 'MB', 'VISA']);

            $table->string('payment_reference'); // validated string depending on type

            $table->json('custom')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coin_purchases');
    }
};
