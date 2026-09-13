/**
 * HTTP API client for backend (Node.js + SQLite)
 */

const API_BASE = ''
const TOKEN_KEY = 'quiz-token'
import { isDemoMode } from './demoMode.js'
import { demoApiRequest, demoExportNote, demoImportNote } from './demoApi.js'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request(url, options = {}) {
  const token = getToken()
  if (isDemoMode) return demoApiRequest(url, options, token)
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${url}`, {
    headers,
    ...options,
  })
  if (res.status === 401) {
    // token 失效，清除并跳转登录
    setToken('')
    window.dispatchEvent(new Event('quiz-auth-expired'))
    if (location.hash !== '#/login') {
      location.hash = '#/login'
    }
    throw new Error('登录已过期')
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let msg = text
    try { msg = JSON.parse(text).error || text } catch {}
    throw new Error(msg || `API Error ${res.status}`)
  }
  return res.json()
}

// ===== Auth =====
export async function register(username, password) {
  const data = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  setToken(data.token)
  return data
}

export async function login(username, password) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  setToken(data.token)
  return data
}

export async function getMe() {
  return request('/api/auth/me')
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

export async function updateBank(bankId, data) {
  return request(`/api/banks/${bankId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
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

export async function upsertHistorySession(data) {
  return request('/api/history/session', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
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

export async function deleteQuizNotes(ids) {
  return request('/api/notes/batch-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
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
  if (isDemoMode) return demoExportNote(id)
  const res = await fetch(`/api/notes/export/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error('导出失败')
  const blob = await res.blob()
  const contentDisposition = res.headers.get('Content-Disposition')
  const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || '笔记.md'
  return { blob, filename }
}

export async function importNote(file) {
  if (isDemoMode) return demoImportNote(file)
  // 读取文件内容，通过 JSON body 发送 filename + content
  const content = await file.text()
  const filename = file.name.replace(/\.md$/, '')
  const res = await fetch('/api/notes/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ filename, content })
  })
  if (!res.ok) throw new Error('导入失败')
  return res.json()
}

// Favorites
export async function loadFavorites() {
  return request('/api/favorites')
}

export async function addFavorite(data) {
  return request('/api/favorites', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function removeFavorite(bankId, questionId) {
  return request(`/api/favorites/${bankId}/${questionId}`, { method: 'DELETE' })
}

export async function checkFavorite(bankId, questionId) {
  return request(`/api/favorites/${bankId}/${questionId}`)
}

// Quiz Sessions
export async function getAllSessions() {
  return request('/api/sessions')
}

export async function getSessionsWithBankInfo() {
  return request('/api/sessions/with-bank-info')
}

export async function getSession(bankId) {
  return request(`/api/sessions/${bankId}`)
}

export async function saveSession(data) {
  return request('/api/sessions', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteSession(bankId) {
  return request(`/api/sessions/${bankId}`, { method: 'DELETE' })
}

// Resources (HTML files managed by backend)
export async function listResources() {
  return request('/api/resources')
}

export async function uploadResource(filename, content) {
  return request('/api/resources', {
    method: 'POST',
    body: JSON.stringify({ filename, content }),
  })
}

export async function deleteResource(filename) {
  return request(`/api/resources/${encodeURIComponent(filename)}`, { method: 'DELETE' })
}
