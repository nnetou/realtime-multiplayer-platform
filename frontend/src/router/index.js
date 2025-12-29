import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { toast } from "vue-sonner";
import HomePage from '../pages/home/HomePage.vue'
import SinglePlayerGamePage from '../pages/game/SinglePlayerGamePage.vue'
import MultiPlayerLobbyPage from '../pages/game/MultiPlayerLobbyPage.vue'
import MultiPlayerGamePage from '../pages/game/MultiPlayerGamePage.vue'
import LoginPage from '../pages/login/LoginPage.vue'
import AboutPage from '../pages/about/AboutPage.vue'
import HistoryPage from '../pages/history/HistoryPage.vue'
import ScoreboardsPage from '../pages/scoreboards/ScoreboardsPage.vue'
import ProfilePage from '../pages/profile/ProfilePage.vue'
import ProfileEditPage from '../pages/profile/ProfileEditPage.vue'

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
      children: [
        {
          path: 'singleplayer',
          children: [
            {
              path: 'quick',
              name: 'quick-game', // CORRIGIDO: match com HomeView
              component: SinglePlayerGamePage,
              meta: { playMode: 'single_game', requiresAuth: true } // Opcional: proteger jogo
            },
            {
              path: 'match',
              name: 'full-match', // CORRIGIDO: match com HomeView
              component: SinglePlayerGamePage,
              meta: { playMode: 'match', requiresAuth: true }
            }
          ]
        },
        {
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
              name: 'mp-quick-game',
              component: MultiPlayerGamePage,
              meta: { playMode: 'single_game', requiresAuth: true }
            },
            {
              path: 'match',
              name: 'mp-full-match',
              component: MultiPlayerGamePage,
              meta: { playMode: 'match', requiresAuth: true }
            },
          ]
        }
      ]
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
      path: '/profile',
      name: 'profile',
      component: ProfilePage,
      meta: { requiresAuth: true },
    },
    {
      path: '/profile/edit',
      name: 'profile-edit',
      component: ProfileEditPage,
      meta: { requiresAuth: true },
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

// === GUARDA DE NAVEGAÇÃO CORRIGIDO ===
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  // CORREÇÃO: Usar isAuthenticated em vez de isLoggedIn
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    toast.error('Esta navegação requer autenticação')
    next({ name: 'login' })
  } else {
    next()
  }
})

export default router