<?php

namespace App\Http\Controllers;

use App\Models\Carta;

class CartasController extends Controller
{
    public function index()
    {
        return Carta::all();
    }

    public function baralho()
    {
        return Carta::all()->shuffle()->values(); 
    }
}
