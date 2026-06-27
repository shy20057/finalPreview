import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useHistoryStore } from './history.js'
import { useBankStore } from './bank.js'

const TYPE_ORDER = ['single', 'multi', 'fill', 'essay']
const ALL_TYPES = TYPE_ORDER.slice()

export const useWrongBookStore = defineStore('wrongBook', () => {
  const historyStore = useHistoryStore()
  const bankStore = useBankStore()

  // ===== state =====
  const selectedSubjects = ref(['全部'])
  const selectedTypes = ref([...ALL_TYPES])
  const selectedStatuses = ref(['unmastered'])
  const keyword = ref('')
  const sortBy = ref('lastWrongAt') // lastWrongAt | wrongCount | firstWrongAt
  const currentDrawerEntry = ref(null)
  // 已被用户手动标记/移除的 entry.key 集合（覆盖聚合默认状态）
  const masteredOverrides = ref(new Set())
  const removedKeys = ref(new Set())

  // ===== helpers =====
  function lookupSubject(bankId) {
    const bank = bankStore.allBanks.find(b => String(b.id) === String(bankId))
    return bank?.subject || '未分类'
  }

  function makeKey(bankId, questionId) {
    return `${bankId}_${questionId}`
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
    const allSubjects = subjects.includes('全部')

    const filtered = entries.value.filter(e => {
      if (!allSubjects && !subjects.includes(e.subject)) return false
      if (!types.includes(e.type)) return false
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
    closeDrawer()
  }

  function removeEntry(key) {
    removedKeys.value.add(key)
    removedKeys.value = new Set(removedKeys.value)
    closeDrawer()
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

  return {
    selectedSubjects,
    selectedTypes,
    selectedStatuses,
    keyword,
    sortBy,
    currentDrawerEntry,
    masteredOverrides,
    removedKeys,
    entries,
    filteredEntries,
    counts,
    availableSubjects,
    markMastered,
    removeEntry,
    openDrawer,
    closeDrawer,
    toggleSubject,
    isSubjectChecked,
    isEntryMastered,
  }
})
