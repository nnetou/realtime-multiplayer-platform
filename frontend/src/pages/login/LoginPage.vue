<template>
  <div
    class="flex min-h-screen items-center justify-center bg-[#1e8449] px-4 py-12 sm:px-6 lg:px-8"
  >
    <Card class="w-full max-w-md shadow-lg">
      <CardHeader class="text-center">
        <CardTitle class="text-3xl font-bold tracking-tight text-gray-900">
          Sign in to your account
        </CardTitle>
        <CardDescription class="pt-1">
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <div>
              <label
                for="email"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Email address
              </label>
              <Input
                id="email"
                v-model="formData.email"
                type="email"
                autocomplete="email"
                required
              />
            </div>

            <div>
              <label
                for="password"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <Input
                id="password"
                v-model="formData.password"
                type="password"
                autocomplete="current-password"
                required
              />
            </div>
          </div>

          <div>
            <Button type="submit" class="w-full"> Sign in </Button>
          </div>
        </form>
      </CardContent>

      <CardFooter class="flex justify-center text-sm">
        <span class="text-gray-600">Don't have an account? </span>
        <button
          type="button"
          class="ml-1 font-medium text-[#007bff] hover:text-gray-800"
          @click="router.push({ name: 'register' })"
        >
          Sign up
        </button>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";

const authStore = useAuthStore();
const router = useRouter();

const formData = ref({
  email: "pa@mail.pt",
  password: "123",
});

const handleSubmit = async () => {
  console.log("Submitting form with data: ", formData.value);
  
  toast.promise(authStore.login(formData.value), {
    loading: "Calling API...",
    success: (data) => {
      // SÓ REDIRECIONA AQUI, SE TIVER SUCESSO
      router.push("/");
      return `Login Successful`;
    },
    error: (error) => {
      // CORREÇÃO DO ERRO DE STATUS
      if (error.response && error.response.status === 401) {
        return `[API] Incorrect username or password`;
      }
      if (error.response && error.response.data) {
        return `[API] Error: ${error.response.data.message}`;
      }
      return "[API] Connection error or Server offline";
    },
  });
  
  // REMOVIDO: router.push("/"); daqui de baixo.
  // Se estiver aqui, ele redireciona mesmo que a password esteja errada.
};
</script>