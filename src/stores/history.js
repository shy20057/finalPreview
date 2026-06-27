import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  loadHistory as dbLoadHistory,
  addHistoryRecord as dbAddHistoryRecord,
  deleteHistoryRecord as dbDeleteHistoryRecord,
  clearHistory as dbClearHistory,
} from '../utils/storage.js'

export const useHistoryStore = defineStore('history', () => {
  const records = ref([])

  const recordCount = computed(() => records.value.length)

  const sortedRecords = computed(() => {
    return [...records.value].sort((a, b) => new Date(b.date) - new Date(a.date))
  })

  const statsByBank = computed(() => {
    const map = {}
    for (const r of records.value) {
      if (!map[r.bankId]) {
        map[r.bankId] = { bankId: r.bankId, bankName: r.bankName, count: 0, avgScore: 0, totalScore: 0 }
      }
      map[r.bankId].count++
      map[r.bankId].totalScore += r.score
      map[r.bankId].avgScore = Math.round(map[r.bankId].totalScore / map[r.bankId].count)
    }
    return Object.values(map).sort((a, b) => b.count - a.count)
  })

  async function loadRecords() {
    records.value = await dbLoadHistory()
  }

  async function addRecord(data) {
    const payload = {
      bankId: data.bankId,
      bankName: data.bankName,
      mode: data.mode,
      score: data.score,
      correctCount: data.correctCount,
      wrongCount: data.wrongCount,
      totalQuestions: data.totalQuestions,
      duration: data.duration,
      answers: data.answers,
      wrongQuestionIds: data.wrongQuestionIds,
      wrongQuestions: data.wrongQuestions || [],
      date: data.date || new Date().toISOString(),
    }
    const saved = await dbAddHistoryRecord(payload)
    await loadRecords()
    return saved
  }

  async function deleteRecord(recordId) {
    await dbDeleteHistoryRecord(recordId)
    await loadRecords()
  }

  async function clearHistory() {
    await dbClearHistory()
    records.value = []
  }

  function getRecord(recordId) {
    const targetId = String(recordId)
    return records.value.find(r => String(r.id) === targetId) || null
  }

  return {
    records,
    recordCount,
    sortedRecords,
    statsByBank,
    loadRecords,
    addRecord,
    deleteRecord,
    clearHistory,
    getRecord,
  }
})
