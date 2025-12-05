<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ShopController extends Controller
{
    // --- ROTA DE IMAGEM DE CARTA ---
    public function getCardImage($filename)
    {
        $path = public_path('images/cartas/playing-cards-master/' . $filename);

        if (!File::exists($path)) {
            $path = storage_path('app/public/images/cartas/playing-cards-master/' . $filename);
        }

        if (!File::exists($path)) {
            return response()->json(['message' => 'Image not found'], 404);
        }

        if (ob_get_length()) { ob_end_clean(); }

        return response()->file($path);
    }

    // --- ROTA DE IMAGEM DE AVATAR ---
    public function getImage($filename)
    {
        $path = public_path('storage/photos_avatars/' . $filename);
        if (!File::exists($path)) {
            $path = storage_path('app/public/photos_avatars/' . $filename);
        }
        if (!File::exists($path)) {
            return response()->json(['message' => 'Image not found'], 404);
        }

        if (ob_get_length()) { ob_end_clean(); }
        
        return response()->file($path);
    }

    // --- LISTAR ITENS (CORRIGIDO PARA GUEST) ---
    public function index(Request $request)
    {
        // Tenta obter o utilizador via Sanctum, mas não falha se não existir token
        $user = auth('sanctum')->user();
        
        // Se user for null (Guest), usamos arrays vazios para não dar erro
        $customData = $user ? ($user->custom ?? []) : [];
        
        // 1. AVATARES
        $ownedAvatars = $customData['owned_avatars'] ?? [];
        
        // Só tenta aceder à propriedade photo_avatar_filename se o user existir
        if ($user && $user->photo_avatar_filename && !in_array($user->photo_avatar_filename, $ownedAvatars)) {
            $ownedAvatars[] = $user->photo_avatar_filename;
        }

        $avatarFiles = File::files(public_path('storage/photos_avatars'));
        $avatarFiles = array_slice($avatarFiles, 0, 30);
        
        $avatars = [];
        foreach ($avatarFiles as $file) {
            $filename = $file->getFilename();
            if ($filename[0] === '.' || !str_contains($filename, '.')) continue;
            
            $avatars[] = [
                'id' => $filename,
                'type' => 'avatar',
                'name' => 'Avatar',
                'url' => asset('api/image-proxy/' . $filename),
                'price' => 20,
                'owned' => in_array($filename, $ownedAvatars),
                // Verifica se user existe antes de comparar
                'equipped' => $user ? ($user->photo_avatar_filename === $filename) : false,
                'color' => null
            ];
        }

        // 2. CARTAS
        $cardFiles = ['cardflipped.png', 'cardflipped1.png', 'cardflipped2.png', 'cardflipped3.png'];
        $ownedCards = $customData['owned_cards'] ?? [];
        
        if (!in_array('cardflipped.png', $ownedCards)) {
            $ownedCards[] = 'cardflipped.png';
        }
        
        $currentCard = $customData['equipped_card'] ?? 'cardflipped.png';

        $cards = [];
        foreach ($cardFiles as $filename) {
            $name = ($filename == 'cardflipped.png') ? 'Clássico' : 'Skin Personalizada';
            $cards[] = [
                'id' => $filename,
                'type' => 'card',
                'name' => $name,
                'url' => asset('api/card-image-proxy/' . $filename),
                'price' => 20,
                'owned' => in_array($filename, $ownedCards),
                'equipped' => $user ? ($currentCard === $filename) : false,
                'color' => null
            ];
        }

        // 3. MESAS
        $tableColors = [
            ['id' => 'green', 'hex' => '0xFF1E8449', 'name' => 'Clássico'],
            ['id' => 'red',   'hex' => '0xFF922B21', 'name' => 'Veludo Vermelho'],
            ['id' => 'blue',  'hex' => '0xFF1F618D', 'name' => 'Azul Oceano'],
            ['id' => 'black', 'hex' => '0xFF17202A', 'name' => 'Preto Luxo'],
        ];
        $ownedTables = $customData['owned_tables'] ?? [];
        if (!in_array('green', $ownedTables)) {
            $ownedTables[] = 'green';
        }
        $currentTable = $customData['equipped_table'] ?? 'green';

        $tables = [];
        foreach ($tableColors as $t) {
            $tables[] = [
                'id' => $t['id'],
                'type' => 'table',
                'name' => $t['name'],
                'url' => null,
                'price' => 20,
                'owned' => in_array($t['id'], $ownedTables),
                'equipped' => $user ? ($currentTable === $t['id']) : false,
                'color' => $t['hex']
            ];
        }

        return response()->json([
            'avatars' => $avatars,
            'cards' => $cards,
            'tables' => $tables
        ]);
    }

    // --- COMPRAR ---
    public function buy(Request $request)
    {
        $request->validate(['id' => 'required|string', 'type' => 'required|in:avatar,card,table']);
        
        $itemId = $request->id;
        $type = $request->type;
        $user = $request->user(); // Aqui precisa mesmo de user, a rota deve ser protegida
        
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $customData = $user->custom ?? []; 
        if (!is_array($customData)) $customData = [];

        $ownedKey = match($type) {
            'avatar' => 'owned_avatars',
            'card' => 'owned_cards',
            'table' => 'owned_tables',
        };

        $owned = $customData[$ownedKey] ?? [];

        if (in_array($itemId, $owned)) {
            return response()->json(['message' => 'Já tens este item!'], 409);
        }

        if ($user->coins_balance < 20) {
            return response()->json(['message' => 'Moedas insuficientes!'], 402);
        }

        try {
            $user->coins_balance -= 20;
            $owned[] = $itemId;
            $customData[$ownedKey] = $owned;
            
            $user->custom = $customData;
            $user->save();

            return response()->json([
                'message' => 'Comprado com sucesso!',
                'new_balance' => $user->coins_balance
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erro no servidor'], 500);
        }
    }

    // --- EQUIPAR ---
    public function equip(Request $request)
    {
        $request->validate(['id' => 'required|string', 'type' => 'required|in:avatar,card,table']);

        $itemId = $request->id;
        $type = $request->type;
        $user = $request->user();

        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $customData = $user->custom ?? [];
        
        $isDefault = ($type == 'card' && $itemId == 'cardflipped.png') || ($type == 'table' && $itemId == 'green');

        if ($type === 'avatar') {
            $owned = $customData['owned_avatars'] ?? [];
            if (!in_array($itemId, $owned) && $user->photo_avatar_filename !== $itemId) {
                 return response()->json(['message' => 'Não possuis este item'], 403);
            }
            $user->photo_avatar_filename = $itemId;
        } else {
            $ownedKey = match($type) {
                'card' => 'owned_cards',
                'table' => 'owned_tables',
            };
            $owned = $customData[$ownedKey] ?? [];

            if (!$isDefault && !in_array($itemId, $owned)) {
                return response()->json(['message' => 'Não possuis este item'], 403);
            }
            
            $equipKey = match($type) {
                'card' => 'equipped_card',
                'table' => 'equipped_table',
            };
            $customData[$equipKey] = $itemId;
            $user->custom = $customData;
        }

        $user->save();
        return response()->json(['message' => 'Equipado com sucesso!']);
    }
}