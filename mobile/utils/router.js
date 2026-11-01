/**
 * Router shim — uni-app port of vue-router usage in the original web app.
 *
 * The original project used vue-router (hash history) with routes such as
 * "/quiz/:bankId". uni-app owns the navigation itself, so this module keeps
 * the *shape* of the original API (`useRoute()`, `useRouter()`, `router.push`)
 * while translating to `uni.navigateTo` / `uni.redirectTo` and the page
 * options that uni-app puts on the page stack.
 *
 * Keeping this API means the ported components can be read line-by-line
 * against their originals.
 */

import { ref, shallowRef, reactive, computed, getCurrentInstance } from 'vue'
import { useAuthStore } from '../stores/auth.js'
let pageHooks = null
export function installRouteHooks(hooks) { pageHooks = hooks }

/** uni-app page path  ⇄  original vue-router path */
export const ROUTES = [
  { page: 'pages/auth/index', path: '/login', name: 'login', meta: { public: true } },
  { page: 'pages/index/index', path: '/', name: 'home' },
  { page: 'pages/banks/index', path: '/banks', name: 'banks' },
  { page: 'pages/quiz/index', path: '/quiz/:bankId', name: 'quiz' },
  { page: 'pages/result/index', path: '/result/:recordId', name: 'result' },
  { page: 'pages/history/index', path: '/history', name: 'history' },
  { page: 'pages/wrongbook/index', path: '/wrongbook', name: 'wrongbook' },
  { page: 'pages/favorites/index', path: '/favorites', name: 'favorites' },
  { page: 'pages/resources/index', path: '/resources', name: 'resources' },
  { page: 'pages/settings/index', path: '/settings', name: 'settings' },
  { page: 'pages/profile/index', path: '/profile', name: 'profile' },
  { page: 'pages/notes/index', path: '/notes', name: 'notes' },
  { page: 'pages/quiz-notes/index', path: '/quiz-notes', name: 'quiz-notes' },
]

const state = ref({ path: '/', fullPath: '/', params: {}, query: {}, meta: {}, name: '' })

/** Param names declared in a route path, e.g. "/quiz/:bankId" → ['bankId'] */
function paramNames(route) {
  return (route.path.match(/:([A-Za-z0-9_]+)/g) || []).map((s) => s.slice(1))
}

/** Options that belong to the path (params) rather than the query string. */
function splitOptions(route, options) {
  const params = {}
  const query = {}
  const names = paramNames(route)
  for (const [k, v] of Object.entries(options || {})) {
    if (names.includes(k)) params[k] = v
    else query[k] = v
  }
  return { params, query }
}

/** Current uni-app page → route descriptor. */
export function currentRoute() {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  if (!page) return null
  const pagePath = page.route || (page.$page && page.$page.$pagePath) || ''
  const route = ROUTES.find((r) => r.page === pagePath)
  if (!route) return null
  const options = (page.options || (page.$page && page.$page.options) || {})
  return { route, options }
}

/** Refresh the reactive route state from the uni-app page stack. */
export function syncRoute(optionsOverride) {
  const cur = currentRoute()
  if (!cur) return
  const { route } = cur
  const options = optionsOverride || cur.options
  const { params, query } = splitOptions(route, options)

  let path = route.path
  for (const name of paramNames(route)) {
    path = path.replace(`:${name}`, params[name] != null ? String(params[name]) : '')
  }
  // /login and /register share one page — the mode query selects the view
  if (route.page === 'pages/auth/index') {
    path = query.mode === 'register' ? '/register' : '/login'
  }

  const qs = Object.entries(query)
    .filter(([k]) => !(route.page === 'pages/auth/index' && k === 'mode'))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')

  state.value = {
    path,
    fullPath: qs ? `${path}?${qs}` : path,
    params,
    query,
    meta: route.meta || {},
    name: path === '/register' ? 'register' : route.name,
  }
}

/**
 * vue-router-like `useRoute()`.
 *
 * `reactive()` unwraps the refs on property access, so both the template and
 * the script can use `route.path` / `route.params.bankId` / `route.query.mode`
 * exactly like the original web app did.
 */
export function useRoute() {
  // Native pages stay mounted in the back stack. Each page keeps its own route
  // so a hidden quiz cannot react to another page's bankId and reset answers.
  const local = getCurrentInstance() && pageHooks ? shallowRef(state.value) : state
  if (getCurrentInstance() && pageHooks) {
    pageHooks.onLoad(options => { syncRoute(options); local.value = state.value })
    pageHooks.onShow(() => { syncRoute(); local.value = state.value })
  }
  return reactive({
    path: computed(() => local.value.path),
    fullPath: computed(() => local.value.fullPath),
    params: computed(() => local.value.params),
    query: computed(() => local.value.query),
    meta: computed(() => local.value.meta),
    name: computed(() => local.value.name),
  })
}

/** vue-router-like `useRouter()`. */
export function useRouter() {
  return {
    push: (target) => navigate(target, 'navigateTo'),
    replace: (target) => navigate(target, 'redirectTo'),
    back: () => uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/index/index' }) }),
    go: (delta) => delta < 0 ? uni.navigateBack({ delta: -delta }) : undefined,
  }
}

/** Turn an original vue-router target into a uni-app url. */
export function toUrl(target) {
  let path = ''
  let extra = {}

  if (typeof target === 'string') {
    const separator = target.indexOf('?')
    const p = separator < 0 ? target : target.slice(0, separator)
    const qs = separator < 0 ? '' : target.slice(separator + 1)
    path = p
    if (qs) {
      for (const kv of qs.split('&')) {
        const i = kv.indexOf('=')
        const k = i < 0 ? kv : kv.slice(0, i)
        const v = i < 0 ? '' : kv.slice(i + 1)
        extra[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '))
      }
    }
  } else if (target && typeof target === 'object') {
    if (target.path) {
      const query = Object.entries(target.query || {}).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
      return toUrl(`${target.path}${query ? '?' + query : ''}`)
    }
    if (target.name === 'register') {
      const query = Object.entries(target.query || {}).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
      return `/pages/auth/index?mode=register${query ? '&' + query : ''}`
    }
    const route = ROUTES.find((r) => r.name === target.name)
    if (!route) return ''
    const names = paramNames(route)
    path = route.path
    for (const n of names) path = path.replace(`:${n}`, encodeURIComponent(target.params?.[n] ?? ''))
    extra = { ...(target.query || {}) }
  } else {
    return ''
  }

  // /login 与 /register 共用一个页面，用 mode 查询参数区分
  if (path === '/register') { path = '/login'; extra.mode = 'register' }

  const matched = matchRoute(path)
  if (!matched) return ''
  const { route } = matched

  const options = { ...extra }
  if (typeof target === 'string') {
    const m = path.match(routeParamPattern(route))
    if (m) {
      for (const n of paramNames(route)) {
        if (m.groups[n] != null) options[n] = decodeURIComponent(m.groups[n])
      }
    }
  } else if (target && target.params) {
    Object.assign(options, target.params)
  }

  const qs = Object.entries(options)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')

  return `/${route.page}${qs ? '?' + qs : ''}`
}

function routeParamPattern(route) {
  const src = route.path
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:([A-Za-z0-9_]+)/g, '(?<$1>[^/]+)')
  return new RegExp(`^${src}$`)
}

function matchRoute(path) {
  for (const route of ROUTES) {
    if (route.path === path) return { route, params: {} }
    const m = path.match(routeParamPattern(route))
    if (m) return { route, params: m.groups }
  }
  return null
}

function navigate(target, mode) {
  const url = toUrl(target)
  if (!url) return
  const fn = uni[mode] || uni.navigateTo
  fn({ url, fail: error => {
    if (mode === 'navigateTo' && /limit|stack|webview count/i.test(error.errMsg || '')) {
      uni.redirectTo({ url })
      return
    }
    uni.showToast({ title: '页面打开失败，请重试', icon: 'none' })
  } })
}

/**
 * Navigation guard — the port of `router.beforeEach` in src/router/index.js.
 * Unauthenticated users are sent to the login page; authenticated users are
 * bounced away from it.
 */
export async function guardAuth() {
  const cur = currentRoute()
  if (!cur) return false
  const { route } = cur
  const auth = useAuthStore()
  if (!auth.ready) await auth.init()

  if (!route.meta?.public && !auth.isLoggedIn) {
    const redirect = encodeURIComponent(state.value.fullPath)
    uni.reLaunch({ url: `/pages/auth/index?redirect=${redirect}` })
    return false
  }
  if (route.meta?.public && auth.isLoggedIn) {
    uni.reLaunch({ url: '/pages/index/index' })
    return false
  }
  return true
}
