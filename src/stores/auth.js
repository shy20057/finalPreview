import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getToken, setToken, getMe, login as apiLogin, register as apiRegister } from '../utils/api.js'
import { clearAccountState } from '../utils/clearAccountState.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const ready = ref(false)

  const isLoggedIn = computed(() => !!user.value)
  const username = computed(() => user.value?.username || '')

  function clearLegacySharedStorage() {
    // Old browser-wide values have no trustworthy owner and must not be reused.
    for (const key of [
      'quiz_ai_config', 'wrongbook_mastered_overrides', 'wrongbook_removed_keys',
      'resources-hidden-ids', 'cmd-palette-recent', 'fim-position', 'quiz_theme',
    ]) localStorage.removeItem(key)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('quiz-auth-expired', () => {
      clearAccountState()
      user.value = null
    })
  }

  async function init() {
    clearLegacySharedStorage()
    const token = getToken()
    if (!token) {
      ready.value = true
      return
    }
    try {
      user.value = await getMe()
    } catch {
      user.value = null
    }
    ready.value = true
  }

  async function login(username, password) {
    clearLegacySharedStorage()
    const data = await apiLogin(username, password)
    clearAccountState()
    user.value = data.user
    return data
  }

  async function register(username, password) {
    clearLegacySharedStorage()
    const data = await apiRegister(username, password)
    clearAccountState()
    user.value = data.user
    return data
  }

  function logout() {
    clearAccountState()
    setToken('')
    user.value = null
    location.hash = '#/login'
  }

  return { user, ready, isLoggedIn, username, init, login, register, logout }
})
