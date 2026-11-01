import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getToken, setToken, getMe, login as apiLogin, register as apiRegister } from '../utils/api.js'
import { clearAccountState } from '../utils/clearAccountState.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const ready = ref(false)
  let initializing = null

  const isLoggedIn = computed(() => !!user.value)
  const username = computed(() => user.value?.username || '')

  function clearLegacySharedStorage() {
    // Old browser-wide values have no trustworthy owner and must not be reused.
    for (const key of [
      'quiz_ai_config', 'wrongbook_mastered_overrides', 'wrongbook_removed_keys',
      'resources-hidden-ids', 'cmd-palette-recent', 'fim-position', 'quiz_theme',
    ]) uni.removeStorageSync(key)
  }

  // uni-app 用全局事件代替 window 事件
  uni.$on('quiz-auth-expired', () => {
    clearAccountState()
    user.value = null
    setToken('')
    uni.reLaunch({ url: '/pages/auth/index' })
  })

  async function init() {
    if (ready.value) return
    if (initializing) return initializing
    initializing = initialize()
    try { await initializing } finally { initializing = null }
  }

  async function initialize() {
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
    ready.value = true
    return data
  }

  async function register(username, password) {
    clearLegacySharedStorage()
    const data = await apiRegister(username, password)
    clearAccountState()
    user.value = data.user
    ready.value = true
    return data
  }

  function logout() {
    clearAccountState()
    setToken('')
    user.value = null
    uni.reLaunch({ url: '/pages/auth/index' })
  }

  return { user, ready, isLoggedIn, username, init, login, register, logout }
})
