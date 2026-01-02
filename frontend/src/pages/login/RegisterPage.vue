<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="w-full max-w-lg bg-white shadow-xl rounded-2xl p-8 space-y-6">
      <header class="space-y-1 text-center">
        <h1 class="text-2xl font-bold text-gray-900">Create your account</h1>
        <p class="text-sm text-gray-600">Join and claim your welcome bonus after signing up.</p>
      </header>

      <form class="space-y-5" @submit.prevent="onSubmit">
        <div class="space-y-1">
          <label class="text-sm font-medium text-gray-700" for="name">Name</label>
          <input
            id="name"
            v-model.trim="form.name"
            type="text"
            required
            class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="Your full name"
          />
          <p v-if="errors.name" class="text-sm text-red-600">{{ errors.name }}</p>
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium text-gray-700" for="email">Email</label>
          <input
            id="email"
            v-model.trim="form.email"
            type="email"
            required
            class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="you@example.com"
          />
          <p v-if="errors.email" class="text-sm text-red-600">{{ errors.email }}</p>
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium text-gray-700" for="nickname">Nickname</label>
          <input
            id="nickname"
            v-model.trim="form.nickname"
            type="text"
            required
            maxlength="20"
            class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="Unique nickname"
          />
          <p v-if="errors.nickname" class="text-sm text-red-600">{{ errors.nickname }}</p>
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium text-gray-700" for="password">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            minlength="3"
            class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="Minimum 3 characters"
          />
          <p v-if="errors.password" class="text-sm text-red-600">{{ errors.password }}</p>
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium text-gray-700" for="photo">Photo (optional)</label>
          <input
            id="photo"
            type="file"
            accept="image/*"
            @change="onFileChange"
            class="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700"
          />
          <p v-if="photoName" class="text-xs text-gray-600">Selected: {{ photoName }}</p>
          <p v-if="errors.photo" class="text-sm text-red-600">{{ errors.photo }}</p>
        </div>

        <div v-if="generalError" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ generalError }}
        </div>
        <div v-if="successMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {{ successMessage }}
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-lg bg-emerald-600 px-4 py-3 text-white font-semibold shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <span v-if="loading">Creating account...</span>
          <span v-else>Create account</span>
        </button>
      </form>

      <p class="text-center text-sm text-gray-600">Already have an account?
        <button class="text-emerald-700 font-semibold hover:underline" @click="goToLogin">Go to Login</button>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

// Using Composition API (script setup) for simplicity
const apiBaseURL = inject('apiBaseURL')
const router = useRouter()

const form = ref({
  name: '',
  email: '',
  nickname: '',
  password: '',
})

const photoFile = ref(null)
const photoName = ref('')
const loading = ref(false)
const errors = ref({})
const generalError = ref('')
const successMessage = ref('')

const onFileChange = (event) => {
  const file = event.target.files?.[0]
  photoFile.value = file || null
  photoName.value = file ? file.name : ''
}

const parseApiErrors = (data) => {
  const fieldErrors = {}
  if (data?.errors) {
    Object.entries(data.errors).forEach(([key, messages]) => {
      fieldErrors[key] = Array.isArray(messages) ? messages[0] : String(messages)
    })
  }
  return { fieldErrors, message: data?.message || '' }
}

const onSubmit = async () => {
  errors.value = {}
  generalError.value = ''
  successMessage.value = ''

  if (!form.value.password || form.value.password.length < 3) {
    errors.value.password = 'Password must have at least 3 characters.'
    return
  }

  const fd = new FormData()
  fd.append('name', form.value.name)
  fd.append('email', form.value.email)
  fd.append('nickname', form.value.nickname)
  fd.append('password', form.value.password)
  if (photoFile.value) {
    fd.append('photo', photoFile.value)
  }

  loading.value = true
  try {
    const { data } = await axios.post(`${apiBaseURL}/auth/register`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    successMessage.value = data?.message || 'Account created! Welcome bonus awarded.'
    setTimeout(() => router.push({ name: 'login' }), 800)
  } catch (err) {
    const { response } = err || {}
    const parsed = parseApiErrors(response?.data)
    errors.value = parsed.fieldErrors
    generalError.value = parsed.message || 'Registration failed. Please check the fields.'
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  router.push({ name: 'login' })
}
</script>
