<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'error' => 'The provided credentials are incorrect.'
            ], 401);
        }

        $user = Auth::user();
        $token = $user->createToken('auth-token')->plainTextToken;

        // --- CORREÇÃO AQUI ---
        // Removemos toda a lógica complexa de Base64 e ficheiros.
        // Apenas devolvemos os dados limpos do utilizador.
        
        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'nickname' => $user->nickname,
                'coins_balance' => $user->coins_balance,
                
                // ESTA É A LINHA QUE FALTAVA:
                'photo_avatar_filename' => $user->photo_avatar_filename, 
            ]   
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }
}
