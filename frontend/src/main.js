import { createApp } from 'vue'
import { io } from 'socket.io-client'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import { useAuthStore } from './stores/auth.js'

const apiDomain = import.meta.env.VITE_API_DOMAIN
const wsConnection = import.meta.env.VITE_WS_CONNECTION

console.log('[main.js] api domain', apiDomain)
console.log('[main.js] ws connection', wsConnection)

const app = createApp(App)

app.provide('socket', io(wsConnection))

app.provide('serverBaseURL', `http://${apiDomain}`)
app.provide('apiBaseURL', `http://${apiDomain}/api`)

app.use(createPinia())
app.use(router)

app.mount('#app')

const authStore = useAuthStore()

authStore.restoreUser().then(() => {
    console.log('User restoration complete.')
}).catch(error => {
    console.error('Error restoring user:', error)
})