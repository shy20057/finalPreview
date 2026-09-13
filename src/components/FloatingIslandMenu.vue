<!-- src/components/FloatingIslandMenu.vue -->
<template>
  <div
    class="fim hide-mobile"
    :class="{ open: isOpen, dragging: isDragging }"
    ref="wrapperRef"
    :style="{ left: pos.x + 'px', top: pos.y + 'px', right: 'auto', bottom: 'auto' }"
  >
    <!-- 猫头像按钮（点击展开菜单） -->
    <button
      class="fim-cat"
      @click="onCatClick"
      @mousedown="startDrag"
      aria-label="次级菜单"
      :aria-expanded="isOpen"
    >
      <!-- 亮色主题猫（包在 .fim-cat-inner 里，晃动只作用于这一层） -->
      <span v-if="isLight" class="fim-cat-inner">
        <svg width="40" height="40" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
          <path d="M170.666667 410.538667V127.786667c0-19.328 24.106667-28.48 37.184-14.101334l112.064 123.178667a344.490667 344.490667 0 0 1 384.149333 0l112.085333-123.178667C829.226667 99.328 853.333333 108.48 853.333333 127.786667V896H170.666667V410.538667z" fill="#FFFFFF"/>
          <path d="M853.333333 413.781333c-41.450667-198.677333-167.786667-122.325333-266.666666 34.218667-69.845333 110.592 192 117.333333 266.666666 138.666667v-172.885334z" fill="#7E4C27"/>
          <path d="M170.666667 413.781333V128.042667c0-19.541333 24.106667-28.8 37.184-14.272l112.064 124.522666a341.184 341.184 0 0 1 61.461333-33.194666C422.784 187.946667 413.866667 192 458.666667 192c0 0 37.034667 163.968-21.333334 256-70.058667 110.442667-192 181.333333-266.666666 202.666667V413.781333z" fill="#FBCA82"/>
          <path d="M362.666667 458.666667a32 32 0 1 1-64 0 32 32 0 0 1 64 0zM725.333333 458.666667a32 32 0 1 1-64 0 32 32 0 0 1 64 0zM524.928 673.536a10.666667 10.666667 0 0 0-11.242667-12.629333 10.688 10.688 0 0 0-11.264 12.586666c-5.12 10.453333-17.109333 15.957333-32.341333 17.066667a72.042667 72.042667 0 0 1-22.933333-1.941333 34.218667 34.218667 0 0 1-7.36-2.773334 9.109333 9.109333 0 0 1-1.728-1.130666 10.666667 10.666667 0 0 0-18.048 11.370666c2.432 3.989333 6.250667 6.698667 9.6 8.533334 3.562667 1.92 7.722667 3.456 12.074666 4.608 8.725333 2.304 19.306667 3.413333 29.952 2.624 14.229333-1.045333 30.72-5.76 41.941334-17.408 10.837333 11.562667 26.773333 16.362667 40.853333 17.408 10.474667 0.789333 20.949333-0.32 29.781333-2.602667 8.234667-2.133333 17.024-5.845333 22.122667-11.754667a10.666667 10.666667 0 0 0-16.192-13.909333c-0.682667 0.810667-4.138667 3.157333-11.306667 5.013333-6.613333 1.706667-14.72 2.581333-22.826666 1.984-14.592-1.109333-26.048-6.506667-31.082667-17.066666z" fill="#000000"/>
          <path d="M316.544 264.896l15.296-10.304a323.157333 323.157333 0 0 1 360.32 0l15.296 10.304L832 127.978667v471.658666l-74.752 18.346667a10.666667 10.666667 0 1 0 5.077333 20.714667L832 621.589333V661.333333h-74.666667a10.666667 10.666667 0 0 0 0 21.333334H832v40.682666l-71.658667-12.224a10.666667 10.666667 0 0 0-3.584 21.013334l75.242667 12.864V896H192v-150.954667l75.264-12.522666a10.666667 10.666667 0 1 0-3.498667-21.034667L192 723.413333V682.666667h74.666667a10.666667 10.666667 0 0 0 0-21.333334H192v-40.533333l71.338667 13.098667a10.666667 10.666667 0 1 0 3.84-20.992L192 599.104V128l124.544 136.917333zM853.333333 594.389333V128c0-19.498667-24-28.8-37.12-14.357333l-112.128 123.285333a344.512 344.512 0 0 0-384.149333 0L207.786667 113.578667C194.666667 99.2 170.666667 108.501333 170.666667 128v467.2l-71.338667-13.077333a10.666667 10.666667 0 0 0-3.84 20.992L170.666667 616.896V661.333333H96a10.666667 10.666667 0 0 0 0 21.333334H170.666667v44.288l-75.264 12.522666a10.666667 10.666667 0 1 0 3.498666 21.034667L170.666667 748.586667V896h682.666666v-147.349333l71.658667 12.224a10.666667 10.666667 0 1 0 3.584-21.013334L853.333333 726.997333V682.666667h74.666667a10.666667 10.666667 0 0 0 0-21.333334H853.333333v-44.970666l74.752-18.346667a10.666667 10.666667 0 0 0-5.077333-20.714667L853.333333 594.389333z" fill="#000000"/>
        </svg>
      </span>
      <!-- 暗色主题猫 -->
      <span v-else class="fim-cat-inner">
        <svg width="40" height="40" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
          <path d="M170.666667 410.538667V127.786667c0-19.328 24.106667-28.48 37.184-14.101334l112.064 123.178667a344.490667 344.490667 0 0 1 384.149333 0l112.085333-123.178667C829.226667 99.328 853.333333 108.48 853.333333 127.786667V896H170.666667V410.538667z" fill="#040404"/>
          <path d="M362.666667 458.666667a32 32 0 1 1-64 0 32 32 0 0 1 64 0zM725.333333 458.666667a32 32 0 1 1-64 0 32 32 0 0 1 64 0z" fill="#FFF621"/>
          <path d="M524.928 673.536a10.666667 10.666667 0 0 0-11.242667-12.629333 10.688 10.688 0 0 0-11.264 12.586666c-5.12 10.453333-17.109333 15.957333-32.341333 17.066667a72.042667 72.042667 0 0 1-22.933333-1.941333 34.218667 34.218667 0 0 1-7.36-2.773334 9.109333 9.109333 0 0 1-1.728-1.130666 10.666667 10.666667 0 0 0-18.048 11.370666c2.432 3.989333 6.250667 6.698667 9.6 8.533334 3.562667 1.92 7.722667 3.456 12.074666 4.608 8.725333 2.304 19.306667 3.413333 29.952 2.624 14.229333-1.045333 30.72-5.76 41.941334-17.408 10.837333 11.562667 26.773333 16.362667 40.853333 17.408 10.474667 0.789333 20.949333-0.32 29.781333-2.602667 8.234667-2.133333 17.024-5.845333 22.122667-11.754667a10.666667 10.666667 0 0 0-16.192-13.909333c-0.682667 0.810667-4.138667 3.157333-11.306667 5.013333-6.613333 1.706667-14.72 2.581333-22.826666 1.984-14.592-1.109333-26.048-6.506667-31.082667-17.066666z" fill="#404040"/>
          <path d="M316.544 264.896l15.296-10.304a323.157333 323.157333 0 0 1 360.32 0l15.296 10.304L832 127.978667v471.658666l-74.752 18.346667a10.666667 10.666667 0 1 0 5.077333 20.714667L832 621.589333V661.333333h-74.666667a10.666667 10.666667 0 0 0 0 21.333334H832v40.682666l-71.658667-12.224a10.666667 10.666667 0 0 0-3.584 21.013334l75.242667 12.864V896H192v-150.954667l75.264-12.522666a10.666667 10.666667 0 1 0-3.498667-21.034667L192 723.413333V682.666667h74.666667a10.666667 10.666667 0 0 0 0-21.333334H192v-40.533333l71.338667 13.098667a10.666667 10.666667 0 1 0 3.84-20.992L192 599.104V128l124.544 136.917333zM853.333333 594.389333V128c0-19.498667-24-28.8-37.12-14.357333l-112.128 123.285333a344.512 344.512 0 0 0-384.149333 0L207.786667 113.578667C194.666667 99.2 170.666667 108.501333 170.666667 128v467.2l-71.338667-13.077333a10.666667 10.666667 0 0 0-3.84 20.992L170.666667 616.896V661.333333H96a10.666667 10.666667 0 0 0 0 21.333334H170.666667v44.288l-75.264 12.522666a10.666667 10.666667 0 1 0 3.498666 21.034667L170.666667 748.586667V896h682.666666v-147.349333l71.658667 12.224a10.666667 10.666667 0 1 0 3.584-21.013334L853.333333 726.997333V682.666667h74.666667a10.666667 10.666667 0 0 0 0-21.333334H853.333333v-44.970666l74.752-18.346667a10.666667 10.666667 0 0 0-5.077333-20.714667L853.333333 594.389333z" fill="#000000"/>
        </svg>
      </span>

      <!-- 脉冲呼吸提示 -->
      <span class="fim-pulse" v-if="!isOpen" aria-hidden="true"></span>

      <!-- 拖动提示 -->
      <span class="fim-drag-hint" aria-hidden="true">拖动 / 点击展开</span>
    </button>

    <!-- 猫咪语录气泡（从猫头左侧弹出，一直存在，每 10 秒更新） -->
    <div v-if="showSpeech" class="fim-speech" :key="currentSpeech" @click.stop>
      {{ currentSpeech }}
    </div>

    <!-- 右侧弹出面板 -->
    <Transition name="fim-panel">
      <div v-if="isOpen" class="fim-panel" ref="panelRef" @click.stop>
        <div class="fim-panel-header">
          <span>次级入口</span>
          <span class="fim-panel-count">{{ items.length }} 项</span>
        </div>
        <div class="fim-panel-list">
          <router-link
            v-for="(item, i) in items"
            :key="item.path"
            :to="item.path"
            class="fim-panel-item"
            :class="{ 'router-link-active': activeRoute === item.path }"
            :style="{ '--delay': i * 45 + 'ms' }"
            @click="close"
          >
            <span class="fim-panel-icon" v-html="iconSvg(item.iconPath)"></span>
            <span class="fim-panel-label">{{ item.label }}</span>
            <svg class="fim-panel-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
          </router-link>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '../stores/app.js'
import { useAuthStore } from '../stores/auth.js'

const appStore = useAppStore()
const authStore = useAuthStore()
const isLight = computed(() => appStore.theme === 'light')

const wrapperRef = ref(null)
const panelRef = ref(null)
const isOpen = ref(false)
const route = useRoute()

// ===== 猫咪语录系统 =====
const catQuotes = [
  // 学习鼓励（≤10 字）
  '复习像吃鱼 (=^・ω・^=)',
  '错题是宝藏呀 ฅ(>///<)ฅ',
  '一起加油喵 (ง •̀ω•́)ง',
  '做题好认真 (｡･ω･｡)',
  '期末稳了喵 (=ↀωↀ=)✧',
  '小鱼干+1 (ↀᴥↀ✿)',
  // 喵星人日常
  '想被摸摸头 (｡･ω･｡)',
  '伸个懒腰喵 ฅ(・ω・✿)ฅ',
  '咕噜咕噜 (=ↀωↀ=)',
  '今天也想睡觉 ( ˘ω˘ )',
  '小鱼干够吗 (ΦωΦ)',
  '呼噜呼噜 (=^･ω･^=)',
  // 功能小提示（无颜文字，≤15 字）
  '按 Ctrl+K 可快速跳转页面',
  '点我可以展开次级菜单',
  '点我打开笔记、资源入口',
  '命令面板支持模糊搜索',
  '导入题库支持 Markdown 文件',
  '导入弹窗有 AI 提示词可用',
  'Tab 键可切换 AI 侧栏',
  '答题结束可查看详细解析',
  '错题本自动收集答错的题',
  '收藏的题目记得定期回顾',
  '练习模式即时判分',
  '模拟考试交卷后统一判分',
  '资源页支持上传 HTML 文件',
  '软删除仅隐藏，可撤销',
  '硬删除会移除磁盘文件',
  '设置页可切换明暗主题',
  '历史记录可查看过往答题',
  '笔记从题库详情页进入',
  '练习笔记从答题页侧栏进入',
  '题库支持按学科筛选',
  '拖动我可以改变位置',
  // 卖萌
  '你在看我吗 (=ↀωↀ=)',
  '可爱已送达 ∠( ᐛ」∠)＿',
  '陪我看书吧 (｡♥‿♥｡)',
  '快看我快看我 (*≧▽≦)',
  '蹭蹭你喵 (//ω//)',
  '学术猫报到 (๑•̀ㅂ•́)و',
  // 休息关怀
  '累了歇会儿喵',
  '记得喝水呀',
  '看看远处吧喵',
  '别熬夜复习呀',
  '深呼吸放松下',
  '休息也重要喵',
]

const showSpeech = ref(false)
const currentSpeech = ref('')
let speechTimer = null
let lastQuoteIndex = -1
const SPEECH_INTERVAL = 10000  // 10 秒更新一次

function pickRandomQuote() {
  let idx
  do {
    idx = Math.floor(Math.random() * catQuotes.length)
  } while (idx === lastQuoteIndex && catQuotes.length > 1)
  lastQuoteIndex = idx
  return catQuotes[idx]
}

function updateSpeech() {
  currentSpeech.value = pickRandomQuote()
  showSpeech.value = true
}

function startSpeechTimer() {
  stopSpeechTimer()
  // 3 秒后首次显示
  setTimeout(() => {
    updateSpeech()
    speechTimer = setInterval(updateSpeech, SPEECH_INTERVAL)
  }, 3000)
}
function stopSpeechTimer() {
  if (speechTimer) { clearInterval(speechTimer); speechTimer = null }
  showSpeech.value = false
}

const activeRoute = computed(() => route.path)

const items = [
  { path: '/notes', label: '笔记', iconPath: 'M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5z M15 15v6h6' },
  { path: '/quiz-notes', label: '练习笔记', iconPath: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
  { path: '/resources', label: '资源', iconPath: 'M16.5 9.4l-9-5.19 M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12' },
]

function iconSvg(d) {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`
}

// ===== 开关 =====
function onCatClick() {
  if (justDragged.value) {
    justDragged.value = false
    return
  }
  toggle()
}
function toggle() { isOpen.value = !isOpen.value }
function close() { isOpen.value = false }

// ===== 拖拽 =====
const STORAGE_KEY = 'fim-position'
const positionStorageKey = () => `${STORAGE_KEY}:${authStore.user?.id}`
const isDragging = ref(false)
const justDragged = ref(false)
const pos = ref({ x: 0, y: 0 })
let dragStart = { x: 0, y: 0, posX: 0, posY: 0 }
let moveHandler = null
let upHandler = null

function loadPos() {
  try {
    const saved = JSON.parse(localStorage.getItem(positionStorageKey()) || 'null')
    if (saved) {
      pos.value = saved
      return
    }
  } catch {}
  pos.value = { x: window.innerWidth - 72, y: window.innerHeight - 80 }
}
function savePos() {
  localStorage.setItem(positionStorageKey(), JSON.stringify(pos.value))
}
function clampPos() {
  const margin = 16
  const w = 52
  const h = 52
  pos.value.x = Math.max(margin, Math.min(window.innerWidth - w - margin, pos.value.x))
  pos.value.y = Math.max(margin, Math.min(window.innerHeight - h - margin, pos.value.y))
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
  startSpeechTimer()
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onResize)
})
watch(() => authStore.user?.id, () => {
  loadPos()
  clampPos()
})
onUnmounted(() => {
  stopSpeechTimer()
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onResize)
  document.body.style.userSelect = ''
})

watch(() => route.path, onRouteChange)
</script>

<style scoped>
.fim {
  position: fixed;
  width: 52px;
  height: 52px;
  z-index: 90;
  transition:
    left 0.45s cubic-bezier(0.6, 0, 0.4, 1.2),
    top 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.fim.dragging {
  transition: none;
  cursor: grabbing;
}

/* ===== 猫头像按钮 ===== */
.fim-cat {
  position: relative;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-shadow: none;
  touch-action: none;
  user-select: none;
  overflow: visible;
}

/* 只晃动猫 inner 层，气泡在 .fim-cat 外面不受影响 */
.fim-cat-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fim-cat:hover .fim-cat-inner {
  animation: fim-wiggle 0.8s ease-in-out infinite;
}

.fim-cat:active .fim-cat-inner {
  animation: fim-wiggle 0.4s ease-in-out infinite;
}

@keyframes fim-wiggle {
  0%, 100% { transform: rotate(-3deg); }
  50%      { transform: rotate(3deg); }
}

.fim.dragging .fim-cat-inner {
  animation: none;
  transform: scale(1.04);
  filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.35));
}

.fim.open .fim-cat-inner {
  animation: none;
  transform: rotate(0deg);
  filter: drop-shadow(0 4px 12px rgba(91, 138, 204, 0.4));
}

.fim-cat svg {
  display: block;
}

/* 脉冲呼吸 */
.fim-pulse {
  position: absolute;
  inset: -4px;
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
  70%  { transform: scale(1.2);  opacity: 0; }
  100% { transform: scale(1.2);  opacity: 0; }
}

/* 拖动提示 */
.fim-drag-hint {
  position: absolute;
  right: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%) translateX(8px);
  padding: 0.3rem 0.6rem;
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

.fim-cat:hover .fim-drag-hint {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.fim.open .fim-drag-hint {
  display: none;
}

/* ===== 猫咪语录气泡（左侧弹出，一直存在，每 10 秒更新内容） ===== */
.fim-speech {
  position: absolute;
  right: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
  width: max-content;
  max-width: 220px;
  padding: 0.5rem 0.8rem;
  background: var(--bg-surface-raised);
  border: 1px solid var(--accent-soft, rgba(91, 138, 204, 0.16));
  border-radius: 18px 18px 18px 4px;
  box-shadow:
    0 6px 20px rgba(0, 0, 0, 0.18),
    0 0 0 1px var(--accent-soft, rgba(91, 138, 204, 0.16));
  color: var(--text-primary);
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1.5;
  white-space: normal;
  word-break: break-word;
  z-index: 3;
  backdrop-filter: blur(10px) saturate(160%);
  -webkit-backdrop-filter: blur(10px) saturate(160%);
  /* 内容更新动画（:key 变化时触发） */
  animation: fim-speech-update 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 右侧三角指向猫头 */
.fim-speech::after {
  content: '';
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  width: 10px;
  height: 10px;
  background: var(--bg-surface-raised);
  border-right: 1px solid var(--accent-soft, rgba(91, 138, 204, 0.16));
  border-top: 1px solid var(--accent-soft, rgba(91, 138, 204, 0.16));
}

/* 内容更新时的轻微弹跳 */
@keyframes fim-speech-update {
  0%   { opacity: 0.4; transform: translateY(-50%) scale(0.9); }
  100% { opacity: 1;   transform: translateY(-50%) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .fim-speech { animation: none; }
}


.fim-panel {
  position: absolute;
  left: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
  min-width: 200px;
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.28),
    0 0 0 1px var(--accent-soft, rgba(91, 138, 204, 0.16));
  overflow: hidden;
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  z-index: 1;
}

.fim-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.625rem 0.75rem 0.5rem;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.fim-panel-count {
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: var(--accent-soft, rgba(91, 138, 204, 0.16));
  color: var(--accent-primary);
  font-size: 0.62rem;
}

.fim-panel-list {
  padding: 0.375rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fim-panel-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.55rem 0.625rem;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  opacity: 0;
  transform: translateX(-8px);
  transition:
    opacity 0.22s ease var(--delay),
    transform 0.22s cubic-bezier(0.16, 1, 0.3, 1) var(--delay),
    background 0.15s ease,
    color 0.15s ease;
}

.fim.open .fim-panel-item {
  opacity: 1;
  transform: translateX(0);
}

.fim-panel-item:hover {
  background: var(--accent-soft, rgba(91, 138, 204, 0.16));
  color: var(--accent-primary);
}

.fim-panel-item.router-link-active {
  background: var(--accent-soft, rgba(91, 138, 204, 0.16));
  color: var(--accent-primary);
}

.fim-panel-icon {
  display: inline-flex;
  flex-shrink: 0;
  color: var(--text-muted);
  transition: color 0.15s ease;
}

.fim-panel-item:hover .fim-panel-icon,
.fim-panel-item.router-link-active .fim-panel-icon {
  color: var(--accent-primary);
}

.fim-panel-label {
  flex: 1;
}

.fim-panel-arrow {
  flex-shrink: 0;
  color: var(--text-muted);
  opacity: 0;
  transform: translateX(-4px);
  transition: all 0.15s ease;
}

.fim-panel-item:hover .fim-panel-arrow,
.fim-panel-item.router-link-active .fim-panel-arrow {
  opacity: 1;
  transform: translateX(0);
  color: var(--accent-primary);
}

.fim-panel::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  width: 10px;
  height: 10px;
  background: var(--bg-surface-raised);
  border-left: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
}

/* ===== 面板出入动画 ===== */
.fim-panel-enter-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.fim-panel-leave-active {
  transition: all 0.18s ease;
}
.fim-panel-enter-from {
  opacity: 0;
  transform: translateY(-50%) translateX(-12px) scale(0.96);
}
.fim-panel-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(-8px) scale(0.98);
}

@media (max-width: 768px) {
  .fim { display: none !important; }
}

@media (prefers-reduced-motion: reduce) {
  .fim-pulse { animation: none; }
  .fim-cat, .fim-panel, .fim-panel-item {
    transition-duration: 0.01ms !important;
  }
}
</style>
