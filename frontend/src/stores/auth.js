import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAPIStore } from './api'
import { useSocketStore } from './socket.js'

export const useAuthStore = defineStore('auth', () => {
    const apiStore = useAPIStore()
    const currentUser = ref(undefined)
    const socketStore = useSocketStore()
    const isLoggedIn = computed(() => {
        return currentUser.value !== undefined
    })
    const restoreUser = async () => {
        const token = sessionStorage.getItem('token')
        if (token) {
            try {
                const response = await apiStore.getAuthUser()
                currentUser.value = response.data
            } catch (error) {
                console.error("Erro ao restaurar utilizador:", error)
                sessionStorage.removeItem('token')
                currentUser.value = undefined
            }
        }
    }
    const login = async (credentials) => {
        await apiStore.postLogin(credentials)
        const response = await apiStore.getAuthUser()
        socketStore.emitJoin(currentUser.value)
        currentUser.value = response.data
        return response.data
    }
    const logout = async () => {
        await apiStore.postLogout()
        currentUser.value = undefined
        socketStore.emitLeave()
    }
    restoreUser()
    return {
        currentUser,
        isLoggedIn,
        restoreUser,
        login,
        logout,
    }
})