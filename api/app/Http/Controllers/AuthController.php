<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use App\Models\User; // Necessário importar
use App\Models\CoinTransaction; // Necessário para o bónus
use App\Models\CoinTransactionType; // Necessário para o tipo de transação
use Illuminate\Support\Facades\DB; // Necessário para transação de DB

class AuthController extends Controller
{
    // ... (Mantenho o método login existente sem alterações) ...
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

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'nickname' => $user->nickname,
                'coins_balance' => $user->coins_balance,
                'email' => $user->email,
                'description' => $user->description,
                'created_at' => $user->created_at,
                'type' => $user->type,
                'photo_avatar_filename' => $user->photo_avatar_filename,
            ]
        ]);
    }

    // --- NOVO MÉTODO: REGISTER (Feature 1) ---
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:3',
            'nickname' => 'required|string|max:255|unique:users|regex:/^\S+$/',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        return DB::transaction(function () use ($request) {
            $photoFilename = null;

            // Lógica de upload igual à do updateProfile
            if ($request->hasFile('photo')) {
                $filename = time() . '_' . uniqid() . '.' . $request->file('photo')->getClientOriginalExtension();
                $request->file('photo')->storeAs('photos_avatars', $filename, 'public');
                $photoFilename = $filename;
            }

            // Criar Utilizador
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => bcrypt($request->password),
                'nickname' => $request->nickname,
                'type' => 'P', // Player por defeito
                'coins_balance' => 10, // Welcome bonus
                'photo_avatar_filename' => $photoFilename,
                'custom' => [] // Array vazio para custom data
            ]);

            // Registar a transação do Bónus de Boas-vindas
            // Tenta encontrar um tipo 'Bonus', senão usa o primeiro tipo de Crédito ('C') que encontrar ou cria
            $bonusType = CoinTransactionType::where('name', 'Bonus')->first();
            
            if (!$bonusType) {
                // Fallback caso não exista o tipo 'Bonus' especificamente
                $bonusType = CoinTransactionType::where('type', 'C')->first();
            }

            if ($bonusType) {
                CoinTransaction::create([
                    'user_id' => $user->id,
                    'coin_transaction_type_id' => $bonusType->id,
                    'coins' => 10,
                    'transaction_datetime' => now(),
                    'custom' => ['source' => 'welcome_bonus']
                ]);
            }

            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'nickname' => $user->nickname,
                    'coins_balance' => $user->coins_balance,
                    'email' => $user->email,
                    'description' => $user->description,
                    'created_at' => $user->created_at,
                    'type' => $user->type,
                    'photo_avatar_filename' => $user->photo_avatar_filename,
                ]
            ], 201);
        });
    }

    // ... (Mantenho logout, updateProfile, getAchievements, deleteAccount como estavam) ...
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => 'required|string|max:255|unique:users,name,' . $user->id,
            'email' => 'required|email|unique:users,email,' . $user->id,
            'nickname' => 'required|string|max:255|unique:users,nickname,' . $user->id . '|regex:/^\S+$/',
            'password' => 'nullable|string|min:3',
            'description' => 'nullable|string|max:500',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $data = [
            'name' => $request->name,
            'email' => $request->email,
            'nickname' => $request->nickname,
            'description' => $request->description,
        ];

        if ($request->filled('password')) {
            $data['password'] = bcrypt($request->password);
        }

        if ($request->hasFile('photo')) {
            // Delete old photo if exists
            if ($user->photo_avatar_filename && $user->photo_avatar_filename !== 'anonymous.png') {
                \Storage::disk('public')->delete('photos_avatars/' . $user->photo_avatar_filename);
            }

            $filename = time() . '_' . $user->id . '.' . $request->file('photo')->getClientOriginalExtension();
            $request->file('photo')->storeAs('photos_avatars', $filename, 'public');
            $data['photo_avatar_filename'] = $filename;
        }

        $user->update($data);

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user->fresh(),
        ]);
    }

    public function getAchievements(Request $request)
    {
        $user = $request->user();
        $achievements = $user->achievements()->get();
        return response()->json($achievements);
    }

    public function deleteAccount(Request $request)
    {
        $user = $request->user();

        if ($user->type === 'A') {
            return response()->json(['error' => 'Administrators cannot delete their own accounts'], 403);
        }

        $user->delete();

        return response()->json(['message' => 'Account deleted successfully']);
    }
}