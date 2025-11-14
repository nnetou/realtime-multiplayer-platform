import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AboutPage from '../pages/about/AboutPage.vue'
import HomePage from '../pages/home/HomePage.vue'
import SinglePlayerGamePage from '@/pages/game/SinglePlayerGamePage.vue'


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
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
    },
  ],
})

export default router
