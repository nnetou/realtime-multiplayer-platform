<template>
  <div class="flex flex-row justify-center items-stretch gap-5 mt-10">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle class="text-3xl text-black-500 font-bold text-center">
          Single Player
        </CardTitle>
        <CardDescription class="text-center text-purple-600">
          Play alone against a bot!
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="flex justify-center gap-4">
          <Button
            @click="startSinglePlayerGame"
            size="lg"
            variant="secondary"
            class="hover:bg-purple-500 hover:text-slate-100"
          >
            Start Game
          </Button>
          <Button
            @click="startSinglePlayerGame"
            size="lg"
            variant="secondary"
            class="hover:bg-purple-500 hover:text-slate-100"
          >
            Start Match
          </Button>
        </div>
      </CardContent>
    </Card>
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle class="text-3xl text-black-500 font-bold text-center">
          Multi Player
        </CardTitle>
        <CardDescription class="text-center text-purple-600">
          Play alone against other player!
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="flex justify-center gap-4">
          <Button
            @click="startSinglePlayerGame"
            size="lg"
            variant="secondary"
            class="hover:bg-purple-500 hover:text-slate-100"
          >
            Start Game
          </Button>
          <Button
            @click="startSinglePlayerGame"
            size="lg"
            variant="secondary"
            class="hover:bg-purple-500 hover:text-slate-100"
          >
            Start Match
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup>
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();

const startSinglePlayerGame = () => {
  console.log("Starting Single Player Game...");
  console.log(
    "Não vamos usar, mas dá um ponteiro para a rota atual:",
    route.name
  );
  router.push({ name: "singleplayer" });
};
</script>
