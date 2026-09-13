<!-- src/components/CommandPalette.vue -->
<template>
  <div class="cmd-wrapper hide-mobile">
    <!-- 常驻触发药丸 -->
    <button class="cmd-trigger" @click="open" :title="`快速跳转 (${isMac ? '⌘' : 'Ctrl'}K)`" aria-label="快速跳转">
      <svg class="cmd-trigger-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="7"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <span class="cmd-trigger-text">快速跳转</span>
      <kbd class="cmd-kbd">{{ isMac ? '⌘' : 'Ctrl' }} K</kbd>
    </button>

    <Teleport to="body">
      <Transition name="cmd">
        <div v-if="isOpen" class="cmd-overlay" @click.self="close" @keydown.esc="close">
          <div class="cmd-panel" ref="panelRef">
            <!-- 搜索行 -->
            <div class="cmd-search-row">
              <svg class="cmd-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="7"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref="inputRef"
                v-model="query"
                class="cmd-input"
                :placeholder="placeholder"
                @keydown.up.prevent="moveActive(-1)"
                @keydown.down.prevent="moveActive(1)"
                @keydown.enter.prevent="selectActive()"
                @keydown.esc.prevent="close"
              />
              <kbd class="cmd-kbd cmd-kbd-esc">esc</kbd>
            </div>

            <!-- 结果区 -->
            <div class="cmd-results" ref="resultsRef">
              <!-- 空查询：最近 + 全部（统一索引空间） -->
              <template v-if="!query">
                <div v-if="recent.length" class="cmd-section">
                  <div class="cmd-section-label">最近访问</div>
                  <button
                    v-for="(item, idx) in recent"
                    :key="'r-' + item.path"
                    class="cmd-item"
                    :class="{ active: activeIndex === idx }"
                    @click="select(item)"
                    @mousemove="activeIndex = idx"
                  >
                    <span class="cmd-item-icon" v-html="iconSvg(item.iconPath)"></span>
                    <span class="cmd-item-label">{{ item.label }}</span>
                    <span class="cmd-item-group">{{ item.group }}</span>
                    <svg class="cmd-item-enter" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>
                  </button>
                </div>
                <div v-for="group in groupedAll" :key="group.name" class="cmd-section">
                  <div class="cmd-section-label">{{ group.name }}</div>
                  <button
                    v-for="item in group.items"
                    :key="item.path"
                    class="cmd-item"
                    :class="{ active: activeIndex === recent.length + flatIndex(item) }"
                    @click="select(item)"
                    @mousemove="activeIndex = recent.length + flatIndex(item)"
                  >
                    <span class="cmd-item-icon" v-html="iconSvg(item.iconPath)"></span>
                    <span class="cmd-item-label">{{ item.label }}</span>
                    <span class="cmd-item-group">{{ item.group }}</span>
                    <svg class="cmd-item-enter" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12,9,6"/></svg>
                  </button>
                </div>
              </template>

              <!-- 有查询：扁平结果 -->
              <template v-else>
                <div v-if="filtered.length" class="cmd-section">
                  <div class="cmd-section-label">搜索结果 · {{ filtered.length }}</div>
                  <button
                    v-for="(item, idx) in filtered"
                    :key="item.path"
                    class="cmd-item"
                    :class="{ active: activeIndex === idx }"
                    @click="select(item)"
                    @mousemove="activeIndex = idx"
                  >
                    <span class="cmd-item-icon" v-html="iconSvg(item.iconPath)"></span>
                    <span class="cmd-item-label" v-html="highlight(item.label)"></span>
                    <span class="cmd-item-group">{{ item.group }}</span>
                    <svg class="cmd-item-enter" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>
                  </button>
                </div>
                <div v-else class="cmd-empty">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="7"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <p>没有匹配 "{{ query }}" 的入口</p>
                </div>
              </template>
            </div>

            <!-- 底部快捷键提示 -->
            <div class="cmd-footer">
              <span class="cmd-hint"><kbd class="cmd-kbd">↑</kbd><kbd class="cmd-kbd">↓</kbd> 导航</span>
              <span class="cmd-hint"><kbd class="cmd-kbd">↵</kbd> 选择</span>
              <span class="cmd-hint"><kbd class="cmd-kbd">esc</kbd> 关闭</span>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const authStore = useAuthStore()
const isOpen = ref(false)
const query = ref('')
const activeIndex = ref(0)
const inputRef = ref(null)
const panelRef = ref(null)
const resultsRef = ref(null)
const isMac = ref(false)
const RECENT_KEY = 'cmd-palette-recent'
const recentStorageKey = () => `${RECENT_KEY}:${authStore.user?.id}`
const RECENT_MAX = 4

// 全部命令（含原被折叠的三项，不再区别对待）
const commands = [
  { path: '/', label: '首页', group: '导航', iconPath: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10', keywords: 'home 首页 index' },
  { path: '/banks', label: '题库', group: '导航', iconPath: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z', keywords: 'banks 题库 bank question' },
  { path: '/history', label: '历史', group: '导航', iconPath: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', keywords: 'history 历史 record 记录' },
  { path: '/wrongbook', label: '错题', group: '导航', iconPath: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M15 9l-6 6 M9 9l6 6', keywords: 'wrongbook 错题 wrong mistake' },
  { path: '/favorites', label: '收藏', group: '导航', iconPath: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', keywords: 'favorites 收藏 star 收藏夹' },
  { path: '/settings', label: '设置', group: '导航', iconPath: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z', keywords: 'settings 设置 preference 配置' },
  { path: '/notes', label: '笔记', group: '笔记与资源', iconPath: 'M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5z M15 15v6h6', keywords: 'notes 笔记 note notebook' },
  { path: '/quiz-notes', label: '练习笔记', group: '笔记与资源', iconPath: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z', keywords: 'quiz-notes 练习笔记 quiz 题目笔记' },
  { path: '/resources', label: '资源', group: '笔记与资源', iconPath: 'M16.5 9.4l-9-5.19 M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12', keywords: 'resources 资源 resource 资料' },
]

// 最近访问（localStorage 持久化）
const recent = ref([])
function loadRecent() {
  try {
    const arr = JSON.parse(localStorage.getItem(recentStorageKey()) || '[]')
    recent.value = arr.map(p => commands.find(c => c.path === p)).filter(Boolean).slice(0, RECENT_MAX)
  } catch {
    recent.value = []
  }
}
function pushRecent(path) {
  const arr = JSON.parse(localStorage.getItem(recentStorageKey()) || '[]').filter(p => p !== path)
  arr.unshift(path)
  localStorage.setItem(recentStorageKey(), JSON.stringify(arr.slice(0, RECENT_MAX)))
  loadRecent()
}

// 全部命令按 group 分组（空查询时展示）
const groupedAll = computed(() => {
  const map = new Map()
  for (const c of commands) {
    if (!map.has(c.group)) map.set(c.group, [])
    map.get(c.group).push(c)
  }
  return Array.from(map, ([name, items]) => ({ name, items }))
})

// 扁平化（用于 activeIndex 计算）
const flatAll = computed(() => groupedAll.value.flatMap(g => g.items))
function flatIndex(item) {
  return flatAll.value.findIndex(c => c.path === item.path)
}

// 统一的展示列表（用于键盘导航）
// 空查询 + 有 recent：[...recent, ...flatAll]（项可在两个 section 重复出现）
// 空查询 + 无 recent：flatAll
// 有查询：filtered
const displayList = computed(() => {
  if (query.value) return filtered.value
  if (recent.value.length) return [...recent.value, ...flatAll.value]
  return flatAll.value
})

// 过滤
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return commands.filter(c => {
    const haystack = (c.label + ' ' + c.keywords + ' ' + c.group).toLowerCase()
    return q.split(/\s+/).every(token => haystack.includes(token))
  })
})

const placeholder = computed(() => '搜索页面、笔记、资源…')

// 高亮匹配
function highlight(label) {
  const q = query.value.trim()
  if (!q) return label
  const tokens = q.split(/\s+/).filter(Boolean).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!tokens.length) return label
  const re = new RegExp(`(${tokens.join('|')})`, 'gi')
  return label.replace(re, '<mark class="cmd-mark">$1</mark>')
}

// 图标 SVG（统一 stroke 渲染）
function iconSvg(d) {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`
}

// 开关
function open() {
  isOpen.value = true
  query.value = ''
  activeIndex.value = 0
  document.body.style.overflow = 'hidden'
  nextTick(() => inputRef.value?.focus())
}
function close() {
  isOpen.value = false
  document.body.style.overflow = ''
}
function toggle() {
  isOpen.value ? close() : open()
}

// 键盘导航（使用统一 displayList）
function moveActive(delta) {
  const list = displayList.value
  if (!list.length) return
  activeIndex.value = (activeIndex.value + delta + list.length) % list.length
  scrollActiveIntoView()
}
function selectActive() {
  const item = displayList.value[activeIndex.value]
  if (item) select(item)
}
function select(item) {
  pushRecent(item.path)
  router.push(item.path)
  close()
}
function scrollActiveIntoView() {
  nextTick(() => {
    const el = resultsRef.value?.querySelector('.cmd-item.active')
    el?.scrollIntoView({ block: 'nearest' })
  })
}

// 查询变化时重置 active
watch(query, () => { activeIndex.value = 0 })

// 全局快捷键 ⌘K / Ctrl+K
function onKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K' || e.key === 'е' /*俄语键盘兼容性忽略*/)) {
    e.preventDefault()
    toggle()
    return
  }
  if (e.key === '/' && !isOpen.value && !isTypingTarget(e.target)) {
    e.preventDefault()
    open()
  }
}
function isTypingTarget(t) {
  if (!t) return false
  const tag = (t.tagName || '').toLowerCase()
  return tag === 'input' || tag === 'textarea' || t.isContentEditable
}

onMounted(() => {
  // 平台探测
  isMac.value = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '')
  loadRecent()
  document.addEventListener('keydown', onKeydown)
})
watch(() => authStore.user?.id, loadRecent)
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

defineExpose({ open, close })
</script>

<style scoped>
.cmd-wrapper {
  position: relative;
}

/* ===== 触发药丸 ===== */
.cmd-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 34px;
  padding: 0 0.625rem 0 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.cmd-trigger:hover {
  border-color: var(--accent-border);
  color: var(--accent-primary);
  background: var(--accent-soft);
  box-shadow: 0 2px 12px var(--accent-soft);
}

.cmd-trigger-icon {
  flex-shrink: 0;
}

.cmd-trigger-text {
  letter-spacing: 0.01em;
}

/* 键帽样式 */
.cmd-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 20px;
  padding: 0 0.375rem;
  border: 1px solid var(--border-color);
  border-bottom-width: 2px;
  border-radius: 5px;
  background: var(--bg-surface-raised);
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1;
}

.cmd-trigger .cmd-kbd {
  margin-left: 0.125rem;
}

/* ===== 遮罩 + 面板 ===== */
.cmd-overlay {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: var(--overlay-backdrop);
  backdrop-filter: blur(6px) saturate(120%);
  -webkit-backdrop-filter: blur(6px) saturate(120%);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 12vh;
}

.cmd-panel {
  width: 560px;
  max-width: 92vw;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.04) inset,
    0 24px 64px rgba(0, 0, 0, 0.45),
    0 0 0 1px var(--accent-soft);
  overflow: hidden;
}

/* 顶部 accent 光晕线 */
.cmd-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 12%;
  right: 12%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent-primary), transparent);
  opacity: 0.7;
}

/* ===== 搜索行 ===== */
.cmd-search-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--border-color);
}

.cmd-search-icon {
  flex-shrink: 0;
  color: var(--text-muted);
}

.cmd-input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 1rem;
  color: var(--text-primary);
  outline: none;
}

.cmd-input::placeholder {
  color: var(--text-muted);
}

.cmd-kbd-esc {
  flex-shrink: 0;
}

/* ===== 结果区 ===== */
.cmd-results {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.5rem 0.5rem 0.75rem;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
}

.cmd-results::-webkit-scrollbar {
  width: 6px;
}
.cmd-results::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 999px;
}

.cmd-section {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.cmd-section + .cmd-section {
  margin-top: 0.5rem;
}

.cmd-section-label {
  padding: 0.5rem 0.625rem 0.375rem;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

/* ===== 结果项 ===== */
.cmd-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.625rem 0.625rem 0.75rem;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.9rem;
  text-align: left;
  position: relative;
  transition: background 0.12s ease, color 0.12s ease;
}

.cmd-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%) scaleY(0);
  width: 3px;
  height: 60%;
  background: var(--accent-primary);
  border-radius: 0 2px 2px 0;
  transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.cmd-item.active,
.cmd-item:hover {
  background: var(--accent-soft);
  color: var(--text-primary);
}

.cmd-item.active::before {
  transform: translateY(-50%) scaleY(1);
}

.cmd-item-icon {
  flex-shrink: 0;
  display: inline-flex;
  color: var(--text-muted);
  transition: color 0.12s ease;
}

.cmd-item.active .cmd-item-icon,
.cmd-item:hover .cmd-item-icon {
  color: var(--accent-primary);
}

.cmd-item-label {
  flex: 1;
  font-weight: 500;
  color: var(--text-primary);
  min-width: 0;
}

.cmd-item-group {
  flex-shrink: 0;
  font-size: 0.72rem;
  color: var(--text-muted);
}

.cmd-item-enter {
  flex-shrink: 0;
  color: var(--text-muted);
  opacity: 0;
  transition: opacity 0.12s ease;
}

.cmd-item.active .cmd-item-enter {
  opacity: 1;
  color: var(--accent-primary);
}

/* 匹配高亮 */
:deep(.cmd-mark) {
  background: var(--accent-soft);
  color: var(--accent-primary);
  padding: 0.05em 0.15em;
  border-radius: 3px;
  font-weight: 700;
}

/* ===== 空状态 ===== */
.cmd-empty {
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.625rem;
}

.cmd-empty p {
  font-size: 0.875rem;
}

/* ===== 底部 ===== */
.cmd-footer {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.625rem 1rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-surface);
}

.cmd-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  color: var(--text-muted);
}

.cmd-hint .cmd-kbd {
  min-width: 16px;
  height: 18px;
  font-size: 0.65rem;
}

/* ===== 进入/离开动画 ===== */
.cmd-enter-active {
  transition: opacity 0.18s ease;
}
.cmd-enter-active .cmd-panel {
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease;
}
.cmd-leave-active {
  transition: opacity 0.14s ease;
}
.cmd-leave-active .cmd-panel {
  transition: transform 0.14s ease, opacity 0.14s ease;
}
.cmd-enter-from,
.cmd-leave-to {
  opacity: 0;
}
.cmd-enter-from .cmd-panel,
.cmd-leave-to .cmd-panel {
  opacity: 0;
  transform: translateY(-12px) scale(0.98);
}
</style>
