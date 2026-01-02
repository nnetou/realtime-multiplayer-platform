<template>
  <div class="min-h-screen bg-[#1e8449] p-5 flex flex-col items-center">
    <div class="w-full max-w-4xl mb-10">
      <h1 class="text-4xl font-bold text-white text-center mb-8">Edit Profile</h1>

      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Avatar Section -->
        <div class="lg:w-1/3">
          <Card class="shadow-lg border-2 border-gray-200 rounded-xl p-6 text-center">
            <CardHeader>
              <CardTitle class="text-2xl font-bold text-[#2c3e50]">Avatar</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <img
                :src="currentPhoto"
                alt="Current Avatar"
                class="w-32 h-32 rounded-full object-cover mx-auto border-4 border-[#1e8449]"
                @error="handleImageError"
              />
              <div>
                <label for="photo" class="block text-sm font-medium text-gray-700 mb-2">Change Avatar</label>
                <input
                  id="photo"
                  type="file"
                  accept="image/*"
                  @change="onFileChange"
                  class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1e8449] file:text-white hover:file:bg-[#145a32]"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Profile Form -->
        <div class="lg:w-2/3">
          <Card class="shadow-lg border-2 border-gray-200 rounded-xl p-6">
            <CardHeader>
              <CardTitle class="text-2xl font-bold text-[#2c3e50]">Edit Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <form @submit.prevent="updateProfile" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label for="name" class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      id="name"
                      v-model="form.name"
                      type="text"
                      required
                      class="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1e8449] focus:border-[#1e8449] transition-colors"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label for="nickname" class="block text-sm font-medium text-gray-700 mb-2">Nickname</label>
                    <input
                      id="nickname"
                      v-model="form.nickname"
                      type="text"
                      required
                      pattern="\S+"
                      title="Nickname must not contain spaces"
                      class="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1e8449] focus:border-[#1e8449] transition-colors"
                      placeholder="Enter your nickname"
                    />
                  </div>

                  <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      id="email"
                      v-model="form.email"
                      type="email"
                      required
                      class="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1e8449] focus:border-[#1e8449] transition-colors"
                      placeholder="Enter your email"
                    />
                  </div>

                  <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                    <input
                      id="password"
                      v-model="form.password"
                      type="password"
                      class="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1e8449] focus:border-[#1e8449] transition-colors"
                      placeholder="Leave empty to keep current"
                    />
                  </div>
                </div>

                <div>
                  <label for="description" class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    id="description"
                    v-model="form.description"
                    rows="5"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1e8449] focus:border-[#1e8449] transition-colors resize-vertical"
                    placeholder="Add a description to your profile"
                  ></textarea>
                </div>

                <div class="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    :disabled="loading"
                    size="lg"
                    class="flex-1 bg-[#1e8449] hover:bg-[#145a32] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    {{ loading ? 'Updating...' : 'Update Profile' }}
                  </Button>

                  <Button
                    type="button"
                    @click="router.push({ name: 'profile' })"
                    variant="outline"
                    size="lg"
                    class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Cancel
                  </Button>
                </div>

              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAPIStore } from '@/stores/api'
import { toast } from 'vue-sonner'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const apiBaseURL = inject('apiBaseURL')
const serverBaseURL = inject('serverBaseURL')
const router = useRouter()
const authStore = useAuthStore()
const apiStore = useAPIStore()

const form = ref({
  name: '',
  email: '',
  nickname: '',
  password: '',
  description: '',
})

const photoFile = ref(null)
const currentPhoto = ref('')
const loading = ref(false)

const getUserAvatar = () => {
  const user = authStore.user
  const photoName = user?.photo_avatar_filename

  if (!photoName) {
    return `https://ui-avatars.com/api/?name=${
      user?.nickname || "User"
    }&background=random&color=fff`
  }

  if (photoName.startsWith("http")) return photoName

  return `${serverBaseURL}/storage/photos_avatars/${photoName}`
}

const handleImageError = (e) => {
  e.target.src = `https://ui-avatars.com/api/?name=${
    authStore.user?.nickname || "User"
  }&background=random&color=fff`
}

onMounted(() => {
  if (!authStore.user) {
    router.push({ name: 'login' })
    return
  }

  form.value = {
    name: authStore.user.name || '',
    email: authStore.user.email || '',
    nickname: authStore.user.nickname || '',
    password: '',
    description: authStore.user.description || '',
  }

  currentPhoto.value = getUserAvatar()
})

const onFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    photoFile.value = file
    // Mostrar preview da nova imagem
    const reader = new FileReader()
    reader.onload = (e) => {
      currentPhoto.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const updateProfile = async () => {
  loading.value = true

  try {
    const formData = new FormData()
    formData.append('name', form.value.name)
    formData.append('email', form.value.email)
    formData.append('nickname', form.value.nickname)
    formData.append('description', form.value.description)
    if (form.value.password) {
      formData.append('password', form.value.password)
    }
    if (photoFile.value) {
      formData.append('photo', photoFile.value)
    }

    const response = await apiStore.putUser(formData)
    authStore.setUser(response.data.user)
    toast.success('Profile updated successfully!')
    router.push({ name: 'profile' })
  } catch (error) {
    toast.error(error.response?.data?.message || 'Failed to update profile')
  } finally {
    loading.value = false
  }
}
</script>