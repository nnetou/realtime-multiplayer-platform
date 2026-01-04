import { defineStore } from 'pinia'
import axios from 'axios'
import { ref, inject } from 'vue'

export const useAPIStore = defineStore('api', () => {
    const API_BASE_URL = inject('apiBaseURL')

    const token = ref(sessionStorage.getItem('token'))

    if (token.value) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
    }

    const get = (url) => {
        return axios.get(`${API_BASE_URL}${url}`)
    }

    const post = (url, data = {}) => {
        return axios.post(`${API_BASE_URL}${url}`, data)
    }

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

    const getAuthUser = () => {
        return axios.get(`${API_BASE_URL}/users/me`)
    }

    const putUser = (data) => {
        return axios.put(`${API_BASE_URL}/users/me`, data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
    }

    const postGame = (game) => {
        return axios.post(`${API_BASE_URL}/matches`, game)
    }

    const getGames = () => {
        return axios.get(`${API_BASE_URL}/games`)
    }

    return {
        get,
        post,

        postLogin,
        postLogout,

        // user
        getAuthUser,
        putUser,

        // jogos
        postGame,
        getGames,

        // estado
        token
    }
})
