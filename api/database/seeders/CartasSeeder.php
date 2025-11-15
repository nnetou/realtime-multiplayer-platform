<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CartasSeeder extends Seeder
{
    public function run(): void
    {
        $naipes = [
            'clubs',
            'diamonds',
            'hearts',
            'spades'
        ];

        $valores = ['A','2','3','4','5','6','7','J','Q','K'];

        $pesos = [
            'A' => 11,
            '7' => 10,
            'J' => 2,
            'Q' => 3,
            'K' => 4,
            '2' => 0,
            '3' => 0,
            '4' => 0,
            '5' => 0,
            '6' => 0
        ];

        foreach ($naipes as $naipe) {
            foreach ($valores as $valor) {

                $filename = "{$naipe}_{$valor}.png";

               
                $url = "http://10.0.2.2:8000/images/cartas/playing-cards-master/$filename";



                DB::table('cartas')->insert([
                    'naipe' => $naipe,
                    'valor' => $valor,
                    'peso'  => $pesos[$valor],
                    'imagem' => $url,     
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }
        }
    }
}
