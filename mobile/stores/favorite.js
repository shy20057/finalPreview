import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { loadFavorites, addFavorite, removeFavorite } from '../utils/api.js'

function makeKey(bankId, questionId) {
  return `${bankId}_${questionId}`
}

export const useFavoriteStore = defineStore('favorite', () => {
  // ===== state =====
  const favorites = ref([])
  const loading = ref(false)
  const loaded = ref(false)

  // ===== computed =====
  const favoritedKeys = computed(() => {
    const set = new Set()
    for (const f of favorites.value) {
      set.add(makeKey(f.bankId, f.questionId))
    }
    return set
  })

  const favoriteCount = computed(() => favorites.value.length)

  // Group by subject (from questionData)
  const favoritesBySubject = computed(() => {
    const map = {}
    for (const f of favorites.value) {
      const subject = f.questionData?.subject || '未分类'
      if (!map[subject]) map[subject] = []
      map[subject].push(f)
    }
    return map
  })

  // ===== actions =====
  async function load() {
    if (loaded.value) return
    loading.value = true
    try {
      favorites.value = await loadFavorites()
      loaded.value = true
    } catch (e) {
      console.error('加载收藏失败:', e)
    } finally {
      loading.value = false
    }
  }

  function isFavorited(bankId, questionId) {
    return favoritedKeys.value.has(makeKey(bankId, questionId))
  }

  async function toggleFavorite(bankId, questionId, bankName, questionData) {
    const key = makeKey(bankId, questionId)
    if (favoritedKeys.value.has(key)) {
      // Remove favorite
      try {
        await removeFavorite(bankId, questionId)
        favorites.value = favorites.value.filter(
          f => !(String(f.bankId) === String(bankId) && String(f.questionId) === String(questionId))
        )
      } catch (e) {
        console.error('取消收藏失败:', e)
      }
    } else {
      // Add favorite
      try {
        const result = await addFavorite({ bankId, questionId, bankName, questionData })
        favorites.value.unshift({
          id: result.id,
          bankId,
          questionId,
          bankName,
          questionData,
          createdAt: result.createdAt,
        })
      } catch (e) {
        console.error('添加收藏失败:', e)
      }
    }
  }

  // Force reload (e.g. after import)
  async function reload() {
    loaded.value = false
    await load()
  }

  return {
    favorites,
    loading,
    loaded,
    favoritedKeys,
    favoriteCount,
    favoritesBySubject,
    load,
    isFavorited,
    toggleFavorite,
    reload,
  }
})
