<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use App\Models\CoinTransaction;     // <--- Importar
use App\Models\CoinTransactionType; // <--- Importar

class ShopController extends Controller
{
    // ... (Métodos getCardImage, getImage e index mantêm-se iguais) ...

    public function getCardImage($filename)
    {
        $path = public_path('images/cartas/playing-cards-master/' . $filename);
        if (!File::exists($path)) {
            $path = storage_path('app/public/images/cartas/playing-cards-master/' . $filename);
        }
        if (!File::exists($path)) {
            return response()->json(['message' => 'Image not found'], 404);
        }
        return response()->file($path);
    }

    public function getImage($filename)
    {
        $path = public_path('storage/photos_avatars/' . $filename);
        if (!File::exists($path)) {
            $path = storage_path('app/public/photos_avatars/' . $filename);
        }
        if (!File::exists($path)) {
            return response()->json(['message' => 'Image not found'], 404);
        }
        return response()->file($path);
    }

    public function index(Request $request)
    {
        // ... (Código original do index mantém-se igual) ...
        $user = auth('sanctum')->user();
        $customData = $user ? ($user->custom ?? []) : [];
        $ownedAvatars = $customData['owned_avatars'] ?? [];
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
                'id' => $filename, 'type' => 'avatar', 'name' => 'Avatar',
                'url' => asset('api/image-proxy/' . $filename), 'price' => 20,
                'owned' => in_array($filename, $ownedAvatars),
                'equipped' => $user ? ($user->photo_avatar_filename === $filename) : false,
                'color' => null
            ];
        }

        $cardFiles = ['cardflipped.png', 'cardflipped1.png', 'cardflipped2.png', 'cardflipped3.png'];
        $ownedCards = $customData['owned_cards'] ?? [];
        if (!in_array('cardflipped.png', $ownedCards)) $ownedCards[] = 'cardflipped.png';
        $currentCard = $customData['equipped_card'] ?? 'cardflipped.png';
        $cards = [];
        foreach ($cardFiles as $filename) {
            $name = ($filename == 'cardflipped.png') ? 'Clássico' : 'Skin Personalizada';
            $cards[] = [
                'id' => $filename, 'type' => 'card', 'name' => $name,
                'url' => asset('api/card-image-proxy/' . $filename), 'price' => 20,
                'owned' => in_array($filename, $ownedCards),
                'equipped' => $user ? ($currentCard === $filename) : false,
                'color' => null
            ];
        }

        $tableColors = [
            ['id' => 'green', 'hex' => '0xFF1E8449', 'name' => 'Clássico'],
            ['id' => 'red',   'hex' => '0xFF922B21', 'name' => 'Veludo Vermelho'],
            ['id' => 'blue',  'hex' => '0xFF1F618D', 'name' => 'Azul Oceano'],
            ['id' => 'black', 'hex' => '0xFF17202A', 'name' => 'Preto Luxo'],
        ];
        $ownedTables = $customData['owned_tables'] ?? [];
        if (!in_array('green', $ownedTables)) $ownedTables[] = 'green';
        $currentTable = $customData['equipped_table'] ?? 'green';
        $tables = [];
        foreach ($tableColors as $t) {
            $tables[] = [
                'id' => $t['id'], 'type' => 'table', 'name' => $t['name'],
                'url' => null, 'price' => 20,
                'owned' => in_array($t['id'], $ownedTables),
                'equipped' => $user ? ($currentTable === $t['id']) : false,
                'color' => $t['hex']
            ];
        }

        return response()->json(['avatars' => $avatars, 'cards' => $cards, 'tables' => $tables]);
    }


    // --- MÉTODO BUY (ALTERADO) ---
    public function buy(Request $request)
    {
        $request->validate(['id' => 'required|string', 'type' => 'required|in:avatar,card,table']);
        
        $itemId = $request->id;
        $type = $request->type;
        $user = $request->user(); 
        
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
            // 1. Atualizar Saldo
            $user->coins_balance -= 20;
            $owned[] = $itemId;
            $customData[$ownedKey] = $owned;
            
            $user->custom = $customData;
            $user->save();

            // 2. Registar Transação (NOVO)
            // Tenta encontrar um tipo de débito genérico ou cria se não existir
            $transType = CoinTransactionType::firstOrCreate(
                ['name' => 'Item Purchase'],
                ['type' => 'D'] // Débito
            );

            CoinTransaction::create([
                'user_id' => $user->id,
                'coin_transaction_type_id' => $transType->id,
                'coins' => 20, // Guarda o valor absoluto
                'transaction_datetime' => now(),
                'custom' => ['source' => 'shop', 'item_id' => $itemId, 'item_type' => $type]
            ]);

            return response()->json([
                'message' => 'Comprado com sucesso!',
                'new_balance' => $user->coins_balance
            ]);
        } catch (\Exception $e) {
            Log::error("Erro na compra: " . $e->getMessage());
            return response()->json(['message' => 'Erro no servidor'], 500);
        }
    }

    // ... (Método equip mantém-se igual) ...
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