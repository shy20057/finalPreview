<!-- src/components/FloatingIslandMenu.vue -->
<template>
  <div
    class="fim hide-mobile"
    :class="{ open: isOpen, dragging: isDragging }"
    ref="wrapperRef"
    :style="{ left: pos.x + 'px', top: pos.y + 'px', right: 'auto', bottom: 'auto' }"
  >
    <!-- 内圈：5 项主菜单 -->
    <router-link
      v-for="(item, i) in innerItems"
      :key="'inner-' + item.path"
      :to="item.path"
      class="fim-item fim-item--inner"
      :style="{
        '--tx': innerPositions[i].x + 'px',
        '--ty': innerPositions[i].y + 'px',
        '--delay': i * 40 + 'ms',
        '--rev-delay': (innerItems.length - 1 - i) * 25 + 'ms'
      }"
      @click="close"
    >
      <span class="fim-label">{{ item.label }}</span>
      <span class="fim-icon" v-html="iconSvg(item.iconPath)"></span>
    </router-link>

    <!-- 外圈：4 项次级菜单 -->
    <router-link
      v-for="(item, i) in outerItems"
      :key="'outer-' + item.path"
      :to="item.path"
      class="fim-item fim-item--outer"
      :style="{
        '--tx': outerPositions[i].x + 'px',
        '--ty': outerPositions[i].y + 'px',
        '--delay': (innerItems.length * 40 + i * 40) + 'ms',
        '--rev-delay': (outerItems.length - 1 - i) * 25 + 'ms'
      }"
      @click="close"
    >
      <span class="fim-label">{{ item.label }}</span>
      <span class="fim-icon" v-html="iconSvg(item.iconPath)"></span>
    </router-link>

    <!-- 浮岛主按钮 -->
    <button
      class="fim-island"
      @mousedown="startDrag"
      @click="onIslandClick"
      @mouseenter="previewOpen"
      :aria-label="isOpen ? '收起菜单' : '展开菜单'"
      :aria-expanded="isOpen"
    >
      <Transition name="fim-icon-swap" mode="out-in">
        <svg v-if="!isOpen" key="menu" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="1.5"/>
          <circle cx="19" cy="12" r="1.5"/>
          <circle cx="5" cy="12" r="1.5"/>
        </svg>
        <svg v-else key="close" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </Transition>
      <span class="fim-pulse" aria-hidden="true"></span>
      <span class="fim-drag-hint" aria-hidden="true">拖动 / 点击展开</span>
    </button>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const wrapperRef = ref(null)
const isOpen = ref(false)
const route = useRoute()

// 内圈：5 项主菜单（首页/题库/历史/错题/收藏）
const innerItems = [
  { path: '/', label: '首页', iconPath: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
  { path: '/banks', label: '题库', iconPath: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' },
  { path: '/history', label: '历史', iconPath: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  { path: '/wrongbook', label: '错题', iconPath: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M15 9l-6 6 M9 9l6 6' },
  { path: '/favorites', label: '收藏', iconPath: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
]

// 外圈：4 项次级菜单（笔记/练习笔记/资源/设置）
const outerItems = [
  { path: '/notes', label: '笔记', iconPath: 'M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5z M15 15v6h6' },
  { path: '/quiz-notes', label: '练习笔记', iconPath: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
  { path: '/resources', label: '资源', iconPath: 'M16.5 9.4l-9-5.19 M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12' },
  { path: '/settings', label: '设置', iconPath: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' },
]

// 内圈半径与位置：5 项均匀分布 360°（0°/72°/144°/216°/288°）
const INNER_R = 80
const innerPositions = innerItems.map((_, i) => {
  const angle = (360 / innerItems.length) * i - 90  // 起始正上方
  const rad = (angle * Math.PI) / 180
  return { x: INNER_R * Math.cos(rad), y: INNER_R * Math.sin(rad) }
})

// 外圈半径与位置：4 项均匀分布 360°，与内圈错开（36°/108°/180°/252°）
const OUTER_R = 140
const outerPositions = outerItems.map((_, i) => {
  const angle = (360 / outerItems.length) * i - 90 + 45  // 与内圈错开 45°
  const rad = (angle * Math.PI) / 180
  return { x: OUTER_R * Math.cos(rad), y: OUTER_R * Math.sin(rad) }
})

function iconSvg(d) {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`
}

// ===== 开关 =====
function onIslandClick() {
  if (justDragged.value) {
    justDragged.value = false
    return
  }
  toggle()
}
function toggle() { isOpen.value = !isOpen.value }
function close() { isOpen.value = false }
let hoverTimer = null
function previewOpen() {
  if (!isOpen.value) {
    clearTimeout(hoverTimer)
    hoverTimer = setTimeout(() => { isOpen.value = true }, 280)
  }
}

// ===== 拖拽 =====
const STORAGE_KEY = 'fim-position'
const isDragging = ref(false)
const justDragged = ref(false)
const pos = ref({ x: 0, y: 0 })
let dragStart = { x: 0, y: 0, posX: 0, posY: 0 }
let moveHandler = null
let upHandler = null

function loadPos() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (saved) {
      pos.value = saved
      return
    }
  } catch {}
  pos.value = { x: window.innerWidth - 88, y: window.innerHeight - 88 }
}
function savePos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pos.value))
}
function clampPos() {
  const margin = 16
  const size = 56
  // 考虑外圈最大半径，避免子项出屏
  const safeMargin = margin + 60
  const maxX = window.innerWidth - size - margin
  const maxY = window.innerHeight - size - margin
  const minX = margin
  const minY = margin + safeMargin  // 上方留更多空间避免遮挡顶栏
  pos.value.x = Math.max(minX, Math.min(maxX, pos.value.x))
  pos.value.y = Math.max(minY, Math.min(maxY, pos.value.y))
}

function startDrag(e) {
  if (e.button !== 0) return
  dragStart = { x: e.clientX, y: e.clientY, posX: pos.value.x, posY: pos.value.y }
  isDragging.value = false
  moveHandler = onDragMove
  upHandler = onDragEnd
  document.addEventListener('mousemove', moveHandler)
  document.addEventListener('mouseup', upHandler)
  document.body.style.userSelect = 'none'
}
function onDragMove(e) {
  const dx = e.clientX - dragStart.x
  const dy = e.clientY - dragStart.y
  if (!isDragging.value && Math.hypot(dx, dy) > 4) {
    isDragging.value = true
    if (isOpen.value) close()
  }
  if (isDragging.value) {
    pos.value = { x: dragStart.posX + dx, y: dragStart.posY + dy }
    clampPos()
  }
}
function onDragEnd() {
  document.removeEventListener('mousemove', moveHandler)
  document.removeEventListener('mouseup', upHandler)
  document.body.style.userSelect = ''
  if (isDragging.value) {
    justDragged.value = true
    savePos()
  }
  isDragging.value = false
}

function onResize() {
  clampPos()
  savePos()
}

// ===== 外部点击 / ESC / 路由变化 =====
function onDocClick(e) {
  if (isDragging.value) return
  if (wrapperRef.value && !wrapperRef.value.contains(e.target)) close()
}
function onKeydown(e) {
  if (e.key === 'Escape' && isOpen.value) close()
}
function onRouteChange() { close() }

onMounted(() => {
  loadPos()
  clampPos()
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onResize)
  clearTimeout(hoverTimer)
  document.body.style.userSelect = ''
})

watch(() => route.path, onRouteChange)
</script>

<style scoped>
.fim {
  position: fixed;
  width: 56px;
  height: 56px;
  z-index: 90;
  transition: left 0.2s cubic-bezier(0.16, 1, 0.3, 1), top 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.fim.dragging {
  transition: none;
  cursor: grabbing;
}

/* ===== 辐射子项（通用） ===== */
.fim-item {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-direction: row-reverse;
  padding: 0.5rem 0.8rem;
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28), 0 0 0 1px var(--accent-soft);
  color: var(--text-primary);
  text-decoration: none;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, -50%) scale(0.3);
  transform-origin: center;
  transition:
    transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) var(--delay),
    opacity 0.18s ease var(--delay),
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

.fim.open .fim-item {
  transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1);
  opacity: 1;
  pointer-events: auto;
}

.fim:not(.open) .fim-item {
  transition:
    transform 0.26s cubic-bezier(0.4, 0, 1, 1) var(--rev-delay),
    opacity 0.16s ease var(--rev-delay);
}

.fim-item:hover {
  background: var(--accent-soft);
  border-color: var(--accent-border);
  color: var(--accent-primary);
  z-index: 5;
}

.fim-item.router-link-active {
  background: var(--accent-soft);
  border-color: var(--accent-border);
  color: var(--accent-primary);
}

.fim-item.router-link-active .fim-icon,
.fim-item:hover .fim-icon {
  color: var(--accent-primary);
}

.fim-icon {
  display: inline-flex;
  color: var(--text-secondary);
  transition: color 0.18s ease;
}

.fim-label {
  letter-spacing: 0.01em;
  padding-right: 0.25rem;
}

/* 内圈与外圈的视觉区分 */
.fim-item--inner {
  /* 主菜单更"实"：略大、略重 */
  padding: 0.55rem 0.9rem;
  font-size: 0.82rem;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.32), 0 0 0 1px var(--accent-soft);
}

.fim-item--outer {
  /* 次级菜单更"虚"：略小、略淡 */
  padding: 0.45rem 0.75rem;
  font-size: 0.76rem;
  font-weight: 500;
  opacity: 0.92;
  background: var(--bg-surface);
}

.fim.open .fim-item--outer {
  opacity: 1;
}

/* ===== 浮岛主按钮 ===== */
.fim-island {
  position: absolute;
  inset: 0;
  border: 1px solid var(--border-color);
  border-radius: 50%;
  background: var(--bg-surface-raised);
  color: var(--text-secondary);
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.28),
    0 0 0 1px var(--border-color),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transition:
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
  z-index: 2;
  touch-action: none;
}

.fim.dragging .fim-island {
  cursor: grabbing;
  transform: scale(1.08);
  box-shadow:
    0 10px 28px rgba(0, 0, 0, 0.4),
    0 0 0 2px var(--accent-border);
}

.fim-island:hover {
  color: var(--accent-primary);
  border-color: var(--accent-border);
  box-shadow:
    0 6px 20px rgba(91, 138, 204, 0.32),
    0 0 0 1px var(--accent-border);
}

.fim.open .fim-island {
  transform: rotate(135deg);
  color: var(--accent-primary);
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.fim.open.dragging .fim-island {
  transform: scale(1.08) rotate(135deg);
}

.fim.open .fim-island svg {
  transform: rotate(-135deg);
}

/* 脉冲呼吸 */
.fim-pulse {
  position: absolute;
  inset: -1px;
  border-radius: 50%;
  border: 2px solid var(--accent-primary);
  opacity: 0;
  pointer-events: none;
  animation: fim-pulse 2.8s ease-out infinite;
}

.fim.open .fim-pulse,
.fim.dragging .fim-pulse {
  animation: none;
}

@keyframes fim-pulse {
  0%   { transform: scale(1);   opacity: 0.5; }
  70%  { transform: scale(1.55); opacity: 0; }
  100% { transform: scale(1.55); opacity: 0; }
}

/* 拖动提示 */
.fim-drag-hint {
  position: absolute;
  right: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%) translateX(8px);
  padding: 0.25rem 0.55rem;
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: all 0.2s ease;
}

.fim-island:hover .fim-drag-hint {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.fim.open .fim-drag-hint {
  display: none;
}

/* ===== 图标切换动画 ===== */
.fim-icon-swap-enter-active,
.fim-icon-swap-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fim-icon-swap-enter-from {
  opacity: 0;
  transform: scale(0.5) rotate(-45deg);
}
.fim-icon-swap-leave-to {
  opacity: 0;
  transform: scale(0.5) rotate(45deg);
}

@media (max-width: 768px) {
  .fim { display: none !important; }
}

@media (prefers-reduced-motion: reduce) {
  .fim-pulse { animation: none; }
  .fim-item, .fim-island { transition-duration: 0.01ms !important; }
}
</style>
