import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { toast } from "vue-sonner";
import HomePage from '../pages/home/HomePage.vue'
import SinglePlayerGamePage from '../pages/game/SinglePlayerGamePage.vue'
import MultiPlayerLobbyPage from '../pages/game/MultiPlayerLobbyPage.vue'
import MultiPlayerGamePage from '../pages/game/MultiPlayerGamePage.vue'
import LoginPage from '../pages/login/LoginPage.vue'
import RegisterPage from '../pages/login/RegisterPage.vue'
import AboutPage from '../pages/about/AboutPage.vue'
import HistoryPage from '../pages/history/HistoryPage.vue'
import ScoreboardsPage from '../pages/scoreboards/ScoreboardsPage.vue'
import ProfilePage from '../pages/profile/ProfilePage.vue'
import ProfileEditPage from '../pages/profile/ProfileEditPage.vue'
import AdminHistoryPage from '../pages/history/AdminHistoryPage.vue'
import AdminDashboard from '../pages/admin/AdminDashboard.vue'
import ShopPage from '../pages/shop/ShopPage.vue'
import CoinTransactionsPage from '../pages/profile/CoinTransactionsPage.vue'
import StatisticsPage from '../pages/profile/StatisticsPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/statistics',
      name: 'statistics',
      component: StatisticsPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/game',
      children: [
        {
          path: 'singleplayer',
          children: [
            {
              path: 'quick',
              name: 'quick-game',
              component: SinglePlayerGamePage,
              meta: { playMode: 'single_game', requiresAuth: true }
            },
            {
              path: 'match',
              name: 'full-match',
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
              name: 'multiplayer-quick-game',
              component: MultiPlayerGamePage,
              meta: { playMode: 'single_game', requiresAuth: true }
            },
            {
              path: 'match',
              name: 'multiplayer-full-match',
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
      path: '/register',
      name: 'register',
      component: RegisterPage,
    },
    {
      path: '/shop',
      name: 'shop',
      component: ShopPage,
      meta: { requiresAuth: true }
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
      path: '/profile/transactions',
      name: 'coin-transactions',
      component: CoinTransactionsPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/history',
      name: 'admin-history',
      component: AdminHistoryPage,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/scoreboards',
      name: 'scoreboards',
      component: ScoreboardsPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'admin-dashboard',
      component: AdminDashboard,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    // Keep legacy routes for direct access (e.g., from user list buttons)
    {
      path: '/admin/users',
      redirect: '/admin'
    },
    {
      path: '/admin/transactions',
      redirect: '/admin'
    },
    {
      path: '/admin/games',
      redirect: '/admin'
    }
  ],
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    toast.error('Esta navegação requer autenticação')
    next({ name: 'login' })
  } else {
    next()
  }
})

export default router