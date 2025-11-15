<template>
  <Toaster />
  <nav class="max-w-full p-5 flex flex-row justify-between align-middle">
    <div class="align-middle text-xl">
      <RouterLink to="/"> BISCA APP </RouterLink>
      <span class="text-xs text-purple-500" v-if="authStore.currentUser"
        >&nbsp;&nbsp;&nbsp; ({{ authStore.currentUser?.name }})
      </span>
    </div>

    <NavigationMenu>
      <NavigationMenuList class="justify-around gap-5">
        <NavigationMenuItem>
          <NavigationMenuTrigger>Games</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink as-child>
              <RouterLink to="/games/singleplayer">
                Single Player Game
              </RouterLink>
            </NavigationMenuLink>
            <NavigationMenuLink> MultiPlayer Game </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem v-if="!authStore.isLoggedIn">
          <NavigationMenuLink>
            <RouterLink to="/login">Login</RouterLink>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem v-else>
          <NavigationMenuLink>
            <a @click.prevent="logout">Logout</a>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink as-child>
            <RouterLink to="/about"> About </RouterLink>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  </nav>
  <div>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { RouterLink, RouterView } from "vue-router";
import { useAuthStore } from "@/stores/auth.js";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "vue-sonner";
import "vue-sonner/style.css";

const authStore = useAuthStore();

const logout = () => {
  toast.promise(authStore.logout(), {
    loading: "Calling API",
    success: () => {
      return "Logout Sucessfull ";
    },
    error: (data) =>
      `[API] Error saving game - ${data?.response?.data?.message}`,
  });
};
</script>

<style></style>
