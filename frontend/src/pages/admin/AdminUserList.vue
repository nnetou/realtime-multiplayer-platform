<template>
  <div class="p-4 md:p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex justify-end mb-6">
        <Button
          @click="openCreateAdminModal"
          class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-6 rounded-lg"
        >
          + Create Admin
        </Button>
      </div>

      <!-- Search Bar and Filters -->
      <div class="mb-6 space-y-4">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by name or email..."
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
        
        <!-- Filters -->
        <div class="flex flex-col md:flex-row gap-4">
          <!-- User Type Filter -->
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-2">User Type</label>
            <select
              v-model="filterUserType"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="">All Users</option>
              <option value="P">Players</option>
              <option value="A">Admins</option>
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
              <option value="active">Active</option>
              <option value="blocked">Inactive</option>
            </select>
          </div>

          <!-- Deleted Filter -->
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-2">Deleted</label>
            <select
              v-model="filterDeleted"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="">All</option>
              <option value="no">Not Deleted</option>
              <option value="yes">Deleted Only</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-600">Loading users...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 mb-4">
        {{ error }}
      </div>

      <!-- Users Table -->
      <div v-else class="bg-white shadow-lg rounded-lg overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Avatar</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nickname</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Type</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Deleted</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Created At</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="user in paginatedUsers" :key="user.id" class="hover:bg-gray-50">
              <!-- Avatar -->
              <td class="px-6 py-4">
                <img
                  :src="getAvatarUrl(user)"
                  :alt="user.nickname"
                  class="w-10 h-10 rounded-full object-cover bg-gray-200"
                  @error="(e) => { e.target.src = `https://ui-avatars.com/api/?name=${user.nickname}` }"
                />
              </td>

              <!-- Name -->
              <td class="px-6 py-4 text-sm text-gray-900 font-medium">{{ user.name }}</td>

              <!-- Email -->
              <td class="px-6 py-4 text-sm text-gray-600">{{ user.email }}</td>

              <!-- Nickname -->
              <td class="px-6 py-4 text-sm text-gray-600">@{{ user.nickname }}</td>

              <!-- Type Badge -->
              <td class="px-6 py-4">
                <span
                  :class="{
                    'bg-purple-100 text-purple-800': user.type === 'A',
                    'bg-blue-100 text-blue-800': user.type === 'P',
                  }"
                  class="px-3 py-1 rounded-full text-sm font-semibold"
                >
                  {{ user.type === 'A' ? 'Admin' : 'Player' }}
                </span>
              </td>

              <!-- Status Badge -->
              <td class="px-6 py-4">
                <span
                  :class="{
                    'bg-green-100 text-green-800': !user.blocked,
                    'bg-red-100 text-red-800': user.blocked,
                  }"
                  class="px-3 py-1 rounded-full text-sm font-semibold"
                >
                  {{ user.blocked ? 'Inactive' : 'Active' }}
                </span>
              </td>

              <!-- Deleted Badge -->
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="{
                    'bg-gray-600 text-white': user.deleted_at,
                    'bg-blue-100 text-blue-800': !user.deleted_at,
                  }"
                  class="px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap"
                >
                  {{ user.deleted_at ? 'Deleted' : 'Not Deleted' }}
                </span>
              </td>

              <!-- Created At -->
              <td class="px-6 py-4 text-sm text-gray-600">
                {{ formatDate(user.created_at) }}
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 space-x-2 flex flex-wrap gap-2">
                <!-- View Transactions Button (Only for Players) -->
                <button
                  v-if="user.type !== 'A'"
                  @click="viewUserTransactions(user.id, user.nickname)"
                  title="View user transactions"
                  class="px-3 py-2 rounded text-sm font-semibold bg-purple-100 hover:bg-purple-200 text-purple-800 transition"
                >
                  💰
                </button>

                <!-- View Games Button (Only for Players) -->
                <button
                  v-if="user.type !== 'A'"
                  @click="viewUserGames(user.id, user.nickname)"
                  title="View user games"
                  class="px-3 py-2 rounded text-sm font-semibold bg-indigo-100 hover:bg-indigo-200 text-indigo-800 transition"
                >
                  🎮
                </button>

                <!-- Block/Unblock Button -->
                <button
                  v-if="currentUser?.id !== user.id"
                  @click="toggleBlockUser(user)"
                  :disabled="actionsLoading[user.id]"
                  :title="user.blocked ? 'Unblock user' : 'Block user'"
                  class="px-3 py-2 rounded text-sm font-semibold transition"
                  :class="{
                    'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 disabled:opacity-60': !user.blocked,
                    'bg-green-100 hover:bg-green-200 text-green-800 disabled:opacity-60': user.blocked,
                  }"
                >
                  {{ user.blocked ? '🔓' : '🔒' }}
                </button>

                <!-- Delete Button -->
                <button
                  v-if="currentUser?.id !== user.id"
                  @click="confirmDeleteUser(user)"
                  :disabled="actionsLoading[user.id]"
                  title="Delete user"
                  class="px-3 py-2 rounded text-sm font-semibold bg-red-100 hover:bg-red-200 text-red-800 transition disabled:opacity-60"
                >
                  🗑️
                </button>

                <!-- Self User Indicator -->
                <span v-if="currentUser?.id === user.id" class="text-xs bg-gray-200 text-gray-700 px-3 py-2 rounded">
                  You
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- No Results -->
        <div v-if="paginatedUsers.length === 0" class="text-center py-12 text-gray-500">
          No users found matching your search.
        </div>

        <!-- Pagination Controls -->
        <div v-if="totalPages > 1" class="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div class="text-sm text-gray-600">
            Showing <span class="font-semibold">{{ pageStartIndex }}</span> to
            <span class="font-semibold">{{ pageEndIndex }}</span> of
            <span class="font-semibold">{{ paginationData?.total || 0 }}</span> users
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

    <!-- Create Admin Modal -->
    <div
      v-if="showCreateAdminModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
    >
      <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h2 class="text-xl font-bold text-gray-900 mb-4">Create New Admin</h2>

        <form class="space-y-4" @submit.prevent="submitCreateAdmin">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              v-model="createAdminForm.name"
              type="text"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              placeholder="Enter name"
            />
            <p v-if="createAdminErrors.name" class="text-sm text-red-600 mt-1">{{ createAdminErrors.name }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              v-model="createAdminForm.email"
              type="email"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              placeholder="Enter email"
            />
            <p v-if="createAdminErrors.email" class="text-sm text-red-600 mt-1">{{ createAdminErrors.email }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nickname</label>
            <input
              v-model="createAdminForm.nickname"
              type="text"
              required
              maxlength="20"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              placeholder="Enter nickname"
            />
            <p v-if="createAdminErrors.nickname" class="text-sm text-red-600 mt-1">{{ createAdminErrors.nickname }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              v-model="createAdminForm.password"
              type="password"
              required
              minlength="3"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              placeholder="Min 3 characters"
            />
            <p v-if="createAdminErrors.password" class="text-sm text-red-600 mt-1">{{ createAdminErrors.password }}</p>
          </div>

          <p v-if="createAdminErrors.general" class="text-sm text-red-600">{{ createAdminErrors.general }}</p>

          <div class="flex gap-3 pt-4">
            <button
              type="button"
              @click="showCreateAdminModal = false"
              :disabled="creatingAdmin"
              class="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="creatingAdmin"
              class="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition disabled:opacity-60"
            >
              {{ creatingAdmin ? 'Creating...' : 'Create Admin' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
    >
      <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h2 class="text-xl font-bold text-gray-900 mb-2">Delete User</h2>
        <p class="text-sm text-gray-700 mb-4">
          Are you sure you want to delete <strong>{{ userToDelete?.name }}</strong>? This action cannot be undone.
        </p>

        <div class="flex gap-3 pt-4">
          <button
            @click="showDeleteConfirm = false"
            :disabled="deletingUser"
            class="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            @click="deleteUser"
            :disabled="deletingUser"
            class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-60"
          >
            {{ deletingUser ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'vue-sonner'
import axios from 'axios'
import { Button } from '@/components/ui/button'

const apiBaseURL = inject('apiBaseURL')
const serverBaseURL = inject('serverBaseURL')
const authStore = useAuthStore()

const users = ref([])
const searchQuery = ref('')
const filterUserType = ref('')
const filterStatus = ref('')
const filterDeleted = ref('')
const loading = ref(false)
const error = ref('')
const currentUser = computed(() => authStore.user)
const currentPage = ref(1)
const paginationData = ref(null)

// Create Admin Modal
const showCreateAdminModal = ref(false)
const creatingAdmin = ref(false)
const createAdminForm = ref({
  name: '',
  email: '',
  nickname: '',
  password: '',
})
const createAdminErrors = ref({})

// Delete Confirmation
const showDeleteConfirm = ref(false)
const userToDelete = ref(null)
const deletingUser = ref(false)

// Actions Loading State
const actionsLoading = ref({})

// Computed: Paginated Users (from server-side filtered API response)
const paginatedUsers = computed(() => {
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

const getAvatarUrl = (user) => {
  const photoName = user.photo_avatar_filename
  if (!photoName) {
    return `https://ui-avatars.com/api/?name=${user.nickname}&background=random&color=fff`
  }
  if (photoName.startsWith('http')) return photoName
  return `${serverBaseURL}/storage/photos_avatars/${photoName}`
}

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

// Fetch Users with server-side filtering
const fetchUsers = async (page = 1) => {
  loading.value = true
  error.value = ''
  try {
    const params = {
      page,
      per_page: 15,
    }
    
    // Add filters to query parameters
    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim()
    }
    if (filterUserType.value) {
      params.type = filterUserType.value
    }
    if (filterStatus.value) {
      params.status = filterStatus.value
    }
    if (filterDeleted.value) {
      params.deleted = filterDeleted.value
    }
    
    const { data } = await axios.get(`${apiBaseURL}/admin/users`, { params })
    paginationData.value = data
    users.value = data.data
    currentPage.value = page
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load users'
    console.error('Error fetching users:', err)
  } finally {
    loading.value = false
  }
}

// Pagination Methods
const goToPage = (page) => {
  fetchUsers(page)
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

// Toggle Block User
const toggleBlockUser = async (user) => {
  if (currentUser.value?.id === user.id) {
    toast.error('Cannot block yourself')
    return
  }

  actionsLoading.value[user.id] = true
  try {
    const endpoint = user.blocked ? 'unblock' : 'block'
    await axios.patch(`${apiBaseURL}/admin/users/${user.id}/${endpoint}`)
    user.blocked = !user.blocked
    toast.success(`User ${user.blocked ? 'blocked' : 'unblocked'} successfully`)
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to update user status')
  } finally {
    actionsLoading.value[user.id] = false
  }
}

// Delete User Confirmation
const confirmDeleteUser = (user) => {
  if (currentUser.value?.id === user.id) {
    toast.error('Cannot delete yourself')
    return
  }
  userToDelete.value = user
  showDeleteConfirm.value = true
}

// Delete User (soft delete)
const deleteUser = async () => {
  if (!userToDelete.value) return

  deletingUser.value = true
  const userId = userToDelete.value.id
  actionsLoading.value[userId] = true
  
  try {
    await axios.delete(`${apiBaseURL}/admin/users/${userId}`)
    toast.success('User deleted successfully')
    showDeleteConfirm.value = false
    userToDelete.value = null
    // Refresh current page to reflect changes
    await fetchUsers(currentPage.value)
  } catch (err) {
    toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to delete user')
  } finally {
    deletingUser.value = false
    if (actionsLoading.value[userId]) {
      actionsLoading.value[userId] = false
    }
  }
}

// Create Admin Modal
const openCreateAdminModal = () => {
  createAdminForm.value = {
    name: '',
    email: '',
    nickname: '',
    password: '',
  }
  createAdminErrors.value = {}
  showCreateAdminModal.value = true
}

// Submit Create Admin
const submitCreateAdmin = async () => {
  createAdminErrors.value = {}

  if (createAdminForm.value.password.length < 3) {
    createAdminErrors.value.password = 'Password must be at least 3 characters'
    return
  }

  creatingAdmin.value = true
  try {
    const { data } = await axios.post(`${apiBaseURL}/admin/users`, {
      name: createAdminForm.value.name,
      email: createAdminForm.value.email,
      nickname: createAdminForm.value.nickname,
      password: createAdminForm.value.password,
      type: 'A',
    })
    toast.success('Admin created successfully')
    showCreateAdminModal.value = false
    // Refresh to show new admin
    await fetchUsers(currentPage.value)
  } catch (err) {
    const errors = err.response?.data?.errors || {}
    if (errors.name) createAdminErrors.value.name = errors.name[0]
    if (errors.email) createAdminErrors.value.email = errors.email[0]
    if (errors.nickname) createAdminErrors.value.nickname = errors.nickname[0]
    if (errors.password) createAdminErrors.value.password = errors.password[0]
    if (!Object.keys(errors).length) {
      createAdminErrors.value.general = err.response?.data?.message || 'Failed to create admin'
    }
  } finally {
    creatingAdmin.value = false
  }
}

// Navigate to Transactions with user filter
const viewUserTransactions = (userId, nickname) => {
  const encodedNick = encodeURIComponent(nickname || '')
  window.location.href = `/admin?tab=transactions&user_id=${userId}&user_nickname=${encodedNick}`
}

// Navigate to Games with user filter
const viewUserGames = (userId, nickname) => {
  const encodedNick = encodeURIComponent(nickname || '')
  window.location.href = `/admin?tab=games&user_id=${userId}&user_nickname=${encodedNick}`
}

// Debounce timer for search
let searchDebounceTimer = null

// Watch search query with debounce
watch(searchQuery, () => {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    currentPage.value = 1
    fetchUsers(1)
  }, 300)
})

// Watch user type filter
watch(filterUserType, () => {
  currentPage.value = 1
  fetchUsers(1)
})

// Watch status filter
watch(filterStatus, () => {
  currentPage.value = 1
  fetchUsers(1)
})

// Watch deleted filter
watch(filterDeleted, () => {
  currentPage.value = 1
  fetchUsers(1)
})

onMounted(() => {
  fetchUsers()
})
</script>
