<template>
  <div class="min-h-screen bg-slate-100 p-4 md:p-8">
    <div class="max-w-6xl mx-auto">
      
      <div class="flex justify-between items-end mb-6">
        <div>
           <h1 class="text-4xl font-bold text-[#1e8449]">Loja de Itens</h1>
           <p class="text-gray-600">Personaliza o teu jogo!</p>
        </div>
        <div class="bg-white px-4 py-2 rounded-xl shadow-md border border-yellow-400">
           <span class="text-sm font-bold text-gray-500 uppercase">O teu Saldo</span>
           <div class="text-2xl font-bold text-yellow-600 flex items-center gap-2">
             {{ authStore.user?.coins_balance }} 🪙
           </div>
        </div>
      </div>

      <div class="flex gap-4 mb-6 border-b border-gray-300 pb-2 overflow-x-auto">
         <button 
           v-for="tab in ['avatars', 'cards', 'tables']" 
           :key="tab"
           @click="currentTab = tab"
           class="px-6 py-2 rounded-t-lg font-bold capitalize transition-colors"
           :class="currentTab === tab ? 'bg-[#1e8449] text-white' : 'bg-white text-gray-600 hover:bg-gray-200'"
         >
           {{ tab === 'avatars' ? 'Avatares' : tab === 'cards' ? 'Cartas' : 'Mesas' }}
         </button>
      </div>

      <div v-if="loading" class="text-center py-20">A carregar a loja...</div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
         <Card 
            v-for="item in items[currentTab]" 
            :key="item.id" 
            class="overflow-hidden hover:shadow-xl transition-all border-2"
            :class="item.equipped ? 'border-[#1e8449] ring-2 ring-[#1e8449]/50' : 'border-transparent'"
         >
            <div class="h-48 bg-gray-100 flex items-center justify-center p-4 relative">
                <img 
                   v-if="item.url" 
                   :src="item.url" 
                   class="max-h-full max-w-full object-contain shadow-md"
                   :class="currentTab === 'avatars' ? 'rounded-full h-32 w-32' : 'rounded-lg'"
                />
                <div 
                   v-else-if="item.color" 
                   class="w-32 h-32 rounded-full shadow-inner border-4 border-gray-300"
                   :style="{ backgroundColor: hexToRgb(item.color) }"
                ></div>

                <span v-if="item.equipped" class="absolute top-2 right-2 bg-[#1e8449] text-white text-xs px-2 py-1 rounded-full font-bold shadow">
                  EQUIPADO
                </span>
            </div>

            <CardContent class="p-4">
               <h3 class="font-bold text-lg mb-1">{{ item.name }}</h3>
               <div class="flex justify-between items-center mt-4">
                  <span v-if="!item.owned" class="text-yellow-600 font-bold text-lg">{{ item.price }} 🪙</span>
                  <span v-else class="text-gray-500 font-medium text-sm">Adquirido</span>

                  <Button 
                    v-if="!item.owned" 
                    @click="buyItem(item)"
                    :disabled="processing || authStore.user.coins_balance < item.price"
                    class="bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    Comprar
                  </Button>

                  <Button 
                    v-else-if="!item.equipped"
                    @click="equipItem(item)"
                    :disabled="processing"
                    variant="outline"
                    class="border-[#1e8449] text-[#1e8449] hover:bg-[#1e8449] hover:text-white"
                  >
                    Equipar
                  </Button>
                  
                  <div v-else class="text-[#1e8449] font-bold text-sm flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                    Em uso
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'vue-sonner';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const authStore = useAuthStore();
const serverBaseURL = inject('serverBaseURL');

const currentTab = ref('cards'); // Default tab
const loading = ref(true);
const processing = ref(false);
const items = ref({ avatars: [], cards: [], tables: [] });

// Função auxiliar para converter Hex do Laravel (ex: 0xFF1E8449) para CSS Hex (#1E8449)
const hexToRgb = (hexStr) => {
    if(!hexStr) return '#000';
    return hexStr.replace('0xFF', '#');
};

const fetchShop = async () => {
    try {
        const res = await axios.get(`${serverBaseURL}/api/shop`);
        items.value = res.data;
    } catch (e) {
        toast.error("Erro ao carregar a loja");
    } finally {
        loading.value = false;
    }
};

const buyItem = async (item) => {
    if(!confirm(`Queres comprar "${item.name}" por ${item.price} moedas?`)) return;
    
    processing.value = true;
    try {
        const res = await axios.post(`${serverBaseURL}/api/shop/buy`, {
            id: item.id,
            type: item.type
        });
        
        toast.success(res.data.message);
        // Atualiza saldo localmente
        authStore.user.coins_balance = res.data.new_balance;
        // Atualiza lista (para marcar como owned)
        item.owned = true;
    } catch (e) {
        toast.error(e.response?.data?.message || "Erro na compra");
    } finally {
        processing.value = false;
    }
};

const equipItem = async (item) => {
    processing.value = true;
    try {
        await axios.post(`${serverBaseURL}/api/shop/equip`, {
            id: item.id,
            type: item.type
        });
        
        toast.success("Item equipado!");
        
        // 1. Atualiza UI da Loja
        items.value[currentTab.value].forEach(i => i.equipped = false);
        item.equipped = true;
        
        // 2. Atualiza a Store (Auth) para o jogo saber o que mudou
        // Garante que o objeto custom existe
        if (!authStore.user.custom) authStore.user.custom = {};

        if (item.type === 'avatar') {
            authStore.user.photo_avatar_filename = item.id;
        } else if (item.type === 'card') {
            authStore.user.custom.equipped_card = item.id;
        } else if (item.type === 'table') {
            authStore.user.custom.equipped_table = item.id;
        }

        // Persiste no LocalStorage para não perder ao fazer refresh
        localStorage.setItem('user', JSON.stringify(authStore.user));

    } catch (e) {
        console.error(e);
        toast.error(e.response?.data?.message || "Erro ao equipar");
    } finally {
        processing.value = false;
    }
};
onMounted(fetchShop);
</script>