<template>
  <div class="container mx-auto p-4">
    <div class="max-w-4xl mx-auto space-y-6">
      <Card class="bg-slate-50 border-dashed border-2">
        <CardHeader>
          <CardTitle class="text-xl flex justify-between items-center">
            Lobby Multijogador
            <Button
              @click="openCreateModal"
              class="bg-green-600 hover:bg-green-700"
            >
              Criar Nova Sala
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>

      <Card
        v-if="gameStore.myGames && gameStore.myGames.length > 0"
        class="border-blue-500 border-2"
      >
        <CardHeader>
          <CardTitle class="text-lg text-blue-700">As Tuas Salas</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <div
            v-for="game in gameStore.myGames"
            :key="game.id"
            class="bg-blue-50 p-4 rounded-lg flex items-center justify-between"
          >
            <div>
              <div class="flex items-center gap-2 mb-2">
                <Badge variant="secondary" class="bg-indigo-100 text-indigo-700"
                  >Bisca de {{ game.gameType || "3" }}</Badge
                >
                <Badge
                  v-if="game.betAmount > 0"
                  class="bg-yellow-100 text-yellow-800 border-yellow-200"
                  >Aposta: {{ game.betAmount }} 🪙</Badge
                >
                <Badge v-else class="bg-gray-100 text-gray-600">Grátis</Badge>
              </div>
              <p
                v-if="!game.player2"
                class="animate-pulse text-sm text-gray-600"
              >
                A aguardar oponente...
              </p>
              <p v-else class="font-bold text-green-600">
                Oponente pronto: {{ game.player2Name }}
              </p>
            </div>
            <div class="space-x-2">
              <Button @click="cancelGame(game)" variant="destructive" size="sm"
                >Cancelar</Button
              >
              <Button
                v-if="game.player2"
                @click="startGame(game)"
                variant="default"
                size="sm"
                class="bg-blue-600"
                >Começar Jogo</Button
              >
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-lg flex justify-between items-center">
            Salas Disponíveis ({{ gameStore.availableGames?.length || 0 }})
            <Button
              @click="socketStore.emitGetGames"
              variant="outline"
              size="sm"
              >🔄 Atualizar</Button
            >
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            v-if="
              !gameStore.availableGames || gameStore.availableGames.length === 0
            "
            class="text-center py-10 text-gray-400"
          >
            <p class="text-5xl mb-4">🃏</p>
            <p>Nenhuma sala aberta de momento.</p>
          </div>

          <div v-else class="grid gap-4">
            <div
              v-for="game in gameStore.availableGames"
              :key="game.id"
              class="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-xl hover:bg-slate-50 transition-all gap-4"
            >
              <div>
                <p class="font-bold text-lg flex items-center gap-2">
                  Sala de {{ game.player1Name || "Anónimo" }}
                </p>
                <div class="flex gap-2 mt-2">
                  <Badge class="bg-indigo-600 hover:bg-indigo-700"
                    >Bisca de {{ game.gameType || "3" }}</Badge
                  >
                  <Badge
                    v-if="game.betAmount > 0"
                    class="bg-yellow-500 hover:bg-yellow-600 text-white border-0"
                    >💰 {{ game.betAmount }} 🪙</Badge
                  >
                  <Badge
                    v-else
                    variant="outline"
                    class="text-green-600 border-green-600"
                    >Jogo Grátis</Badge
                  >
                </div>
              </div>
              <Button
                @click="joinGame(game)"
                class="bg-blue-600 hover:bg-blue-700 min-w-[100px]"
                :disabled="authStore.user.coins_balance < game.betAmount"
              >
                {{
                  authStore.user.coins_balance < game.betAmount
                    ? "Saldo Insuficiente"
                    : "Entrar"
                }}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div
        class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-6 animate-in fade-in zoom-in duration-200"
      >
        <h2 class="text-2xl font-bold text-gray-800 border-b pb-2">
          Configurar Nova Sala
        </h2>

        <div class="space-y-2">
          <label class="font-semibold text-gray-700">Modo de Jogo</label>
          <div class="grid grid-cols-2 gap-4">
            <button
              @click="newGameConfig.playMode = 'single_game'"
              class="p-4 rounded-lg border-2 text-center transition-all"
              :class="
                newGameConfig.playMode === 'single_game'
                  ? 'border-green-600 bg-green-50 text-green-700 font-bold'
                  : 'border-gray-200 hover:border-gray-300'
              "
            >
              Single Game
            </button>
            <button
              @click="newGameConfig.playMode = 'match'"
              class="p-4 rounded-lg border-2 text-center transition-all"
              :class="
                newGameConfig.playMode === 'match'
                  ? 'border-green-600 bg-green-50 text-green-700 font-bold'
                  : 'border-gray-200 hover:border-gray-300'
              "
            >
              Match
            </button>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <button
              @click="newGameConfig.type = 3"
              class="p-4 rounded-lg border-2 text-center transition-all"
              :class="
                newGameConfig.type === 3
                  ? 'border-green-600 bg-green-50 text-green-700 font-bold'
                  : 'border-gray-200 hover:border-gray-300'
              "
            >
              Bisca de 3
            </button>
            <button
              @click="newGameConfig.type = 9"
              class="p-4 rounded-lg border-2 text-center transition-all"
              :class="
                newGameConfig.type === 9
                  ? 'border-green-600 bg-green-50 text-green-700 font-bold'
                  : 'border-gray-200 hover:border-gray-300'
              "
            >
              Bisca de 9
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <label class="font-semibold text-gray-700"
            >Valor da Aposta
            {{
              newGameConfig.playMode === "single_game"
                ? "2"
                : "(Min:3) (Máx:100)"
            }}</label
          >
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2">💰</span>
            <input
              v-model.number="newGameConfig.bet"
              type="number"
              :min="newGameConfig.playMode === 'single_game' ? 2 : 3"
              :max="newGameConfig.playMode === 'single_game' ? 2 : 100"
              class="w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="0 para grátis"
            />
          </div>
          <p class="text-xs text-gray-500 mt-1">
            Saldo atual: {{ authStore.user?.coins_balance }} 🪙
          </p>
        </div>

        <div class="flex flex-col gap-3 pt-4">
          <Button
            @click="confirmCreateGame"
            class="w-full bg-green-600 hover:bg-green-700"
            :disabled="!isValidBet"
            >Criar Sala</Button
          >
          <Button
            variant="outline"
            class="w-full"
            @click="showCreateModal = false"
            >Cancelar</Button
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, inject, ref, computed } from "vue";
import { useGameStore } from "@/stores/gameStore";
import { useAuthStore } from "@/stores/auth";
import { useSocketStore } from "@/stores/socket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";

const router = useRouter();
const gameStore = useGameStore();
const authStore = useAuthStore();
const socketStore = useSocketStore();
const socket = inject("socket");

const showCreateModal = ref(false);
const newGameConfig = ref({ playMode: "match", type: 3, bet: 3 });

const isValidBet = computed(() => {
  const bet = newGameConfig.value.bet;
  const isMatchMode = newGameConfig.value.playMode === "match";
  if (isMatchMode) {
    return (
      bet >= 3 && bet <= 100 && bet <= (authStore.user?.coins_balance || 0)
    );
  } else {
    return bet === 2 && bet <= (authStore.user?.coins_balance || 0);
  }
});

const openCreateModal = () => {
  newGameConfig.value = { playMode: "match", type: 3, bet: 2 };
  showCreateModal.value = true;
};

// AQUI ESTÁ A CORREÇÃO: ENVIAR A APOSTA
const confirmCreateGame = () => {
  const userData = {
    player1Id: authStore?.user.id,
    playerName: authStore.user?.nickname || "Jogador",
    playMode: newGameConfig.value.playMode,
    gameType: newGameConfig.value.type,
    betAmount: newGameConfig.value.bet,
  };

  const gameDataWithToken = {
    ...userData,
    authToken: authStore?.token,
  };
  socketStore.emitCreateGame(gameDataWithToken);
  showCreateModal.value = false;
};

const cancelGame = (game) => {
  gameStore.cancelGame(socket, game);
};
const joinGame = (game) => {
  socketStore.emitJoinGame(game.id);
};
const startGame = (game) => {
  gameStore.multiplayerGame = game;
  if (newGameConfig.value.playMode === "single_game") {
    router.push({ name: "multiplayer-quick-game" });
  } else {
    router.push({ name: "multiplayer-full-match" });
  }
};

onMounted(() => {
  socketStore.handleGameEvents();
  socketStore.emitGetGames();
});
</script>
