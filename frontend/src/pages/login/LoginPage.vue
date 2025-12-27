<template>
  <div
    class="flex min-h-screen items-center justify-center bg-[#1e8449] px-4 py-12 sm:px-6 lg:px-8"
  >
    <!-- O div principal foi substituído por um Card -->
    <Card class="w-full max-w-md shadow-lg">
      <CardHeader class="text-center">
        <CardTitle class="text-3xl font-bold tracking-tight text-gray-900">
          Sign in to your account
        </CardTitle>
        <CardDescription class="pt-1">
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>

      <!-- O formulário agora está dentro do CardContent -->
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
        <a href="#" class="ml-1 font-medium text-[#007bff] hover:text-gray-800">
          Sign up
        </a>
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
    loading: "Calling API",
    success: (data) => {
      return `Login Sucessfull - ${data?.name}`;
    },
    error: (data) => {
      if (data.response.status === 401) {
        console.log("Estou aqui");
        return `[API] Error loggin in - Incorrect username or password`;
      }
      return `[API] Error loggin in - ${data?.response?.data?.message}`;
    },
  });

  router.push("/");
};
</script>
