import { accountStorageKey } from './accountScope.js'
import { useAuthStore } from '../stores/auth.js'

function key(bankId) { return accountStorageKey(`quiz-pending:${bankId}`, useAuthStore().user?.id) }
export function readPendingSubmission(bankId) {
  const value = uni.getStorageSync(key(bankId))
  return value && value.submissionId && Array.isArray(value.questions) ? value : null
}
export function writePendingSubmission(payload) {
  try { uni.setStorageSync(key(payload.bankId), payload) }
  catch { uni.showToast({ title: '本机空间不足，请保持页面打开并重试保存', icon: 'none' }) }
}
export function clearPendingSubmission(bankId) { uni.removeStorageSync(key(bankId)) }
