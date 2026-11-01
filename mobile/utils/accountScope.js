import { getApiBase } from './api.js'
export function accountStorageKey(prefix, userId) {
  return `${prefix}:${encodeURIComponent(getApiBase())}:${userId ?? 'guest'}`
}
