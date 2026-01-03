<template>
  <div class="min-h-screen bg-gray-100">
    <div class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 md:px-8">
        <!-- Header -->
        <div class="py-6">
          <h1 class="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p class="text-gray-600 mt-1">Manage users, transactions, and game history</p>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex gap-1 border-b border-gray-200">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="{
              'border-emerald-600 text-emerald-600': activeTab === tab.id,
              'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300': activeTab !== tab.id,
            }"
            class="px-6 py-3 border-b-2 font-semibold text-sm transition-colors duration-200"
          >
            <span class="flex items-center gap-2">
              <span>{{ tab.icon }}</span>
              <span>{{ tab.label }}</span>
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="max-w-7xl mx-auto">
      <component :is="currentTabComponent" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AdminUserList from './AdminUserList.vue'
import AdminTransactionHistory from './AdminTransactionHistory.vue'
import AdminGameHistory from './AdminGameHistory.vue'

const route = useRoute()

const tabs = [
  { id: 'users', label: 'Users', icon: '👥', component: AdminUserList },
  { id: 'transactions', label: 'Transactions', icon: '💰', component: AdminTransactionHistory },
  { id: 'games', label: 'Games', icon: '🎮', component: AdminGameHistory },
]

const activeTab = ref('users')

const currentTabComponent = computed(() => {
  const tab = tabs.find(t => t.id === activeTab.value)
  return tab ? tab.component : AdminUserList
})

// Check for tab query parameter on mount
onMounted(() => {
  if (route.query.tab) {
    const requestedTab = route.query.tab
    if (tabs.some(t => t.id === requestedTab)) {
      activeTab.value = requestedTab
    }
  }
})
</script>
