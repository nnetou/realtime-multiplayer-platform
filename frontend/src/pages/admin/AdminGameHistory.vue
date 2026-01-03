<template>
  <div class="p-4 md:p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Filters -->
      <div class="mb-6 space-y-4">
        <div
          v-if="userFilterActive || searchFilterActive"
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"
        >
          <div class="text-sm text-emerald-800 font-semibold">
            <span v-if="userFilterActive">
              Filtered by user: {{ route.query.user_nickname || `ID ${route.query.user_id}` }}
            </span>
            <span v-else-if="searchFilterActive">
              Search: "{{ searchQuery.trim() }}"
            </span>
          </div>
          <button
            @click="clearFilters"
            class="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
          >
            Clear
          </button>
        </div>

        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by player nickname or email..."
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />

        <div class="flex flex-col md:flex-row gap-4">
          <!-- Game Type Filter -->
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-2">Game Type</label>
            <select
              v-model="filterType"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="">All Types</option>
              <option value="3">Bisca de 3</option>
              <option value="9">Bisca de 9</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              v-model="filterStatus"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="">All Status</option>
              <option value="Ended">Ended</option>
              <option value="Interrupted">Interrupted</option>
              <option value="Playing">Playing</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-600">Loading games...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 mb-4">
        {{ error }}
      </div>

      <!-- Games Table -->
      <div v-else class="bg-white shadow-lg rounded-lg overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">ID</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Type</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Players</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Winner</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="game in paginatedGames" :key="game.id" class="hover:bg-gray-50">
              <!-- Game ID -->
              <td class="px-6 py-4 text-sm font-mono text-gray-900">
                #{{ game.id }}
              </td>

              <!-- Date -->
              <td class="px-6 py-4 text-sm text-gray-900">
                {{ formatDate(game.began_at) }}
              </td>

              <!-- Type Badge -->
              <td class="px-6 py-4">
                <span
                  :class="{
                    'bg-blue-100 text-blue-800': game.type === '3',
                    'bg-purple-100 text-purple-800': game.type === '9',
                  }"
                  class="px-3 py-1 rounded-full text-sm font-semibold"
                >
                  Bisca de {{ game.type }}
                </span>
              </td>

              <!-- Players -->
              <td class="px-6 py-4 text-sm text-gray-900">
                <div class="flex items-center gap-2">
                  <span class="font-medium">@{{ game.player1?.nickname || 'Unknown' }}</span>
                  <span class="text-gray-500">vs</span>
                  <span class="font-medium">@{{ game.player2?.nickname || 'Unknown' }}</span>
                </div>
              </td>

              <!-- Winner -->
              <td class="px-6 py-4">
                <div v-if="game.is_draw" class="flex items-center gap-1 text-sm text-gray-600">
                  <span>Draw</span>
                </div>
                <div v-else-if="game.winner" class="flex items-center gap-1">
                  <span class="text-xl">🏆</span>
                  <span class="font-bold text-emerald-600">@{{ game.winner.nickname }}</span>
                </div>
                <div v-else class="text-sm text-gray-500">
                  No winner
                </div>
              </td>

              <!-- Status Badge -->
              <td class="px-6 py-4">
                <span
                  :class="{
                    'bg-green-100 text-green-800': game.status === 'Ended',
                    'bg-red-100 text-red-800': game.status === 'Interrupted',
                    'bg-yellow-100 text-yellow-800': game.status === 'Playing',
                  }"
                  class="px-3 py-1 rounded-full text-sm font-semibold"
                >
                  {{ game.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- No Results -->
        <div v-if="paginatedGames.length === 0" class="text-center py-12 text-gray-500">
          No games found.
        </div>

        <!-- Pagination Controls -->
        <div v-if="totalPages > 1" class="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div class="text-sm text-gray-600">
            Showing <span class="font-semibold">{{ pageStartIndex }}</span> to
            <span class="font-semibold">{{ pageEndIndex }}</span> of
            <span class="font-semibold">{{ paginationData?.total || 0 }}</span> games
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="previousPage"
              :disabled="currentPage === 1"
              class="px-3 py-2 rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>

            <div class="flex gap-1">
              <button
                v-for="page in visiblePages"
                :key="page"
                @click="goToPage(page)"
                :class="{
                  'bg-emerald-600 text-white': page === currentPage,
                  'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100': page !== currentPage,
                }"
                class="px-3 py-2 rounded text-sm font-semibold transition"
              >
                {{ page }}
              </button>
            </div>

            <button
              @click="nextPage"
              :disabled="currentPage === totalPages"
              class="px-3 py-2 rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const apiBaseURL = inject('apiBaseURL')
const route = useRoute()
const router = useRouter()

const games = ref([])
const searchQuery = ref('')
const filterType = ref('')
const filterStatus = ref('')
const loading = ref(false)
const error = ref('')
const currentPage = ref(1)
const paginationData = ref(null)

const userFilterActive = computed(() => !!route.query.user_id)
const searchFilterActive = computed(() => !!searchQuery.value.trim())

// Computed: Paginated Games
const paginatedGames = computed(() => {
  if (paginationData.value?.data) {
    return paginationData.value.data
  }
  return []
})

// Computed: Total Pages
const totalPages = computed(() => paginationData.value?.last_page || 1)

// Computed: Visible page numbers (show max 5 pages)
const visiblePages = computed(() => {
  const maxPages = 5
  const pages = []
  const totalP = totalPages.value
  const current = currentPage.value

  let start = Math.max(1, current - Math.floor(maxPages / 2))
  let end = Math.min(totalP, start + maxPages - 1)

  if (end - start < maxPages - 1) {
    start = Math.max(1, end - maxPages + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  return pages
})

// Computed: Pagination display info
const pageStartIndex = computed(() => {
  if (!paginationData.value) return 0
  return (paginationData.value.current_page - 1) * paginationData.value.per_page + 1
})

const pageEndIndex = computed(() => {
  if (!paginationData.value) return 0
  return Math.min(
    paginationData.value.current_page * paginationData.value.per_page,
    paginationData.value.total
  )
})

// Format date to DD/MM/YYYY HH:mm
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

// Fetch Games with server-side filtering
const clearFilters = async () => {
  const newQuery = { ...route.query }
  delete newQuery.user_id
  delete newQuery.user_nickname
  searchQuery.value = ''
  currentPage.value = 1
  await router.replace({ query: newQuery })
  fetchGames(1)
}

const fetchGames = async (page = 1) => {
  loading.value = true
  error.value = ''
  try {
    const params = {
      page,
      per_page: 15,
    }
    
    // Add filters to query parameters
    if (filterType.value) {
      params.type = filterType.value
    }
    if (filterStatus.value) {
      params.status = filterStatus.value
    }
    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim()
    }
    // Check if coming from user profile with user_id
    if (route.query.user_id) {
      params.user_id = route.query.user_id
    }
    
    const { data } = await axios.get(`${apiBaseURL}/admin/games`, { params })
    paginationData.value = data
    games.value = data.data
    currentPage.value = page
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load games'
    console.error('Error fetching games:', err)
  } finally {
    loading.value = false
  }
}

// Pagination Methods
const goToPage = (page) => {
  fetchGames(page)
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    goToPage(currentPage.value + 1)
  }
}

const previousPage = () => {
  if (currentPage.value > 1) {
    goToPage(currentPage.value - 1)
  }
}

// Watch type filter
watch(filterType, () => {
  currentPage.value = 1
  fetchGames(1)
})

// Watch status filter
watch(filterStatus, () => {
  currentPage.value = 1
  fetchGames(1)
})

// Debounce timer for search
let searchDebounceTimer = null

// Watch search query with debounce
watch(searchQuery, () => {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    currentPage.value = 1
    fetchGames(1)
  }, 300)
})

onMounted(() => {
  if (route.query.user_nickname) {
    searchQuery.value = route.query.user_nickname
  }
  fetchGames()
})
</script>
