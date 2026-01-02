<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use App\Models\User;
use Illuminate\Validation\ValidationException;
use App\Models\CoinTransaction; // Necessário para o bónus
use App\Models\CoinTransactionType; // Necessário para o tipo de transação
use Illuminate\Support\Facades\DB; // Necessário para transação de DB

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:users,name',
            'email' => 'required|email|unique:users,email',
            'nickname' => 'required|string|max:20|unique:users,nickname|regex:/^\S+$/',
            'password' => 'required|string|min:3',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'description' => 'nullable|string|max:500',
        ]);

        $data = [
            'name' => $request->name,
            'email' => $request->email,
            'nickname' => $request->nickname,
            'password' => Hash::make($request->password),
            'type' => 'P',
            'coins_balance' => 10,
            'description' => $request->description,
        ];

        $user = User::create($data);

        if ($request->hasFile('photo')) {
            $filename = time() . '_' . $user->id . '.' . $request->file('photo')->getClientOriginalExtension();
            $request->file('photo')->storeAs('photos_avatars', $filename, 'public');
            $user->update(['photo_avatar_filename' => $filename]);
        }

        return response()->json([
            'message' => 'Account created! Welcome bonus awarded.',
            'user' => $user->fresh(),
        ], 201);
    }

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

        $request->validate([
            'password' => 'required|string',
        ]);

        // Prevent admins from deleting their own accounts
        if ($user->type === 'A') {
            return response()->json(['error' => 'Administrators cannot delete their own accounts'], 403);
        }

        if (!Hash::check($request->password, $user->password)) {
            return response()->json(['error' => 'Incorrect password'], 422);
        }

        // Revoke all tokens before deleting
        $user->tokens()->delete();

        // Soft delete the user
        $user->delete();

        return response()->json(['message' => 'Account deleted successfully']);
    }
}