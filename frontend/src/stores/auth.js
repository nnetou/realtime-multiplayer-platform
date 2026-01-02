import { defineStore } from 'pinia';
import axios from 'axios';

// Configura o Axios imediatamente se existir token (para não falhar no F5)
const storedToken = localStorage.getItem('token');
if (storedToken) {
    axios.defaults.headers.common['Authorization'] = 'Bearer ' + storedToken;
}

export const useAuthStore = defineStore('auth', {
    state: () => ({
        // Inicializa logo com o que está no browser
        user: JSON.parse(localStorage.getItem('user')) || null,
        token: localStorage.getItem('token') || null,
    }),

    getters: {
        // --- CORREÇÃO AQUI ---
        // Transformámos isto num GETTER. Ele calcula-se sozinho.
        // Se houver token, retorna true. Não há como enganar.
        isAuthenticated: (state) => !!state.token,
        
        userName: (state) => state.user?.nickname || state.user?.name || "Utilizador",
    },

    actions: {
        // Função chamada no main.js
        async restoreUser() {
            if (this.token) {
                // Reforça o header do axios
                axios.defaults.headers.common['Authorization'] = 'Bearer ' + this.token;
                console.log("✅ Sessão ativa. User:", this.userName);
                return true;
            }
            return false;
        },

        async login(credentials) {
            try {
                // Ajusta o URL se necessário
                const response = await axios.post('http://localhost:8000/api/login', credentials);
                
                const token = response.data.access_token || response.data.token;
                const user = response.data.user || response.data.data;

                if (token && user) {
                    // 1. Atualiza Estado
                    this.token = token;
                    this.user = user;

                    // 2. Grava no Browser
                    localStorage.setItem('token', token);
                    localStorage.setItem('user', JSON.stringify(user));
                    
                    // 3. Configura Axios
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
            
            // Recarrega a página para limpar tudo da memória
            window.location.href = '/login';
        }
    }
});
