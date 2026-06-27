<template>
  <div class="result-view">
    <div v-if="!record" class="empty-state card">
      <p class="text-muted">记录不存在或已删除</p>
      <router-link to="/history" class="btn btn-primary">返回历史</router-link>
    </div>

    <div v-else class="result-content">
      <!-- Score Ring -->
      <div class="score-section card">
        <div class="score-ring">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="60" fill="none" stroke="var(--border-color)" stroke-width="10"/>
            <circle
              cx="70" cy="70" r="60" fill="none"
              :stroke="scoreColor"
              stroke-width="10"
              stroke-linecap="round"
              stroke-dasharray="377"
              :stroke-dashoffset="377 - (377 * record.score / 100)"
              transform="rotate(-90 70 70)"
              style="transition: stroke-dashoffset 0.8s ease-out"
            />
          </svg>
          <div class="score-text">
            <span class="score-number">{{ record.score }}</span>
            <span class="score-label">分</span>
          </div>
        </div>
        <h2 :class="scoreTextClass">{{ scoreText }}</h2>
        <p class="text-muted text-sm">{{ record.bankName }} · {{ record.mode === 'exam' ? '模拟考试' : '练习模式' }}</p>
      </div>

      <!-- Stats Grid -->
      <div class="stats-section">
        <div class="stat-item card">
          <span class="stat-number text-success">{{ record.correctCount }}</span>
          <span class="stat-label">正确</span>
        </div>
        <div class="stat-item card">
          <span class="stat-number text-error">{{ record.wrongCount }}</span>
          <span class="stat-label">错误</span>
        </div>
        <div class="stat-item card">
          <span class="stat-number">{{ record.totalQuestions - record.correctCount - record.wrongCount }}</span>
          <span class="stat-label">未答</span>
        </div>
        <div class="stat-item card">
          <span class="stat-number text-accent">{{ accuracy }}%</span>
          <span class="stat-label">正确率</span>
        </div>
        <div class="stat-item card">
          <span class="stat-number">{{ formatDuration(record.duration) }}</span>
          <span class="stat-label">用时</span>
        </div>
        <div class="stat-item card">
          <span class="stat-number">{{ formatDate(record.date) }}</span>
          <span class="stat-label">时间</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="result-actions">
        <router-link to="/banks" class="btn btn-secondary">返回题库</router-link>
        <router-link :to="`/quiz/${record.bankId}`" class="btn btn-primary">重新答题</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useHistoryStore } from '../stores/history.js'

const props = defineProps({ recordId: String })
const historyStore = useHistoryStore()

const record = computed(() => historyStore.getRecord(props.recordId))

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
[data-theme="light"] .result-view :deep(.card) {
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

.score-section h2 {
  font-size: 1.3rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

.score-section p {
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

[data-theme="light"] .stat-item:hover {
  border-color: rgba(180, 180, 200, 0.6);
}

.result-view:not([data-theme="light"]) .stat-item:hover {
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
