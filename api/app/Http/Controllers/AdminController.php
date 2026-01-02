<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AdminController extends Controller
{
    /**
     * List all users with server-side filtering and pagination (admin only)
     * Includes soft deleted users
     */
    public function listUsers(Request $request)
    {
        $perPage = $request->query('per_page', 15);
        // Include soft deleted users
        $query = User::withTrashed();

        // Filter by search term (name, email, or nickname)
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('nickname', 'like', "%{$search}%");
            });
        }

        // Filter by user type (A = Admin, P = Player)
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        // Filter by status (active or blocked) - independent of deleted
        if ($status = $request->query('status')) {
            if ($status === 'active') {
                $query->where('blocked', false);
            } elseif ($status === 'blocked') {
                $query->where('blocked', true);
            }
        }

        // Filter by deleted status (separate from blocked status)
        if ($deleted = $request->query('deleted')) {
            if ($deleted === 'yes') {
                // Only deleted users
                $query->whereNotNull('deleted_at');
            } elseif ($deleted === 'no') {
                // Only non-deleted users
                $query->whereNull('deleted_at');
            }
            // If 'all' or empty, show both deleted and non-deleted
        }

        $users = $query->paginate($perPage);
        return response()->json($users);
    }

    /**
     * Block a user
     */
    public function blockUser(Request $request, $id)
    {
        $user = User::findOrFail($id);

        // Prevent blocking self
        if ($request->user()->id === $user->id) {
            return response()->json(['error' => 'Cannot block yourself'], 422);
        }

        $user->update(['blocked' => true]);

        return response()->json([
            'message' => 'User blocked successfully',
            'user' => $user,
        ]);
    }

    /**
     * Unblock a user
     */
    public function unblockUser(Request $request, $id)
    {
        $user = User::findOrFail($id);

        // Prevent unblocking self (not a strict rule, but for consistency)
        if ($request->user()->id === $user->id) {
            return response()->json(['error' => 'Cannot unblock yourself'], 422);
        }

        $user->update(['blocked' => false]);

        return response()->json([
            'message' => 'User unblocked successfully',
            'user' => $user,
        ]);
    }

    /**
     * Delete a user
     */
    public function deleteUser(Request $request, $id)
    {
        $user = User::findOrFail($id);

        // Prevent deleting self
        if ($request->user()->id === $user->id) {
            return response()->json(['error' => 'Cannot delete yourself'], 422);
        }

        // Prevent deleting other admins (optional - adjust as needed)
        if ($user->type === 'A') {
            return response()->json(['error' => 'Cannot delete admin users'], 422);
        }

        // Revoke tokens before deleting
        $user->tokens()->delete();

        // Soft delete
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    /**
     * Create a new admin user
     */
    public function createAdmin(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:users,name',
            'email' => 'required|email|unique:users,email',
            'nickname' => 'required|string|max:20|unique:users,nickname|regex:/^\S+$/',
            'password' => 'required|string|min:3',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'nickname' => $request->nickname,
            'password' => Hash::make($request->password),
            'type' => 'A', // Admin
            'coins_balance' => 0,
        ]);

        return response()->json([
            'message' => 'Admin user created successfully',
            'user' => $user,
        ], 201);
    }
}
