/**
 * uni API 的最小替身 —— 供 node:test 使用。
 *
 * 只实现被移植代码真正用到的部分：storage / 事件 / 导航 / 请求。
 * 装好后 globalThis.uni 可用，被测模块直接 import 即可。
 */

export function installMockUni() {
  const storage = new Map()
  const listeners = new Map()
  const navigations = []
  const requests = []

  function emit(event, payload) {
    for (const fn of listeners.get(event) || []) fn(payload)
  }

  globalThis.uni = {
    // ── storage ──
    getStorageSync: (key) => storage.get(key),
    setStorageSync: (key, value) => {
      storage.set(key, typeof value === 'string' ? value : JSON.parse(JSON.stringify(value)))
    },
    removeStorageSync: (key) => storage.delete(key),
    clearStorageSync: () => storage.clear(),

    // ── 事件 ──
    $on: (event, fn) => {
      if (!listeners.has(event)) listeners.set(event, [])
      listeners.get(event).push(fn)
    },
    $off: (event, fn) => {
      const list = listeners.get(event) || []
      const i = list.indexOf(fn)
      if (i >= 0) list.splice(i, 1)
    },
    $emit: emit,

    // ── 导航 ──
    navigateTo: (opts) => { navigations.push({ type: 'navigateTo', ...opts }); opts.success?.({}) },
    redirectTo: (opts) => { navigations.push({ type: 'redirectTo', ...opts }); opts.success?.({}) },
    reLaunch: (opts) => { navigations.push({ type: 'reLaunch', ...opts }); opts.success?.({}) },
    navigateBack: () => { navigations.push({ type: 'navigateBack' }) },

    // ── 请求 ──
    request: (opts) => {
      requests.push(opts)
      opts.success?.({ statusCode: 200, data: opts.method === 'GET' ? [] : { success: true } })
    },

    // ── 交互 ──
    showModal: (opts) => opts.success?.({ confirm: true, cancel: false }),
    showToast: () => {},
    setClipboardData: (opts) => opts.success?.({}),

    // ── 系统信息 ──
    getSystemInfoSync: () => ({ windowWidth: 360, windowHeight: 780, pixelRatio: 3 }),
  }

  return { storage, listeners, navigations, requests }
}
