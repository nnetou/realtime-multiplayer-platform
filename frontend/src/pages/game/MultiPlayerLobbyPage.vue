<template>
  <div class="container mx-auto p-4">
    <div class="max-w-4xl mx-auto space-y-6">
      <Card class="bg-slate-50 border-dashed border-2">
        <CardHeader>
          <CardTitle class="text-xl flex justify-between items-center">
            Lobby Multijogador
            <Button
              @click="createNewGame"
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
              <p v-if="!game.player2" class="animate-pulse">
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
              class="flex items-center justify-between p-4 border rounded-xl hover:bg-slate-50 transition-all"
            >
              <div>
                <p class="font-bold text-lg">
                  Sala de {{ game.player1Name || "Anónimo" }}
                </p>

                <div class="flex gap-2 mt-1">
                  <Badge variant="outline" class="text-blue-600 border-blue-600"
                    >Disponível</Badge
                  >
                  <span class="text-xs text-gray-400 flex items-center"
                    >#{{ game.id.slice(0, 4) }}</span
                  >
                </div>
              </div>

              <Button
                @click="joinGame(game)"
                class="bg-blue-600 hover:bg-blue-700"
              >
                Entrar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { onMounted, inject } from "vue";
import { useGameStore } from "@/stores/gameStore";
import { useAuthStore } from "@/stores/auth";
import { useSocketStore } from "@/stores/socket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "vue-router";
import { User } from "lucide-vue-next";

const router = useRouter();
const gameStore = useGameStore();
const authStore = useAuthStore();
const socketStore = useSocketStore();
const socket = inject("socket");


const cancelGame = (game) => {
  gameStore.cancelGame(socket, game);
};

const joinGame = (game) => {
  // Chamada à função agora definida no socket.js
  socketStore.emitJoinGame(game);
};

const startGame = (game) => {
  gameStore.multiplayerGame = game;
  router.push({ name: "mp-full-match" });
};

onMounted(() => {
  // 1. Ativa os ouvintes (fundamental!)
  socketStore.handleGameEvents(); 

  // 2. Pede a lista atual
  socketStore.emitGetGames();
});

// Certifica-te que a função createNewGame está atualizada também (da resposta anterior):
const createNewGame = () => {
    const userData = { 
        playerName: authStore.user?.nickname || authStore.user?.name || "Jogador" 
    };
    socketStore.emitCreateGame(userData);
};
</script>
