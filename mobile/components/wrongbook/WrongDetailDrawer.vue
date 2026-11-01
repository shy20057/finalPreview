<template>
  <ViewTransition name="drawer">
    <view v-if="entry" class="drawer-overlay" @click.self="close">
      <!-- Confetti canvas（原版是 <canvas>，App 端无 2D canvas 上下文，
           彩纸改由全局 ConfettiLayer 渲染，见 launchConfetti） -->
      <view class="confetti-canvas" />

      <!-- Thumbs-up celebration overlay -->
      <ViewTransition name="pop">
        <view v-if="showCelebration" class="celebration-overlay">
          <view class="celebration-card">
            <AppIcon name="ie7994369" :size="64" :colored="true" class="thumbs-icon" />
            <text class="celebration-text">已掌握！</text>
          </view>
        </view>
      </ViewTransition>

      <view class="drawer card">
        <view class="drawer-header">
          <view class="header-tags">
            <text class="type-badge" :class="`type-${entry.type}`">{{ typeLabel(entry.type) }}</text>
            <text class="text-muted text-sm">{{ entry.subject }} · {{ entry.bankName }}</text>
          </view>
          <view class="close-btn" @click="close" title="关闭">
            <AppIcon name="ieba488ee" :size="18" />
          </view>
        </view>

        <view class="drawer-body">
          <view class="meta-row">
            <text class="meta-pill error">答错 {{ entry.wrongCount }} 次</text>
            <text class="meta-pill text-muted">最近：{{ formatDate(entry.lastWrongAt) }}</text>
            <text class="meta-pill text-muted">首次：{{ formatDate(entry.firstWrongAt) }}</text>
          </view>

          <view class="question-block">
            <view class="question-label text-muted">题目</view>
            <view class="question-text" :class="{ expanded: expanded }">{{ entry.question }}</view>
            <view v-if="isLong" class="expand-btn" @click="expanded = !expanded">
              {{ expanded ? '收起' : '展开全文' }}
            </view>
          </view>

          <!-- 单选/多选：显示完整选项 -->
          <view
            v-if="(entry.type === 'single' || entry.type === 'multi') && entry.options"
            class="options-block"
          >
            <view class="question-label text-muted">选项</view>
            <view
              v-for="opt in entry.options"
              :key="opt.label"
              class="opt-row"
              :class="{
                'opt-correct': isCorrectOption(opt.label),
                'opt-wrong': isUserWrongOption(opt.label),
              }"
            >
              <text class="opt-label">{{ opt.label}}</text>
              <text class="opt-text">{{ opt.text }}</text>
            </view>
          </view>

          <!-- 答案对照 -->
          <view class="answer-block">
            <view class="answer-row">
              <text class="answer-label">正确答案</text>
              <text class="answer-value correct">{{ formatAnswer(entry.answer) }}</text>
            </view>
            <view class="answer-row">
              <text class="answer-label">你的答案（最近）</text>
              <text class="answer-value user">
                {{ formatAnswer(entry.attempts[entry.attempts.length - 1]?.userAnswer) }}
              </text>
            </view>
          </view>

          <!-- 历次答错明细 -->
          <view v-if="entry.attempts.length > 1" class="attempts-block">
            <view class="question-label text-muted">历次答错</view>
            <view class="attempt-list">
              <view v-for="(a, idx) in entry.attempts" :key="idx" class="attempt-item">
                <text class="attempt-date text-muted">{{ formatDateTime(a.at) }}</text>
                <text class="attempt-answer">{{ formatAnswer(a.userAnswer) }}</text>
                <text class="text-muted text-xs">{{ a.mode === 'exam' ? '模拟考试' : '练习' }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="drawer-footer">
          <view class="btn btn-secondary" @click="markMastered">
            {{ isEntryMastered ? '取消已掌握' : '标记已掌握' }}
          </view>
          <view class="btn btn-danger" @click="remove">从错题本移除</view>
        </view>
      </view>
    </view>
  </ViewTransition>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useWrongBookStore } from '../../stores/wrongBook.js'
import { burstConfetti } from '../../utils/confetti.js'

const wrongBook = useWrongBookStore()
const entry = computed(() => wrongBook.currentDrawerEntry)
const expanded = ref(false)
const showCelebration = ref(false)

watch(entry, () => { expanded.value = false })

const isLong = computed(() => (entry.value?.question || '').length > 100)
const isEntryMastered = computed(() => {
  if (!entry.value) return false
  return wrongBook.isEntryMastered(entry.value.key) === true
})

function close() {
  wrongBook.closeDrawer()
}

function markMastered() {
  if (!entry.value) return
  const becomingMastered = !isEntryMastered.value
  wrongBook.markMastered(entry.value.key, becomingMastered)
  if (becomingMastered) {
    showCelebration.value = true
    nextTick(() => launchConfetti())
    setTimeout(() => { showCelebration.value = false }, 2000)
  }
}

function remove() {
  if (!entry.value) return
  const key = entry.value.key
  uni.showModal({
    title: '确认移除',
    content: '确认从错题本移除这道题？原始历史记录会保留。',
    confirmText: '移除',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) wrongBook.removeEntry(key)
    },
  })
}

const TYPE_LABELS = { single: '单选', multi: '多选', fill: '填空', essay: '简答' }
function typeLabel(t) { return TYPE_LABELS[t] || '其他' }

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function formatAnswer(a) {
  if (a === undefined || a === null || a === '') return '（未作答）'
  if (Array.isArray(a)) return a.join(' / ')
  return String(a)
}
function isCorrectOption(label) {
  if (!entry.value) return false
  const ans = entry.value.answer
  if (Array.isArray(ans)) return ans.includes(label)
  return ans === label
}
function isUserWrongOption(label) {
  if (!entry.value) return false
  const user = entry.value.attempts[entry.value.attempts.length - 1]?.userAnswer
  if (user === undefined || user === null || user === '') return false
  const inAnswer = isCorrectOption(label)
  if (Array.isArray(user)) {
    return user.includes(label) && !inAnswer
  }
  return user === label && !inAnswer
}

// ─── Confetti particle system ──────────────────────────
// App 端没有 canvas 2d 上下文，改用全局 ConfettiLayer（components/ConfettiLayer.vue）
// 在按钮区域发射彩纸，坐标换算与原版一致（宽 78% / 高 75%）
function launchConfetti() {
  const sys = uni.getSystemInfoSync()
  const x = Math.round(sys.windowWidth * 0.78)
  const y = Math.round(sys.windowHeight * 0.75)
  burstConfetti(x, y)
}
</script>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 200;
  display: flex;
  justify-content: flex-end;
}

/* ─── Confetti canvas ─────────────────────────────────── */
.confetti-canvas {
  position: fixed;
  inset: 0;
  z-index: 300;
  pointer-events: none;
}

/* ─── Celebration overlay ─────────────────────────────── */
.celebration-overlay {
  position: fixed;
  inset: 0;
  z-index: 310;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.celebration-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  animation: celebBounce 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes celebBounce {
  0% { transform: scale(0.3); opacity: 0; }
  60% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

.thumbs-icon {
  filter: drop-shadow(0 4px 16px rgba(34, 197, 94, 0.5));
  animation: thumbFloat 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes thumbFloat {
  0% { transform: translateY(30px) rotate(-15deg); opacity: 0; }
  40% { transform: translateY(-8px) rotate(3deg); opacity: 1; }
  100% { transform: translateY(0) rotate(0deg); opacity: 1; }
}

.celebration-text {
  font-size: 1.2rem;
  font-weight: 800;
  color: #22c55e;
  text-shadow: 0 2px 12px rgba(34, 197, 94, 0.4);
  animation: textReveal 0.5s 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
  margin: 0;
}

@keyframes textReveal {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Pop transition for celebration */
.pop-enter-active { transition: opacity 0.2s ease; }
.pop-leave-active { transition: opacity 0.35s ease; }
.pop-enter-from, .pop-leave-to { opacity: 0; }
.drawer {
  width: 480px;
  max-width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  border-radius: 0;
  background: var(--bg-card);
  border-left: 1px solid var(--border-color);
}
.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}
.header-tags {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
}
.type-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-primary);
  border: 1px solid var(--accent-border);
}
.type-badge.type-fill {
  background: var(--success-soft);
  color: var(--success);
  border-color: var(--success-border);
}
.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.close-btn:hover {
  background: var(--bg-surface-raised);
  color: var(--text-primary);
}
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.meta-row {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.meta-pill {
  font-size: 0.75rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
}
.meta-pill.error {
  background: var(--error-soft);
  color: var(--error);
  border-color: var(--error-border);
}
.question-block, .options-block, .answer-block, .attempts-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.question-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.question-text {
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.7;
  color: var(--text-primary);
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.question-text.expanded {
  -webkit-line-clamp: unset;
}
.expand-btn {
  align-self: flex-start;
  background: transparent;
  border: none;
  color: var(--accent-primary);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0;
}
.options-block {
  padding: 0.75rem;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
}
.opt-row {
  display: flex;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  font-size: 0.9rem;
  line-height: 1.5;
}
.opt-row.opt-correct {
  background: var(--success-soft);
  border-color: var(--success-border);
  color: var(--success);
}
.opt-row.opt-wrong {
  background: var(--error-soft);
  border-color: var(--error-border);
  color: var(--error);
}
.opt-label { font-weight: 600; flex-shrink: 0; }
.opt-text { flex: 1; }
.answer-block {
  padding: 0.75rem;
  background: var(--bg-surface-raised);
  border-radius: var(--radius-md);
  gap: 0.5rem;
}
.answer-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
.answer-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  min-width: 100px;
}
.answer-value {
  font-size: 0.92rem;
  font-weight: 500;
}
.answer-value.correct { color: var(--success); }
.answer-value.user { color: var(--error); }
.attempt-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.attempt-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.4rem 0.6rem;
  background: var(--bg-surface);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  align-items: center;
}
.attempt-date { min-width: 80px; font-variant-numeric: tabular-nums; }
.attempt-answer { flex: 1; color: var(--text-primary); }
.drawer-footer {
  display: flex;
  gap: 0.5rem;
  padding: 0.875rem 1.25rem;
  border-top: 1px solid var(--border-color);
  justify-content: space-between;
}

/* Drawer transition */
.drawer-enter-active, .drawer-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-enter-active .drawer, .drawer-leave-active .drawer {
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-enter-from, .drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from .drawer, .drawer-leave-to .drawer {
  transform: translateX(100%);
}

@media (max-width: 768px) {
  .drawer-overlay {
    align-items: flex-end;
  }
  .drawer {
    width: 100vw;
    max-width: 100vw;
    height: calc(100vh - 72px);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    border-left: none;
    border-top: 1px solid var(--border-color);
  }
  .drawer-footer {
    padding-bottom: calc(0.875rem + env(safe-area-inset-bottom, 0px));
  }
}
</style>
