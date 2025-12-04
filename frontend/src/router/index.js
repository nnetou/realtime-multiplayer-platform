import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AboutPage from '../pages/about/AboutPage.vue'
import HomePage from '../pages/home/HomePage.vue'
import SinglePlayerGamePage from '../pages/game/SinglePlayerGamePage.vue'
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
      path: '/games',
      children: [
        {
          path: '/singleplayer',
          name: 'singleplayer',
          component: SinglePlayerGamePage
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
      path: '/history',
      name: 'history',
      component: HistoryPage,
    },
    {
      path: '/scoreboards',
      name: 'scoreboards',
      component: ScoreboardsPage,
    }
  ],
})

export default router