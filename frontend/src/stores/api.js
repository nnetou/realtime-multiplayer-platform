import { defineStore } from 'pinia'
import axios from 'axios'
import { ref, inject } from 'vue'

export const useAPIStore = defineStore('api', () => {
    const API_BASE_URL = inject('apiBaseURL')

    const token = ref(sessionStorage.getItem('token'))

    const postGame = (game) => {
        return axios.post(`${API_BASE_URL}/games`, game)
    }

    // Restaurar token ao iniciar
    if (token.value) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
    }

    const getGames = () => {
        return axios.get(`${API_BASE_URL}/games`)
    }

    // AUTH
    const postLogin = async (credentials) => {
        const response = await axios.post(`${API_BASE_URL}/login`, credentials)
        token.value = response.data.token
        sessionStorage.setItem('token', token.value)
        axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
    }

    const postLogout = async () => {
        await axios.post(`${API_BASE_URL}/logout`)
        token.value = undefined
        sessionStorage.removeItem('token')
        delete axios.defaults.headers.common['Authorization']
    }

    // Users
    const getAuthUser = () => {
        return axios.get(`${API_BASE_URL}/users/me`)
    }

    return {
        postGame,
        getGames,
        postLogin,
        postLogout,
        getAuthUser,
        token
    }
})
