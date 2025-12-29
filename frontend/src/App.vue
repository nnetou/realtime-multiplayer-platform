<template>
  <Toaster rich-colors />
  
  <nav class="max-w-full p-5 flex flex-row justify-between items-center bg-[#1e8449] shadow-sm">
    <div class="align-middle font-bold text-xl text-[#f8f9fa] hover:text-gray-300">
      <RouterLink to="/"> BISCA APP </RouterLink>
    </div>

    <NavigationMenu>
      <NavigationMenuList class="justify-around gap-5">
        <NavigationMenuItem>
          <NavigationMenuTrigger class="user-badge-btn">Games</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink as-child>
              <RouterLink to="/game/singleplayer/quickgame">Single Player - Quick</RouterLink>
            </NavigationMenuLink>
            <NavigationMenuLink as-child>
              <RouterLink to="/games/singleplayer">Single Player - Match</RouterLink>
            </NavigationMenuLink>
            <NavigationMenuLink>Multi Player Game</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        
        <NavigationMenuItem v-if="authStore.user">
          <NavigationMenuLink class="user-badge-btn" as-child>
            <RouterLink to="/">
              {{ authStore.user.nickname || authStore.user.name || "My Profile" }}
            </RouterLink>
          </NavigationMenuLink>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink class="user-badge-btn" as-child>
            <RouterLink v-if="!authStore.isAuthenticated" to="/login">Login</RouterLink>
            <a v-else @click.prevent="handleLogout" class="logout-link cursor-pointer">Logout</a>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  </nav>

  <main>
    <RouterView />
  </main>
</template>

<script setup>
import { onMounted } from "vue";
import {
  NavigationMenu, NavigationMenuContent, NavigationMenuItem,
  NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { RouterLink, RouterView, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth.js";
import { Toaster } from "@/components/ui/sonner";
import { useSocketStore } from "@/stores/socket";
import "vue-sonner/style.css";

const authStore = useAuthStore();
const socketStore = useSocketStore();
const router = useRouter();

const handleLogout = async () => {
    await authStore.logout();
    router.push('/login');
};

onMounted(() => {
  // Tenta restaurar a sessão discretamente
  authStore.restoreUser().then((isLoggedIn) => {
      if (isLoggedIn) {
          socketStore.handleConnection();
          socketStore.handleGameEvents();
      }
  });
});
</script>

<style scoped>
:deep(.user-badge-btn) {
  font-size: 0.75rem;
  background-color: #f3f4f6;
  color: #1f2937;
  margin-left: 1rem;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  border-radius: 0.75rem;
  border: 1px solid rgba(229, 231, 235, 0.5);
  transition: all 0.2s ease-in-out;
}
:deep(.user-badge-btn:hover) {
  transform: translateY(-4px);
}
:deep(.logout-link:hover) {
  background-color: #dc2626;
  color: white;
  transform: scale(1.05);
}
</style>