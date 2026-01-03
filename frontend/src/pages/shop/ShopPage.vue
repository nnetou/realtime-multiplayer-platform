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
           v-for="tab in ['avatars', 'cards', 'tables', 'coins']" 
           :key="tab"
           @click="currentTab = tab"
           class="px-6 py-2 rounded-t-lg font-bold capitalize transition-colors"
           :class="currentTab === tab ? 'bg-[#1e8449] text-white' : 'bg-white text-gray-600 hover:bg-gray-200'"
         >
           {{ tab === 'avatars' ? 'Avatares' : tab === 'cards' ? 'Cartas' : tab === 'tables' ? 'Mesas' : 'Coins' }}
         </button>
      </div>

      <div v-if="loading" class="text-center py-20">A carregar a loja...</div>

      <!-- Formulário para compra de coins -->
      <div v-else-if="currentTab === 'coins'" class="bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-2xl font-bold mb-4">Comprar Coins</h2>
        <form @submit.prevent="purchaseCoins" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Valor em Euros (1-99)</label>
            <input 
              type="number" 
              v-model="euros" 
              min="1" 
              max="99" 
              required 
              class="w-full p-2 border border-gray-300 rounded-md focus:ring-[#1e8449] focus:border-[#1e8449]"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Método de Pagamento</label>
            <select 
              v-model="paymentMethod" 
              required 
              class="w-full p-2 border border-gray-300 rounded-md focus:ring-[#1e8449] focus:border-[#1e8449]"
            >
              <option value="MBWAY">MBWAY</option>
              <option value="PAYPAL">PAYPAL</option>
              <option value="IBAN">IBAN</option>
              <option value="MB">MB</option>
              <option value="VISA">VISA</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Referência de Pagamento</label>
            <input 
              type="text" 
              v-model="paymentReference" 
              required 
              :placeholder="getPlaceholder()"
              class="w-full p-2 border border-gray-300 rounded-md focus:ring-[#1e8449] focus:border-[#1e8449]"
            >
          </div>
          <p class="text-sm text-gray-600">Coins a receber: {{ euros * 10 }}</p>
          <button 
            type="submit" 
            :disabled="processing" 
            class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            {{ processing ? 'Processando...' : 'Comprar' }}
          </button>
        </form>
      </div>

      <!-- Grid para outros itens -->
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
                  <span v-if="!item.owned" class="text-yellow-600 font-bold text-lg">
                    {{ item.price }} 🪙
                  </span>
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
                  
                  <div v-else-if="item.equipped" class="text-[#1e8449] font-bold text-sm flex items-center gap-1">
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

const currentTab = ref('cards');
const loading = ref(true);
const processing = ref(false);
const items = ref({ avatars: [], cards: [], tables: [], coins: [] });
const euros = ref(1);
const paymentMethod = ref('MBWAY');
const paymentReference = ref('');

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

const getPlaceholder = () => {
    switch (paymentMethod.value) {
        case 'MBWAY': return '9 dígitos (ex: 912345678)';
        case 'PAYPAL': return 'Email associado';
        case 'IBAN': return 'Código IBAN';
        case 'MB': return 'Referência MB (5-10 dígitos)';
        case 'VISA': return 'Número do cartão (16 dígitos)';
        default: return '';
    }
};

const purchaseCoins = async () => {
    if (!euros.value || euros.value < 1 || euros.value > 99) {
        toast.error('Valor em euros deve ser entre 1 e 99');
        return;
    }

    // Validações básicas no frontend (opcional, pois backend valida)
    switch (paymentMethod.value) {
        case 'MBWAY':
            if (!/^\d{9}$/.test(paymentReference.value)) {
                toast.error('Referência MBWAY deve ter 9 dígitos');
                return;
            }
            break;
        case 'PAYPAL':
            if (!/\S+@\S+\.\S+/.test(paymentReference.value)) {
                toast.error('Referência PAYPAL deve ser um email válido');
                return;
            }
            break;
        case 'IBAN':
            if (!/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(paymentReference.value)) {
                toast.error('Referência IBAN inválida');
                return;
            }
            break;
        case 'MB':
            if (!/^\d{5,10}$/.test(paymentReference.value)) {
                toast.error('Referência MB deve ter 5 a 10 dígitos');
                return;
            }
            break;
        case 'VISA':
            if (!/^\d{16}$/.test(paymentReference.value)) {
                toast.error('Referência VISA deve ter 16 dígitos');
                return;
            }
            break;
    }

    processing.value = true;
    try {
        const res = await axios.post(`${serverBaseURL}/api/shop/purchase`, {
            euros: euros.value,
            payment_method: paymentMethod.value,
            payment_reference: paymentReference.value
        });
        toast.success(res.data.message);
        authStore.user.coins_balance = res.data.new_balance;
        // Reset form
        euros.value = 1;
        paymentReference.value = '';
    } catch (e) {
        toast.error(e.response?.data?.message || "Erro na compra de coins");
    } finally {
        processing.value = false;
    }
};

const buyItem = async (item) => {
    const confirmMessage = `Queres comprar "${item.name}" por ${item.price} moedas?`;
    
    if(!confirm(confirmMessage)) return;
    
    processing.value = true;
    try {
        const res = await axios.post(`${serverBaseURL}/api/shop/buy`, {
            id: item.id,
            type: item.type
        });
        
        toast.success(res.data.message);
        authStore.user.coins_balance -= item.price;
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
        
        items.value[currentTab.value].forEach(i => i.equipped = false);
        item.equipped = true;
        
        if (!authStore.user.custom) authStore.user.custom = {};
        if (item.type === 'avatar') {
            authStore.user.photo_avatar_filename = item.id;
        } else if (item.type === 'card') {
            authStore.user.custom.equipped_card = item.id;
        } else if (item.type === 'table') {
            authStore.user.custom.equipped_table = item.id;
        }
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