<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;
use App\Models\CoinTransaction;
use App\Models\CoinTransactionType;
use App\Models\CoinPurchase;

class ShopController extends Controller
{
    public function getCardImage($filename)
    {
        $path = public_path('images/cartas/playing-cards-master/' . trim($filename));

        if (!file_exists($path)) {
            $path = public_path('images/cartas/playing-cards-master/cardflipped.png');
        }

        if (file_exists($path) && filesize($path) === 0) {
            return response()->json(['erro' => 'O ficheiro existe mas tem 0 bytes (está vazio).'], 500);
        }

        if (ob_get_length()) {
            ob_clean();
        }

        return response()->file($path, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
        ]);
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
        $user = auth('sanctum')->user();
        $customData = $user ? ($user->custom ?? []) : [];

        $ownedAvatars = $customData['owned_avatars'] ?? [];
        if ($user && $user->photo_avatar_filename && !in_array($user->photo_avatar_filename, $ownedAvatars)) {
            $ownedAvatars[] = $user->photo_avatar_filename;
        }

        $avatars = [];
        foreach (array_slice(File::files(public_path('storage/photos_avatars')), 0, 30) as $file) {
            $filename = $file->getFilename();
            if ($filename[0] === '.' || !str_contains($filename, '.'))
                continue;

            $avatars[] = [
                'id' => $filename,
                'type' => 'avatar',
                'name' => 'Avatar',
                'url' => asset('api/image-proxy/' . $filename),
                'price' => 20,
                'owned' => in_array($filename, $ownedAvatars),
                'equipped' => $user ? ($user->photo_avatar_filename === $filename) : false,
                'color' => null
            ];
        }

        $cardFiles = ['cardflipped.png', 'cardflipped1.png', 'cardflipped2.png', 'cardflipped3.png'];
        $ownedCards = $customData['owned_cards'] ?? [];
        if (!in_array('cardflipped.png', $ownedCards))
            $ownedCards[] = 'cardflipped.png';
        $currentCard = $customData['equipped_card'] ?? 'cardflipped.png';

        $cards = [];
        foreach ($cardFiles as $filename) {
            $cards[] = [
                'id' => $filename,
                'type' => 'card',
                'name' => ($filename === 'cardflipped.png') ? 'Clássico' : 'Skin Personalizada',
                'url' => asset('api/card-image-proxy/' . $filename),
                'price' => 20,
                'owned' => in_array($filename, $ownedCards),
                'equipped' => $user ? ($currentCard === $filename) : false,
                'color' => null
            ];
        }

        $tableColors = [
            ['id' => 'green', 'hex' => '0xFF1E8449', 'name' => 'Clássico'],
            ['id' => 'red', 'hex' => '0xFF922B21', 'name' => 'Veludo Vermelho'],
            ['id' => 'blue', 'hex' => '0xFF1F618D', 'name' => 'Azul Oceano'],
            ['id' => 'black', 'hex' => '0xFF17202A', 'name' => 'Preto Luxo'],
        ];

        $ownedTables = $customData['owned_tables'] ?? [];
        if (!in_array('green', $ownedTables))
            $ownedTables[] = 'green';
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

        $coins = [
            ['id' => '1', 'type' => 'coins', 'name' => '1 Euro', 'price' => 1, 'coins_amount' => 10],
            ['id' => '5', 'type' => 'coins', 'name' => '5 Euros', 'price' => 5, 'coins_amount' => 50],
            ['id' => '10', 'type' => 'coins', 'name' => '10 Euros', 'price' => 10, 'coins_amount' => 100],
            ['id' => '20', 'type' => 'coins', 'name' => '20 Euros', 'price' => 20, 'coins_amount' => 200],
            ['id' => '50', 'type' => 'coins', 'name' => '50 Euros', 'price' => 50, 'coins_amount' => 500],
            ['id' => '99', 'type' => 'coins', 'name' => '99 Euros', 'price' => 99, 'coins_amount' => 990],
        ];

        return response()->json([
            'avatars' => $avatars,
            'cards' => $cards,
            'tables' => $tables,
            'coins' => $coins
        ]);
    }

    public function buy(Request $request)
    {
        $request->validate([
            'id' => 'required|string',
            'type' => 'required|in:avatar,card,table'
        ]);

        $user = $request->user();
        if (!$user)
            return response()->json(['message' => 'Unauthorized'], 401);

        $itemId = $request->id;
        $type = $request->type;
        $price = 20;

        if ($user->coins_balance < $price) {
            return response()->json(['message' => 'Moedas insuficientes'], 402);
        }

        return DB::transaction(function () use ($user, $itemId, $type, $price) {

            $customData = $user->custom ?? [];
            if (!is_array($customData))
                $customData = [];

            $ownedKey = match ($type) {
                'avatar' => 'owned_avatars',
                'card' => 'owned_cards',
                'table' => 'owned_tables',
            };

            $owned = $customData[$ownedKey] ?? [];
            if (in_array($itemId, $owned)) {
                return response()->json(['message' => 'Item já adquirido'], 409);
            }

            $owned[] = $itemId;
            $customData[$ownedKey] = $owned;
            $user->custom = $customData;

            $transactionType = CoinTransactionType::firstOrCreate(
                ['name' => 'Item purchase'],
                ['type' => 'D']
            );

            CoinTransaction::create([
                'user_id' => $user->id,
                'coin_transaction_type_id' => $transactionType->id,
                'coins' => -$price,
                'transaction_datetime' => now(),
                'custom' => ['item_id' => $itemId, 'item_type' => $type]
            ]);

            $user->decrement('coins_balance', $price);
            $user->save();

            return response()->json([
                'message' => 'Item comprado com sucesso',
                'new_balance' => $user->coins_balance
            ]);
        });
    }

    public function purchase(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        $validated = $request->validate([
            'euros' => 'required|integer|min:1|max:99',
            'payment_method' => ['required', Rule::in(['MBWAY', 'PAYPAL', 'IBAN', 'MB', 'VISA'])],
            'payment_reference' => 'required|string'
        ]);

        $euros = $validated['euros'];
        $method = $validated['payment_method'];
        $reference = $validated['payment_reference'];

        $patterns = [
            'MBWAY' => '/^\d{9}$/',
            'PAYPAL' => '/^[^\s@]+@[^\s@]+\.[^\s@]+$/',
            'IBAN' => '/^[A-Z]{2}\d{23}$/',
            'MB' => '/^\d{5}-\d{9}$/',
            'VISA' => '/^4\d{15}$/',
        ];

        if (!preg_match($patterns[$method], $reference)) {
            return response()->json(['message' => 'Referência inválida'], 422);
        }

        $gatewayResponse = Http::withOptions([
            'verify' => false
        ])->post(
                'https://dad-payments-api.vercel.app/api/debit',
                [
                    'type' => $method,
                    'reference' => $reference,
                    'value' => $euros,
                ]
            );

        if ($gatewayResponse->failed()) {
            return response()->json([
                'message' => 'Pagamento recusado',
                'details' => $gatewayResponse->json()
            ], $gatewayResponse->status());
        }

        $coins = $euros * 10;

        return DB::transaction(function () use ($user, $coins, $euros, $method, $reference) {

            $transactionType = CoinTransactionType::firstOrCreate(
                ['name' => 'Coin purchase'],
                ['type' => 'C']
            );

            $coinTransaction = CoinTransaction::create([
                'user_id' => $user->id,
                'coin_transaction_type_id' => $transactionType->id,
                'coins' => $coins,
                'transaction_datetime' => now(),
            ]);

            CoinPurchase::create([
                'user_id' => $user->id,
                'coin_transaction_id' => $coinTransaction->id,
                'euros' => $euros,
                'payment_type' => $method,
                'payment_reference' => $reference,
                'purchase_datetime' => now(),
            ]);

            $user->increment('coins_balance', $coins);

            return response()->json([
                'message' => 'Coins comprados com sucesso',
                'coins_added' => $coins,
                'new_balance' => $user->fresh()->coins_balance,
                'transaction_id' => $coinTransaction->id
            ]);
        });
    }


    public function equip(Request $request)
    {
        $request->validate([
            'id' => 'required|string',
            'type' => 'required|in:avatar,card,table'
        ]);

        $user = $request->user();
        if (!$user)
            return response()->json(['message' => 'Unauthorized'], 401);

        $itemId = $request->id;
        $type = $request->type;
        $customData = $user->custom ?? [];

        if ($type === 'avatar') {
            $owned = $customData['owned_avatars'] ?? [];
            if (!in_array($itemId, $owned) && $user->photo_avatar_filename !== $itemId) {
                return response()->json(['message' => 'Não possuis este item'], 403);
            }
            $user->photo_avatar_filename = $itemId;
        } else {
            $ownedKey = $type === 'card' ? 'owned_cards' : 'owned_tables';
            $equipKey = $type === 'card' ? 'equipped_card' : 'equipped_table';

            $owned = $customData[$ownedKey] ?? [];
            if (!in_array($itemId, $owned) && !in_array($itemId, ['cardflipped.png', 'green'])) {
                return response()->json(['message' => 'Não possuis este item'], 403);
            }

            $customData[$equipKey] = $itemId;
            $user->custom = $customData;
        }

        $user->save();
        return response()->json(['message' => 'Equipado com sucesso']);
    }
}
