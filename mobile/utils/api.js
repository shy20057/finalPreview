/**
 * HTTP API client for backend (Node.js + SQLite) — uni-app port of src/utils/api.js
 *
 * Platform deltas from the original:
 *   fetch            -> uni.request (callback based, wrapped in a Promise)
 *   localStorage     -> uni.getStorageSync / uni.setStorageSync
 *   window.dispatch  -> uni.$emit
 *   location.hash    -> uni.reLaunch
 *   res.blob()/File  -> plain text + plus.io file writer
 */

const TOKEN_KEY = 'quiz-token'
const API_BASE_KEY = 'quiz-api-base'

/**
 * Backend origin.
 * The Android emulator reaches the host machine through 10.0.2.2.
 * Override at runtime (Settings / storage) for a physical device.
 */
export function getApiBase() {
  const custom = uni.getStorageSync(API_BASE_KEY)
  if (custom) return custom
  // #ifdef H5
  return 'http://localhost:3000'
  // #endif
  // #ifndef H5
  return 'http://10.0.2.2:3000'
  // #endif
}

export function setApiBase(url) {
  if (url) uni.setStorageSync(API_BASE_KEY, url)
  else uni.removeStorageSync(API_BASE_KEY)
}

export function getToken() {
  return uni.getStorageSync(TOKEN_KEY) || ''
}

export function setToken(token) {
  if (token) uni.setStorageSync(TOKEN_KEY, token)
  else uni.removeStorageSync(TOKEN_KEY)
}

function request(url, options = {}) {
  const { method = 'GET', body, headers = {}, ...rest } = options
  const token = getToken()
  const origin = getApiBase()

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${origin}${url}`,
      method,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      data: body !== undefined ? JSON.parse(body) : undefined,
      timeout: 30000,
      success: (res) => {
        if (origin !== getApiBase() || (token && token !== getToken())) {
          reject(new Error('账号或服务地址已切换，请重新操作'))
          return
        }
        if (res.statusCode === 401) {
          // token 失效，清除并跳转登录
          const signingIn = url === '/api/auth/login' || url === '/api/auth/register'
          if (!signingIn) { setToken(''); uni.$emit('quiz-auth-expired') }
          reject(new Error(signingIn ? (res.data?.error || '用户名或密码错误') : '登录已过期'))
          return
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const text = typeof res.data === 'string' ? res.data : ''
          let msg = text
          try { msg = (typeof res.data === 'object' && res.data.error) || text } catch {}
          reject(new Error(msg || `API Error ${res.statusCode}`))
          return
        }
        resolve(res.data)
      },
      fail: (err) => reject(new Error(`网络请求失败${err?.errMsg ? '：' + err.errMsg : ''}`)),
    })
  })
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

// Notes tree
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

/**
 * 导出单条笔记。App 端没有 Blob/下载目录，改为取回文本内容，
 * 由调用方写入本地文件（utils/fs.js）后交给系统分享/打开。
 */
export async function exportNote(id) {
  const res = await new Promise((resolve, reject) => {
    uni.request({
      url: `${getApiBase()}/api/notes/export/${id}`,
      method: 'GET',
      header: { Authorization: `Bearer ${getToken()}` },
      timeout: 30000,
      success: resolve,
      fail: (err) => reject(new Error(err?.errMsg || '导出失败')),
    })
  })
  if (res.statusCode < 200 || res.statusCode >= 300) throw new Error('导出失败')
  const filename = (res.header?.['Content-Disposition'] || '').match(/filename="(.+)"/)?.[1] || '笔记.md'
  return { content: typeof res.data === 'string' ? res.data : JSON.stringify(res.data), filename }
}

/**
 * 导入笔记文件。App 端没有 File 对象，改为传入已读取的文本内容。
 */
export async function importNote(filename, content) {
  const name = String(filename).replace(/\.md$/, '')
  const res = await new Promise((resolve, reject) => {
    uni.request({
      url: `${getApiBase()}/api/notes/import`,
      method: 'POST',
      header: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      data: { filename: name, content },
      timeout: 30000,
      success: resolve,
      fail: (err) => reject(new Error(err?.errMsg || '导入失败')),
    })
  })
  if (res.statusCode < 200 || res.statusCode >= 300) throw new Error('导入失败')
  return res.data
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
