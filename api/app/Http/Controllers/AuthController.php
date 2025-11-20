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

        $photoPath = base_path('database/seeders/photos/' . $user->photo_avatar_filename);

        $avatarBase64 = null;

       if (!empty($user->photo_avatar_filename)) {

            $photoPath = base_path('database/seeders/photos/' . $user->photo_avatar_filename);

            if (file_exists($photoPath)) {
                $avatarBase64 = "data:image/jpeg;base64," . 
                    base64_encode(file_get_contents($photoPath));
            }
        }

        $avatarBase64 = null;

        if (!empty($user->photo_avatar_filename)) {

            $filename = trim($user->photo_avatar_filename);

            $photoPath = base_path('database/seeders/photos/' . $filename);

            \Log::info('PHOTO PATH = ' . $photoPath);
            \Log::info('FILE EXISTS = ' . (file_exists($photoPath) ? 'YES' : 'NO'));

            if (file_exists($photoPath)) {
                $avatarBase64 = "data:image/jpeg;base64," .
                    base64_encode(file_get_contents($photoPath));
            }
        }
        
        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'nickname' => $user->nickname,
                'coins_balance' => $user->coins_balance,
                'photo' => $avatarBase64
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
