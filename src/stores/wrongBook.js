import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { useHistoryStore } from './history.js'
import { useBankStore } from './bank.js'
import { useAuthStore } from './auth.js'

const TYPE_ORDER = ['single', 'multi', 'fill', 'essay']
const ALL_TYPES = TYPE_ORDER.slice()

// ─── localStorage keys ──────────────────────────────────
const LS_MASTERED = 'wrongbook_mastered_overrides'
const LS_REMOVED = 'wrongbook_removed_keys'

function loadSet(key) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return new Set(arr)
    }
  } catch { /* ignore corrupt data */ }
  return new Set()
}

function saveSet(key, s) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(s)))
  } catch { /* quota exceeded — silently ignore */ }
}

const TIME_RANGES = [
  { value: 'all', label: '全部' },
  { value: 'today', label: '今天' },
  { value: 'yesterday', label: '昨天' },
  { value: 'dayBeforeYesterday', label: '前天' },
  { value: 'week', label: '一周内' },
  { value: 'custom', label: '自定义日期' },
]

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export const useWrongBookStore = defineStore('wrongBook', () => {
  const historyStore = useHistoryStore()
  const bankStore = useBankStore()
  const authStore = useAuthStore()
  const storageKey = key => `${key}:${authStore.user?.id}`

  // ===== state =====
  const selectedSubjects = ref(['全部'])
  const selectedTypes = ref([...ALL_TYPES])
  const selectedStatuses = ref(['unmastered'])
  const selectedTimeRange = ref('all')
  const customDate = ref('')
  const keyword = ref('')
  const sortBy = ref('lastWrongAt') // lastWrongAt | wrongCount | firstWrongAt
  const currentDrawerEntry = ref(null)
  // 已被用户手动标记/移除的 entry.key 集合（覆盖聚合默认状态）
  const masteredOverrides = ref(new Set())
  const removedKeys = ref(new Set())

  // ===== batch selection state =====
  const selectionMode = ref(false)
  const selectedKeys = ref(new Set())

  watch(() => authStore.user?.id, id => {
    masteredOverrides.value = id == null ? new Set() : loadSet(storageKey(LS_MASTERED))
    removedKeys.value = id == null ? new Set() : loadSet(storageKey(LS_REMOVED))
    selectedKeys.value = new Set()
    selectionMode.value = false
  }, { immediate: true })

  // ===== helpers =====
  function lookupSubject(bankId) {
    const bank = bankStore.allBanks.find(b => String(b.id) === String(bankId))
    return bank?.subject || '未分类'
  }

  function makeKey(bankId, questionId) {
    return `${bankId}_${questionId}`
  }

  function isWithinTimeRange(dateStr, range, custom) {
    if (range === 'all') return true
    const now = new Date()
    const d = new Date(dateStr)

    switch (range) {
      case 'today':
        return isSameDay(d, now)
      case 'yesterday':
        return isSameDay(d, addDays(now, -1))
      case 'dayBeforeYesterday':
        return isSameDay(d, addDays(now, -2))
      case 'week': {
        const weekAgo = addDays(now, -7)
        weekAgo.setHours(0, 0, 0, 0)
        return d >= weekAgo
      }
      case 'custom':
        if (!custom) return true
        return isSameDay(d, new Date(custom))
      default:
        return true
    }
  }

  function isMastered(key, latestAttemptMastered) {
    if (removedKeys.value.has(key)) return null // 已移除
    if (masteredOverrides.value.has(key)) return true
    return !!latestAttemptMastered
  }

  // ===== computed: entries =====
  const entries = computed(() => {
    const map = new Map()
    for (const record of historyStore.sortedRecords) {
      const wrongs = Array.isArray(record.wrongQuestions) ? record.wrongQuestions : []
      for (const w of wrongs) {
        const key = makeKey(record.bankId, w.id)
        let entry = map.get(key)
        if (!entry) {
          entry = {
            key,
            bankId: record.bankId,
            bankName: record.bankName,
            subject: lookupSubject(record.bankId),
            id: w.id,
            type: w.type,
            question: w.question,
            options: w.options || null,
            blanks: w.blanks || null,
            answer: w.answer,
            score: w.score,
            wrongCount: 0,
            firstWrongAt: record.date,
            lastWrongAt: record.date,
            attempts: [],
            _latestMastered: false,
          }
          map.set(key, entry)
        }
        entry.attempts.push({
          at: record.date,
          userAnswer: w.userAnswer,
          mode: record.mode,
        })
        entry.wrongCount += 1
        if (new Date(record.date) < new Date(entry.firstWrongAt)) entry.firstWrongAt = record.date
        if (new Date(record.date) > new Date(entry.lastWrongAt)) entry.lastWrongAt = record.date
      }
    }
    return Array.from(map.values()).filter(e => !removedKeys.value.has(e.key))
  })

  // ===== computed: filteredEntries =====
  const filteredEntries = computed(() => {
    const kw = keyword.value.trim().toLowerCase()
    const subjects = selectedSubjects.value
    const types = selectedTypes.value
    const statuses = selectedStatuses.value
    const timeRange = selectedTimeRange.value
    const custom = customDate.value
    const allSubjects = subjects.includes('全部')

    const filtered = entries.value.filter(e => {
      if (!allSubjects && !subjects.includes(e.subject)) return false
      if (!types.includes(e.type)) return false
      if (!isWithinTimeRange(e.lastWrongAt, timeRange, custom)) return false
      const mastered = isMastered(e.key, e._latestMastered)
      const isMasteredEntry = mastered === true
      if (statuses.includes('unmastered') && isMasteredEntry) return false
      if (statuses.includes('mastered') && !isMasteredEntry) return false
      if (kw && !e.question.toLowerCase().includes(kw)) return false
      return true
    })

    const sorted = [...filtered]
    if (sortBy.value === 'wrongCount') {
      sorted.sort((a, b) => b.wrongCount - a.wrongCount || new Date(b.lastWrongAt) - new Date(a.lastWrongAt))
    } else if (sortBy.value === 'firstWrongAt') {
      sorted.sort((a, b) => new Date(b.firstWrongAt) - new Date(a.firstWrongAt))
    } else {
      sorted.sort((a, b) => new Date(b.lastWrongAt) - new Date(a.lastWrongAt))
    }
    return sorted
  })

  // ===== computed: counts =====
  const counts = computed(() => {
    const c = {
      total: 0,
      unmastered: 0,
      mastered: 0,
      bySubject: {},
      byType: { single: 0, multi: 0, fill: 0, essay: 0 },
    }
    for (const e of entries.value) {
      c.total += 1
      const mastered = isMastered(e.key, e._latestMastered)
      const isMasteredEntry = mastered === true
      if (isMasteredEntry) c.mastered += 1
      else c.unmastered += 1
      c.bySubject[e.subject] = (c.bySubject[e.subject] || 0) + 1
      c.byType[e.type] = (c.byType[e.type] || 0) + 1
    }
    return c
  })

  const availableSubjects = computed(() => {
    return Object.keys(counts.value.bySubject).sort((a, b) => {
      if (a === '未分类') return 1
      if (b === '未分类') return -1
      return a.localeCompare(b, 'zh-CN')
    })
  })

  // ===== actions =====
  function markMastered(key, value) {
    if (value) masteredOverrides.value.add(key)
    else masteredOverrides.value.delete(key)
    masteredOverrides.value = new Set(masteredOverrides.value)
    if (authStore.user?.id != null) saveSet(storageKey(LS_MASTERED), masteredOverrides.value)
    closeDrawer()
  }

  function removeEntry(key) {
    removedKeys.value.add(key)
    removedKeys.value = new Set(removedKeys.value)
    if (authStore.user?.id != null) saveSet(storageKey(LS_REMOVED), removedKeys.value)
    closeDrawer()
  }

  function removeEntries(keys) {
    if (!keys || keys.length === 0) return 0
    const set = new Set(removedKeys.value)
    for (const k of keys) set.add(k)
    removedKeys.value = set
    if (authStore.user?.id != null) saveSet(storageKey(LS_REMOVED), removedKeys.value)
    // 清理已失效的选中项
    const nextSelected = new Set(selectedKeys.value)
    for (const k of keys) nextSelected.delete(k)
    selectedKeys.value = nextSelected
    if (nextSelected.size === 0) {
      selectionMode.value = false
    }
    return keys.length
  }

  // ===== batch selection actions =====
  function enterSelectionMode() {
    selectionMode.value = true
    selectedKeys.value = new Set()
  }

  function exitSelectionMode() {
    selectionMode.value = false
    selectedKeys.value = new Set()
  }

  function toggleSelect(key) {
    const set = new Set(selectedKeys.value)
    if (set.has(key)) set.delete(key)
    else set.add(key)
    selectedKeys.value = set
  }

  function selectAll(keys) {
    selectedKeys.value = new Set(keys)
  }

  function clearSelection() {
    selectedKeys.value = new Set()
  }

  function openDrawer(entry) {
    currentDrawerEntry.value = entry
  }

  function closeDrawer() {
    currentDrawerEntry.value = null
  }

  function toggleSubject(subject) {
    const set = new Set(selectedSubjects.value)
    if (subject === '全部') {
      const all = availableSubjects.value
      const allSelected = all.every(s => set.has(s))
      if (allSelected) {
        selectedSubjects.value = ['全部']
      } else {
        selectedSubjects.value = [...all]
      }
      return
    }
    if (set.has(subject)) set.delete(subject)
    else set.add(subject)
    const all = availableSubjects.value
    if (all.every(s => set.has(s)) && set.size === all.length) {
      set.add('全部')
    } else {
      set.delete('全部')
    }
    selectedSubjects.value = Array.from(set)
  }

  function isSubjectChecked(subject) {
    return selectedSubjects.value.includes(subject)
  }

  function isEntryMastered(key) {
    if (removedKeys.value.has(key)) return null
    if (masteredOverrides.value.has(key)) return true
    return false
  }

  function setTimeRange(range) {
    selectedTimeRange.value = range
    if (range !== 'custom') {
      customDate.value = ''
    }
  }

  function setCustomDate(date) {
    customDate.value = date
    if (date) {
      selectedTimeRange.value = 'custom'
    }
  }

  return {
    selectedSubjects,
    selectedTypes,
    selectedStatuses,
    selectedTimeRange,
    customDate,
    keyword,
    sortBy,
    currentDrawerEntry,
    masteredOverrides,
    removedKeys,
    selectionMode,
    selectedKeys,
    TIME_RANGES,
    entries,
    filteredEntries,
    counts,
    availableSubjects,
    markMastered,
    removeEntry,
    removeEntries,
    openDrawer,
    closeDrawer,
    toggleSubject,
    isSubjectChecked,
    isEntryMastered,
    setTimeRange,
    setCustomDate,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelect,
    selectAll,
    clearSelection,
  }
})
