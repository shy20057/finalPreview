import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  loadAiConfigs,
  getDefaultAiConfig,
  saveAiConfig as apiSaveAiConfig,
  deleteAiConfig as apiDeleteAiConfig,
} from '../utils/api.js'

const THEME_KEY = 'quiz_theme'

export const useAppStore = defineStore('app', () => {
  // Two themes: 'dark-blue', 'light'
  const theme = ref('dark-blue')
  const themeOwnerId = ref(null)
  const themeStorageKey = () => themeOwnerId.value == null ? null : `${THEME_KEY}:${themeOwnerId.value}`
  // 当前生效的配置（默认厂商的）
  const aiConfig = ref({ baseUrl: '', apiKey: '', model: '', name: '' })
  // 所有厂商配置列表
  const allAiConfigs = ref([])
  // 配置是否已从服务端加载完成
  const aiConfigLoaded = ref(false)

  const VALID_THEMES = ['dark-blue', 'light']

  function cycleTheme() {
    if (theme.value === 'dark-blue') {
      theme.value = 'light'
    } else {
      theme.value = 'dark-blue'
    }
    if (themeStorageKey()) localStorage.setItem(themeStorageKey(), theme.value)
    document.documentElement.setAttribute('data-theme', theme.value)
  }

  function setTheme(t) {
    if (!VALID_THEMES.includes(t)) t = 'dark-blue'
    theme.value = t
    if (themeStorageKey()) localStorage.setItem(themeStorageKey(), t)
    document.documentElement.setAttribute('data-theme', t)
  }

  function initTheme(userId = null) {
    themeOwnerId.value = userId
    const stored = themeStorageKey() ? localStorage.getItem(themeStorageKey()) : null
    if (stored && VALID_THEMES.includes(stored)) {
      theme.value = stored
    } else {
      theme.value = 'dark-blue'
    }
    document.documentElement.setAttribute('data-theme', theme.value)
  }

  // 从服务端加载所有 AI 配置
  async function fetchAiConfigs() {
    try {
      const configs = await loadAiConfigs()
      allAiConfigs.value = configs
      const def = configs.find(c => c.isDefault) || configs[0] || null
      aiConfig.value = def ? {
        baseUrl: def.baseUrl,
        apiKey: def.apiKey,
        model: def.model,
        name: def.name,
      } : { baseUrl: '', apiKey: '', model: '', name: '' }
    } catch (error) {
      allAiConfigs.value = []
      aiConfig.value = { baseUrl: '', apiKey: '', model: '', name: '' }
      throw error
    } finally {
      aiConfigLoaded.value = true
    }
  }

  // 保存厂商配置到服务端
  async function updateAiConfig({ name, baseUrl, apiKey, model, isDefault = true }) {
    if (!name) throw new Error('厂商名称不能为空')

    const result = await apiSaveAiConfig({ name, baseUrl, apiKey, model, isDefault: isDefault ? 1 : 0 })
    // 更新本地列表
    const idx = allAiConfigs.value.findIndex(c => c.name === name)
    if (idx >= 0) {
      allAiConfigs.value[idx] = result
    } else {
      allAiConfigs.value.push(result)
    }
    // 如果设为默认，更新当前生效配置
    if (isDefault) {
      allAiConfigs.value.forEach(c => {
        if (c.name !== name) c.isDefault = 0
      })
      aiConfig.value = { baseUrl, apiKey, model, name }
    }
    return result
  }

  // 切换默认厂商
  async function setDefaultProvider(name) {
    const config = allAiConfigs.value.find(c => c.name === name)
    if (!config) return
    await updateAiConfig({ ...config, isDefault: true })
  }

  // 删除厂商配置
  async function removeAiConfig(name) {
    await apiDeleteAiConfig(name)
    allAiConfigs.value = allAiConfigs.value.filter(c => c.name !== name)
    // 如果删除的是当前默认的，切换到第一个
    if (aiConfig.value.name === name) {
      const next = allAiConfigs.value[0]
      if (next) {
        aiConfig.value = { baseUrl: next.baseUrl, apiKey: next.apiKey, model: next.model, name: next.name }
      } else {
        aiConfig.value = { baseUrl: '', apiKey: '', model: '', name: '' }
      }
    }
  }

  function isAiConfigured() {
    const c = aiConfig.value
    return !!(c.baseUrl && c.apiKey && c.model)
  }

  return {
    theme, aiConfig, allAiConfigs, aiConfigLoaded,
    cycleTheme, setTheme, initTheme,
    fetchAiConfigs, updateAiConfig, setDefaultProvider, removeAiConfig, isAiConfigured,
  }
})
