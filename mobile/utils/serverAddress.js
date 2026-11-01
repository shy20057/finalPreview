import { getApiBase, setApiBase } from './api.js'
import { useAuthStore } from '../stores/auth.js'
import { promptText, showError } from './dialog.js'

export function normalizeServerAddress(value) {
  const url = String(value || '').trim().replace(/\/+$/, '').replace(/\/api$/i, '')
  if (!/^https?:\/\/[^\s/?#@]+(?:\/[^\s?#]*)?$/i.test(url)) {
    throw new Error('请输入完整的 HTTP 或 HTTPS 后端地址，例如 http://10.0.2.2:3000')
  }
  return url
}

// Long-press the login logo to configure the server before signing in.
export async function configureServer() {
  const value = await promptText('后端地址', getApiBase())
  if (value === null) return
  try {
    const next = normalizeServerAddress(value)
    if (next === getApiBase()) return
    useAuthStore().logout()
    setApiBase(next)
  } catch (error) { showError(error, '地址无效') }
}
