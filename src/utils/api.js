/**
 * HTTP API client for backend (Node.js + SQLite)
 */

const API_BASE = ''

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API Error ${res.status}: ${text}`)
  }
  return res.json()
}

// Banks
export async function loadBanks() {
  return request('/api/banks')
}

export async function addBank(bank) {
  return request('/api/banks', {
    method: 'POST',
    body: JSON.stringify(bank),
  })
}

export async function deleteBank(bankId) {
  return request(`/api/banks/${bankId}`, { method: 'DELETE' })
}

export async function getBank(bankId) {
  const banks = await loadBanks()
  return banks.find(b => String(b.id) === String(bankId)) || null
}

export async function bankExists(name) {
  const banks = await loadBanks()
  return banks.some(b => b.name === name)
}

// History
export async function loadHistory() {
  return request('/api/history')
}

export async function addHistoryRecord(record) {
  return request('/api/history', {
    method: 'POST',
    body: JSON.stringify(record),
  })
}

export async function deleteHistoryRecord(recordId) {
  return request(`/api/history/${recordId}`, { method: 'DELETE' })
}

export async function clearHistory() {
  return request('/api/history', { method: 'DELETE' })
}

// Notes
export async function loadQuizNotes() {
  return request('/api/notes/quiz')
}

export async function getNote(bankId, questionId) {
  return request(`/api/notes/${bankId}/${questionId}`)
}

export async function saveNote(bankId, questionId, content) {
  return request('/api/notes', {
    method: 'POST',
    body: JSON.stringify({ bankId, questionId, content }),
  })
}

export async function deleteNote(bankId, questionId) {
  return request(`/api/notes/${bankId}/${questionId}`, { method: 'DELETE' })
}

export async function loadNotesByBank(bankId) {
  return request(`/api/notes?bankId=${bankId}`)
}

// Export / Import
export async function exportAll() {
  return request('/api/export')
}

export async function importAll(data) {
  return request('/api/import', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// AI Configs
export async function loadAiConfigs() {
  return request('/api/ai-configs')
}

export async function getDefaultAiConfig() {
  return request('/api/ai-configs/default/active')
}

export async function saveAiConfig(config) {
  return request('/api/ai-configs', {
    method: 'POST',
    body: JSON.stringify(config),
  })
}

export async function deleteAiConfig(name) {
  return request(`/api/ai-configs/${name}`, { method: 'DELETE' })
}

// Notes
export async function loadNotesTree() {
  return request('/api/notes/tree')
}

export async function createTreeNote(data) {
  return request('/api/notes', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateTreeNote(id, data) {
  return request(`/api/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteTreeNote(id) {
  return request(`/api/notes/${id}`, { method: 'DELETE' })
}

export async function reorderTreeNotes(orders) {
  return request('/api/notes/reorder', { method: 'POST', body: JSON.stringify({ orders }) })
}

export async function exportNote(id) {
  const res = await fetch(`/api/notes/export/${id}`)
  if (!res.ok) throw new Error('导出失败')
  const blob = await res.blob()
  const contentDisposition = res.headers.get('Content-Disposition')
  const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || '笔记.md'
  return { blob, filename }
}

export async function importNote(file) {
  // 读取文件内容，通过 JSON body 发送 filename + content
  const content = await file.text()
  const filename = file.name.replace(/\.md$/, '')
  const res = await fetch('/api/notes/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, content })
  })
  if (!res.ok) throw new Error('导入失败')
  return res.json()
}
