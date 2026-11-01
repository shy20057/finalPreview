<!-- mobile/pages/result/index.vue -->
<!-- uni-app port of src/views/ResultView.vue -->
<template>
  <AppShell>
  <view class="result-view">
    <view v-if="!record" class="empty-state card">
      <text class="text-muted">记录不存在或已删除</text>
      <view class="btn btn-primary" @click="router.push('/history')">返回历史</view>
    </view>

    <view v-else class="result-content">
      <!-- Score Ring -->
      <view class="score-section card">
        <view class="score-ring">
          <ScoreRing :score="record.score" :color="scoreColor" />
          <view class="score-text">
            <text class="score-number">{{ record.score }}</text>
            <text class="score-label">分</text>
          </view>
        </view>
        <text :class="scoreTextClass">{{ scoreText }}</text>
        <text class="text-muted text-sm">{{ record.bankName }} · {{ record.mode === 'exam' ? '模拟考试' : '练习模式' }}</text>
      </view>

      <!-- Stats Grid -->
      <view class="stats-section">
        <view class="stat-item card">
          <text class="stat-number text-success">{{ record.correctCount }}</text>
          <text class="stat-label">正确</text>
        </view>
        <view class="stat-item card">
          <text class="stat-number text-error">{{ record.wrongCount }}</text>
          <text class="stat-label">错误</text>
        </view>
        <view class="stat-item card">
          <text class="stat-number">{{ record.totalQuestions - record.correctCount - record.wrongCount }}</text>
          <text class="stat-label">未答</text>
        </view>
        <view class="stat-item card">
          <text class="stat-number text-accent">{{ accuracy }}%</text>
          <text class="stat-label">正确率</text>
        </view>
        <view class="stat-item card">
          <text class="stat-number">{{ formatDuration(record.duration) }}</text>
          <text class="stat-label">用时</text>
        </view>
        <view class="stat-item card">
          <text class="stat-number">{{ formatDate(record.date) }}</text>
          <text class="stat-label">时间</text>
        </view>
      </view>

      <!-- Actions -->
      <view class="result-actions">
        <view class="btn btn-secondary" @click="router.push('/banks')">返回题库</view>
        <view class="btn btn-primary" @click="router.push(`/quiz/${record.bankId}`)">重新答题</view>
      </view>
    </view>
  </view>
  </AppShell>
</template>

<script setup>
import { onPageReady } from '../../composables/usePageReady.js'
import ScoreRing from '../../components/ScoreRing.vue'
import { computed } from 'vue'
import { useRoute, useRouter } from '../../utils/router.js'
import { useHistoryStore } from '../../stores/history.js'
import AppShell from '../../components/AppShell.vue'

const route = useRoute()
const router = useRouter()
const historyStore = useHistoryStore()
onPageReady(() => historyStore.loadRecords(), { refresh: false })

const record = computed(() => historyStore.getRecord(route.params.recordId))

const accuracy = computed(() => {
  if (!record.value || record.value.totalQuestions === 0) return 0
  return Math.round((record.value.correctCount / record.value.totalQuestions) * 100)
})

const scoreColor = computed(() => {
  if (!record.value) return 'var(--text-muted)'
  if (record.value.score >= 80) return 'var(--success)'
  if (record.value.score >= 60) return 'var(--warning)'
  return 'var(--error)'
})

const scoreTextClass = computed(() => {
  if (!record.value) return ''
  if (record.value.score >= 80) return 'text-success'
  if (record.value.score >= 60) return 'text-accent'
  return 'text-error'
})

const scoreText = computed(() => {
  if (!record.value) return ''
  if (record.value.score >= 90) return '太棒了！'
  if (record.value.score >= 80) return '表现不错！'
  if (record.value.score >= 60) return '继续加油！'
  return '需要努力！'
})

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}秒`
  return `${m}分${s}秒`
}

function formatDate(iso) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.result-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 760px;
  margin: 0 auto;
  padding: 1rem 0;
}

/* 整页卡片：浅色主题用白底 95%，深色主题用深色半透明 */
.result-view :deep(.card) {
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
}

/* 浅色主题：白底 95% 不透明 */
.theme-light .result-view :deep(.card) {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  color: #1a1a2e;
}

/* 深色主题：深色背景 + 半透明，让星空透出来 */
.result-view :deep(.card) {
  background: rgba(20, 22, 38, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  color: #e8e8f0;
}

.empty-state {
  padding: 3rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.score-section {
  padding: 2.75rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.score-ring {
  position: relative;
  width: 150px;
  height: 150px;
}

.score-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.score-number {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
}

.score-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

/* 原版是 h2 / p；uni 的 text 会同时命中这两个兄弟节点，
   用 :not(.text-muted) 区分标题与说明文字。 */
.score-section > text:not(.text-muted) {
  font-size: 1.3rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

.score-section > text.text-muted {
  margin-top: 0.25rem;
  color: var(--text-muted);
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

.stat-item {
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.stat-item:hover {
  transform: translateY(-2px);
}

.theme-light .stat-item:hover {
  border-color: rgba(180, 180, 200, 0.6);
}

.theme-dark-blue .stat-item:hover {
  border-color: rgba(255, 255, 255, 0.25);
}

.stat-number {
  font-size: 1.4rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}

.result-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  padding-top: 0.5rem;
}

@media (max-width: 768px) {
  .result-view {
    gap: 1.25rem;
    padding-bottom: 72px;
  }

  .score-ring {
    width: 120px;
    height: 120px;
  }

  .score-number {
    font-size: 2rem;
  }

  .score-section {
    padding: 2rem 1.5rem;
  }

  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .stat-item {
    padding: 1rem 0.75rem;
  }

  .stat-number {
    font-size: 1.2rem;
  }

  .result-actions {
    flex-direction: column;
  }

  .result-actions .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
