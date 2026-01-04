import { defineStore } from 'pinia';
import axios from 'axios';

const storedToken = localStorage.getItem('token');
if (storedToken) {
    axios.defaults.headers.common['Authorization'] = 'Bearer ' + storedToken;
}

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: JSON.parse(localStorage.getItem('user')) || null,
        token: localStorage.getItem('token') || null,
    }),

    getters: {
        isAuthenticated: (state) => !!state.token,

        userName: (state) => state.user?.nickname || state.user?.name || "Utilizador",
        type: (state) => state.user?.type || "P",
    },

    actions: {

        async restoreUser() {
            if (this.token) {
                axios.defaults.headers.common['Authorization'] = 'Bearer ' + this.token;
                console.log("✅ Sessão ativa. User:", this.userName);
                return true;
            }
            return false;
        },

        async login(credentials) {
            try {
                const config = {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };
                const response = await axios.post('http://localhost:8000/api/login', credentials, config);

                const token = response.data.access_token || response.data.token;
                const user = response.data.user || response.data.data;

                if (token && user) {
                    this.token = token;
                    this.user = user;

                    localStorage.setItem('token', token);
                    localStorage.setItem('user', JSON.stringify(user));

                    axios.defaults.headers.common['Authorization'] = 'Bearer ' + token;

                    return true;
                }
                return false;
            } catch (error) {
                console.error("Erro no login:", error);
                throw error;
            }
        },

        async logout() {
            this.user = null;
            this.token = null;

            localStorage.removeItem('token');
            localStorage.removeItem('user');
            delete axios.defaults.headers.common['Authorization'];

            window.location.href = '/login';
        },

        setUser(user) {
            this.user = user;
            localStorage.setItem('user', JSON.stringify(user));
        }
    }
});