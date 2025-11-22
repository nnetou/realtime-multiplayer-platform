<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ShopController extends Controller
{
    // --- ROTA AUXILIAR PARA SERVIR IMAGENS (Mantém esta!) ---
    public function getImage($filename)
    {
        $path = public_path('storage/photos_avatars/' . $filename);
        if (!File::exists($path)) {
            $path = storage_path('app/public/photos_avatars/' . $filename);
        }
        if (!File::exists($path)) {
            return response()->json(['message' => 'Image not found'], 404);
        }
        if (ob_get_length()) ob_end_clean(); // Limpa lixo do buffer
        return response()->file($path);
    }

    // --- LISTAR AVATARES ---
    public function index(Request $request)
    {
        $user = $request->user();
        
        // LER DO CAMPO CUSTOM
        $customData = $user->custom ?? []; 
        $owned = $customData['owned_avatars'] ?? [];

        // Garante que o atual está na lista
        if ($user->photo_avatar_filename && !in_array($user->photo_avatar_filename, $owned)) {
            $owned[] = $user->photo_avatar_filename;
        }

        $path = public_path('storage/photos_avatars');
        if (!File::exists($path)) {
            $path = storage_path('app/public/photos_avatars');
            if (!File::exists($path)) return response()->json([]);
        }

        $files = File::files($path);
        // Limite de 50 para não pesar
        $files = array_slice($files, 0, 50); 

        $shopItems = [];
        foreach ($files as $file) {
            $filename = $file->getFilename();
            if ($filename[0] === '.' || !str_contains($filename, '.')) continue;

            $shopItems[] = [
                'filename' => $filename,
                // Nota: O Android vai ignorar este URL e usar o dele, mas enviamos na mesma
                'url' => asset('storage/photos_avatars/' . $filename),
                'price' => 20,
                'owned' => in_array($filename, $owned),
                'equipped' => $user->photo_avatar_filename === $filename
            ];
        }

        return response()->json($shopItems);
    }

    // --- COMPRAR AVATAR ---
    public function buy(Request $request)
        {
            $request->validate(['filename' => 'required|string']);
            $filename = $request->filename;
            $user = $request->user();

            // LOG DE DEBUG
            \Log::info("Tentativa de compra: User {$user->id} quer comprar $filename");

            // 1. Ler dados do campo CUSTOM
            // (O Laravel converte o JSON para Array automaticamente se o cast estiver no User.php)
            $customData = $user->custom ?? [];
            
            // Garante que é um array (caso venha null)
            if (!is_array($customData)) {
                $customData = [];
            }

            $owned = $customData['owned_avatars'] ?? [];

            // 2. Verificar se já tem
            if (in_array($filename, $owned)) {
                \Log::warning("Compra falhou: Já possui o avatar.");
                return response()->json(['message' => 'Já tens este avatar!'], 409);
            }

            // 3. Verificar dinheiro
            if ($user->coins_balance < 20) {
                \Log::warning("Compra falhou: Sem dinheiro.");
                return response()->json(['message' => 'Moedas insuficientes!'], 402);
            }

            try {
                // 4. Efetuar a transação
                $user->coins_balance -= 20;
                
                $owned[] = $filename;
                $customData['owned_avatars'] = $owned;
                $user->custom = $customData; // Guarda de volta no campo custom
                
                $user->save();

                \Log::info("Compra com sucesso!");
                return response()->json([
                    'message' => 'Comprado com sucesso!',
                    'new_balance' => $user->coins_balance
                ]);

            } catch (\Exception $e) {
                // Este erro vai aparecer no laravel.log
                \Log::error("ERRO CRÍTICO NO BUY: " . $e->getMessage());
                return response()->json(['message' => 'Erro no servidor: ' . $e->getMessage()], 500);
            }
        }

    // --- EQUIPAR AVATAR ---
    public function equip(Request $request)
    {
        $request->validate(['filename' => 'required|string']);
        $filename = $request->filename;
        $user = $request->user();

        // Ler do custom
        $customData = $user->custom ?? [];
        $owned = $customData['owned_avatars'] ?? [];

        if (!in_array($filename, $owned) && $user->photo_avatar_filename !== $filename) {
            return response()->json(['message' => 'Not owned'], 403);
        }

        $user->photo_avatar_filename = $filename;
        $user->save();

        return response()->json(['message' => 'Equipped!']);
    }
}