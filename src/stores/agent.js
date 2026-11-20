import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { agentChat, agentResume, agentHistory, agentThreads } from '../utils/api.js'

const THREAD_KEY = 'quiz-agent-thread'

function newId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const useAgentStore = defineStore('agent', () => {
  const threadId = ref(localStorage.getItem(THREAD_KEY) || '')
  const messages = ref([])
  const pending = ref([])
  const threads = ref([])
  const loading = ref(false)
  const restoring = ref(false)
  const historyLoading = ref(false)
  const error = ref('')
  const historyError = ref('')
  let revision = 0
  let historyRevision = 0

  const hasPending = computed(() => pending.value.length > 0)
  const busy = computed(() => loading.value || restoring.value)

  function selectThread(id) {
    threadId.value = id
    if (id) localStorage.setItem(THREAD_KEY, id)
    else localStorage.removeItem(THREAD_KEY)
  }

  function applyResult(result) {
    if (result.threadId) selectThread(result.threadId)
    // The complete server history includes the optimistic user message.
    // Replacing the list prevents displaying the same message twice.
    messages.value = result.messages || []
    pending.value = result.pending || []
  }

  async function refreshThreads() {
    const version = ++historyRevision
    historyLoading.value = true
    historyError.value = ''
    try {
      const result = await agentThreads()
      if (version !== historyRevision) return null
      threads.value = result.threads || []
      return threads.value
    } catch (e) {
      if (version === historyRevision) historyError.value = e.message || '历史会话加载失败'
      return null
    } finally {
      if (version === historyRevision) historyLoading.value = false
    }
  }

  async function send(text) {
    const content = String(text || '').trim()
    if (!content || busy.value || hasPending.value) return
    const version = ++revision
    if (!threadId.value) selectThread(newId())
    const localId = `local-${newId()}`
    messages.value.push({ id: localId, role: 'user', content, status: 'sending' })
    loading.value = true
    error.value = ''
    try {
      const result = await agentChat(content, threadId.value)
      if (version !== revision) return
      applyResult(result)
      void refreshThreads()
    } catch (e) {
      if (version !== revision) return
      messages.value = messages.value.map(m => m.id === localId ? { ...m, status: 'failed' } : m)
      error.value = e.message || '请求失败'
      // A failed HTTP response may still have left a recoverable checkpoint.
      void refreshThreads()
    } finally {
      if (version === revision) loading.value = false
    }
  }

  /** decisions: [{type:'approve'|'reject'|'edit'|'respond', ...}] */
  async function decide(decisions) {
    if (busy.value || !decisions?.length) return
    const version = ++revision
    loading.value = true
    error.value = ''
    try {
      const result = await agentResume(threadId.value, decisions)
      if (version !== revision) return
      applyResult(result)
      void refreshThreads()
    } catch (e) {
      if (version === revision) error.value = e.message || '操作失败'
    } finally {
      if (version === revision) loading.value = false
    }
  }

  async function restore(id = threadId.value, { refresh = false } = {}) {
    if (busy.value) return false
    const version = ++revision
    restoring.value = true
    error.value = ''
    try {
      let target = id
      if (refresh) {
        const savedThreads = await refreshThreads()
        if (version !== revision) return false
        // Logging out clears the browser's last ID, but not saved conversations.
        if (savedThreads && !savedThreads.some(item => item.threadId === target)) {
          target = savedThreads[0]?.threadId || ''
        }
      }
      if (!target) return true
      const result = await agentHistory(target)
      if (version !== revision) return false
      applyResult(result)
      return true
    } catch (e) {
      if (version === revision) error.value = e.message || '会话内容加载失败'
      return false
    } finally {
      if (version === revision) restoring.value = false
    }
  }

  function clearCurrent() {
    revision++
    selectThread('')
    messages.value = []
    pending.value = []
    loading.value = false
    restoring.value = false
    error.value = ''
  }

  function startNewThread() {
    if (busy.value) return false
    clearCurrent()
    return true
  }

  function reset() {
    clearCurrent()
    historyRevision++
    threads.value = []
    historyLoading.value = false
    historyError.value = ''
  }

  return {
    threadId, messages, pending, threads, loading, restoring, historyLoading,
    error, historyError, hasPending, busy,
    send, decide, restore, refreshThreads, startNewThread, reset,
  }
})
