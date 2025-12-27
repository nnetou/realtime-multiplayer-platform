import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Toaster } from "@/components/ui/sonner";
import { toast } from "vue-sonner";
import HomeView from '../views/HomeView.vue'
import AboutPage from '../pages/about/AboutPage.vue'
import HomePage from '../pages/home/HomePage.vue'
import SinglePlayerGamePage from '../pages/game/SinglePlayerGamePage.vue'
import MultiPlayerLobbyPage from '../pages/game/MultiPlayerLobbyPage.vue'
import MultiPlayerGamePage from '../pages/game/MultiPlayerGamePage.vue'
import LoginPage from '../pages/login/LoginPage.vue'
import HistoryPage from '../pages/history/HistoryPage.vue'
import ScoreboardsPage from '../pages/scoreboards/ScoreboardsPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/game',
      children: [{
        path: 'singleplayer',
        children: [
          {
            // Rota para um jogo rápido: /game/quick
            path: 'quick',
            name: 'quick-game',
            component: SinglePlayerGamePage,
            // Propriedade meta para identificar facilmente o modo
            meta: { playMode: 'single_game' }
          },
          {
            // Rota para uma match: /game/match
            path: 'match',
            name: 'full-match',
            component: SinglePlayerGamePage,
            meta: { playMode: 'match' }
          }
        ],
        path: 'multiplayer',
        children: [
          {
            path: 'lobby',
            name: 'lobby',
            component: MultiPlayerLobbyPage,
            meta: { requiresAuth: true }
          },
          {
            path: 'quick',
            name: 'quick-game',
            component: MultiPlayerGamePage,
            meta: { playMode: 'single_game' }
          },
          {
            path: 'match',
            name: 'full-match',
            component: MultiPlayerGamePage,
            meta: { playMode: 'match' }
          },
        ]

      }]
    },
    {
      path: '/about',
      name: 'about',
      component: AboutPage,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/scoreboards',
      name: 'scoreboards',
      component: ScoreboardsPage,
      meta: { requiresAuth: true },
    }
  ],
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    toast.error('This navigation requires authentication')
    next({ name: 'login' })
  } else {
    next()
  }
})

export default router