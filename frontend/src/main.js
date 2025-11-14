import { createApp } from 'vue'
import { io } from 'socket.io-client'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import AboutPage from './pages/about/AboutPage.vue'
const socket = io('http://localhost:3000')

const app = createApp(App)
app.provide('socket', socket)
app.use(createPinia())
app.use(router)

app.mount('#app')
