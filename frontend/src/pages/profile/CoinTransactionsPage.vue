<template>
  <div class="min-h-screen bg-slate-50 p-8 flex justify-center">
    <Card class="w-full max-w-4xl shadow-xl">
      <CardHeader>
        <div class="flex justify-between items-center">
          <div>
            <CardTitle class="text-2xl font-bold">Histórico de Transações</CardTitle>
            <CardDescription>Consulta os teus ganhos, perdas e compras.</CardDescription>
          </div>
          <div class="text-right">
             <span class="text-sm text-gray-500">Saldo Atual</span>
             <div class="text-3xl font-bold text-[#1e8449]">{{ authStore.user?.coins_balance }} 🪙</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="text-center py-10 text-gray-500">A carregar...</div>
        
        <div v-else-if="transactions.length === 0" class="text-center py-10 text-gray-500">
          Ainda não tens transações registadas.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-gray-200 text-gray-600 text-sm">
                <th class="py-3 px-4">Data</th>
                <th class="py-3 px-4">Tipo</th>
                <th class="py-3 px-4">Detalhe</th>
                <th class="py-3 px-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in transactions" :key="t.id" class="border-b border-gray-100 hover:bg-gray-50 transition">
                <td class="py-3 px-4 text-sm">{{ formatDate(t.date) }}</td>
                
                <td class="py-3 px-4">
                  <span 
                    class="px-2 py-1 rounded-full text-xs font-bold"
                    :class="getBadgeColor(t)"
                  >
                    {{ t.type }}
                  </span>
                </td>

                <td class="py-3 px-4 text-sm text-gray-600">
                    {{ t.description }}
                </td>

                <td class="py-3 px-4 text-right font-mono font-bold" :class="t.amount > 0 ? 'text-green-600' : 'text-red-600'">
                  {{ t.amount > 0 ? '+' : '' }}{{ t.amount }} {{ t.currency || '🪙' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';
import { useAuthStore } from '@/stores/auth';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const authStore = useAuthStore();
const serverBaseURL = inject('serverBaseURL');
const transactions = ref([]);
const loading = ref(true);

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('pt-PT');
};

const getBadgeColor = (t) => {
    if (t.category === 'purchase') return 'bg-blue-100 text-blue-800';
    if (t.amount > 0) return 'bg-green-100 text-green-800';
    return 'bg-red-100 text-red-800';
};

onMounted(async () => {
    try {
        const response = await axios.get(`${serverBaseURL}/api/me/coin-transactions`);
        transactions.value = response.data;
    } catch (e) {
        console.error("Erro ao carregar transações", e);
    } finally {
        loading.value = false;
    }
});
</script>