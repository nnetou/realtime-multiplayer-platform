<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public static $startDate;
    public static $dbInsertBlockSize = 500;

    public static $seedLanguage = "en_US";

    public function run(): void
    {
        $this->command->info("-----------------------------------------------");
        $this->command->info("START of database seeder");
        $this->command->info("-----------------------------------------------");

        self::$startDate = Carbon::now()->subMonths(14);
        self::$seedLanguage = $this->command->choice(
            'What is the language for users\' names?', 
            ['pt_PT', 'en_US'], 
            0
        );

        // Disable foreign keys
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF');
        } else {
            DB::statement('SET foreign_key_checks=0');
            DB::statement("SET time_zone = '+00:00'");
        }

        // Clear all relevant tables
        DB::table('users')->delete();
        DB::table('matches')->delete();
        DB::table('games')->delete();
        DB::table('coin_purchases')->delete();
        DB::table('coin_transactions')->delete();
        DB::table('coin_transaction_types')->delete();

        // Reset AUTO_INCREMENT / SQLITE sequences
        if (DB::getDriverName() === 'sqlite') {
            DB::statement("DELETE FROM sqlite_sequence WHERE name = 'users'");
            DB::statement("DELETE FROM sqlite_sequence WHERE name = 'matches'");
            DB::statement("DELETE FROM sqlite_sequence WHERE name = 'games'");
            DB::statement("DELETE FROM sqlite_sequence WHERE name = 'coin_purchases'");
            DB::statement("DELETE FROM sqlite_sequence WHERE name = 'coin_transactions'");
            DB::statement("DELETE FROM sqlite_sequence WHERE name = 'coin_transaction_types'");
        } else {
            DB::statement('ALTER TABLE users AUTO_INCREMENT = 0');
            DB::statement('ALTER TABLE matches AUTO_INCREMENT = 0');
            DB::statement('ALTER TABLE games AUTO_INCREMENT = 0');
            DB::statement('ALTER TABLE coin_purchases AUTO_INCREMENT = 0');
            DB::statement('ALTER TABLE coin_transactions AUTO_INCREMENT = 0');
            DB::statement('ALTER TABLE coin_transaction_types AUTO_INCREMENT = 0');
        }

        $this->command->info("-----------------------------------------------");

        // Run core seeders
        $this->call(TransactionTypesSeeder::class);
        $this->call(UsersSeeder::class);
        $this->call(InitialTransactionsSeeder::class);
        $this->call(GamesSeeder::class);
        $this->call(GamesTransactionsSeeder::class);

        //ADD THE CARDS SEEDER (for BISCA)
        $this->call(CartasSeeder::class);

        // Re-enable foreign keys
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = ON');
        } else {
            DB::statement('SET foreign_key_checks=1');
        }

        $this->command->info("-----------------------------------------------");
        $this->command->info("END of database seeder");
        $this->command->info("-----------------------------------------------");
    }
}
