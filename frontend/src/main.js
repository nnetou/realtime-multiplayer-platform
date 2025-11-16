import { createApp } from 'vue'
import { io } from 'socket.io-client'
import { createPinia } from 'pinia'

import App from './App.vue'

import router from './router'

import { useAuthStore } from './stores/auth.js'


const API_BASE_URL = 'http://localhost:8000/api'

const app = createApp(App)

const socket = io('http://localhost:3000')
app.provide('socket', socket)
app.provide('apiBaseURL', API_BASE_URL)

app.use(createPinia())
app.use(router)

app.mount('#app')

const authStore = useAuthStore()
await authStore.restoreUser()