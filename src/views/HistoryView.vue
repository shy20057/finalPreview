<template>
  <div class="history-view">
    <div class="page-header">
      <h1>答题历史</h1>
      <button v-if="!loading && historyStore.recordCount > 0" class="btn btn-sm btn-danger" @click="clearAll">
        清空记录
      </button>
    </div>

    <!-- Stats grid with skeleton -->
    <div v-if="loading" class="stats-grid">
      <div v-for="i in 4" :key="i" class="skeleton-stat-card card">
        <div class="skeleton" style="width: 48px; height: 32px; margin-bottom: 0.5rem;"></div>
        <div class="skeleton skeleton-text" style="width: 50%;"></div>
      </div>
    </div>
    <div v-else-if="stats.length > 0" class="stats-grid">
      <div
        v-for="(stat, index) in stats"
        :key="stat.bankId"
        class="stat-card card animate-slideInUp"
        :class="`stagger-${index + 1}`"
      >
        <span class="stat-value">{{ stat.avgScore }}</span>
        <span class="stat-label">{{ stat.bankName }}</span>
        <span class="stat-sub text-muted text-xs">{{ stat.count }}次 · 均分{{ stat.avgScore }}</span>
      </div>
    </div>

    <!-- Summary stats row -->
    <div v-if="!loading && historyStore.recordCount > 0" class="summary-stats animate-fadeIn">
      <div class="summary-item">
        <span class="summary-value text-accent font-bold">{{ historyStore.recordCount }}</span>
        <span class="summary-label text-muted text-sm">总次数</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <span class="summary-value text-accent font-bold">{{ avgScore }}</span>
        <span class="summary-label text-muted text-sm">平均分</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <span class="summary-value text-accent font-bold">{{ totalQuestions }}</span>
        <span class="summary-label text-muted text-sm">总答题数</span>
      </div>
    </div>

    <!-- Loading skeleton for records -->
    <div v-if="loading" class="record-list">
      <div v-for="i in 4" :key="i" class="skeleton-record card">
        <div class="skeleton-record-main">
          <div>
            <div class="skeleton skeleton-title" style="width: 180px; margin-bottom: 0.5rem;"></div>
            <div class="flex gap-2">
              <div class="skeleton" style="width: 64px; height: 20px; border-radius: 999px;"></div>
              <div class="skeleton skeleton-text" style="width: 80px;"></div>
              <div class="skeleton skeleton-text" style="width: 60px;"></div>
            </div>
          </div>
          <div class="skeleton-record-score">
            <div class="skeleton" style="width: 56px; height: 28px; margin-bottom: 0.25rem;"></div>
            <div class="skeleton skeleton-text" style="width: 40px;"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="historyStore.recordCount === 0" class="empty-state card animate-fadeIn">
      <div class="empty-state-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
      </div>
      <p class="text-muted">暂无答题记录</p>
      <router-link to="/banks" class="btn btn-primary">去答题</router-link>
    </div>

    <div v-else class="record-list">
      <div
        v-for="(record, index) in historyStore.sortedRecords"
        :key="record.id"
        class="record-card card animate-slideInUp"
        :class="`stagger-${(index % 6) + 1}`"
      >
        <div class="record-main">
          <div class="record-info">
            <h3>{{ record.bankName }}</h3>
            <div class="record-meta">
              <span class="badge" :class="record.mode === 'exam' ? 'badge-warning' : 'badge-accent'">
                {{ record.mode === 'exam' ? '模拟考试' : '练习模式' }}
              </span>
              <span class="text-muted text-sm">{{ formatDate(record.date) }}</span>
              <span class="text-muted text-sm">用时 {{ formatDuration(record.duration) }}</span>
            </div>
          </div>
          <div class="record-score">
            <span class="score-value" :class="getScoreClass(record.score)">{{ record.score }}分</span>
            <span class="text-muted text-sm">{{ record.correctCount }}/{{ record.totalQuestions }}</span>
          </div>
        </div>
        <div class="record-actions">
          <router-link :to="`/result/${record.id}`" class="btn btn-sm btn-secondary">查看详情</router-link>
          <button class="btn btn-sm btn-ghost" @click="deleteRecord(record.id)">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useHistoryStore } from '../stores/history.js'
import { useBankStore } from '../stores/bank.js'

const historyStore = useHistoryStore()
const bankStore = useBankStore()
const loading = ref(true)

const stats = computed(() => historyStore.statsByBank)

const avgScore = computed(() => {
  if (historyStore.recordCount === 0) return 0
  const total = historyStore.records.reduce((s, r) => s + r.score, 0)
  return Math.round(total / historyStore.recordCount)
})

const totalQuestions = computed(() => {
  return historyStore.records.reduce((s, r) => s + r.totalQuestions, 0)
})

function formatDate(iso) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}秒`
  return `${m}分${s}秒`
}

function getScoreClass(score) {
  if (score >= 80) return 'text-success'
  if (score >= 60) return 'text-accent'
  return 'text-error'
}

function deleteRecord(id) {
  if (confirm('确定删除这条记录？')) {
    historyStore.deleteRecord(id)
  }
}

function clearAll() {
  if (confirm('确定清空所有答题记录？此操作不可恢复。')) {
    historyStore.clearHistory()
  }
}

onMounted(async () => {
  await bankStore.loadBuiltinBanks()
  await bankStore.loadUserBanks()
  await historyStore.loadRecords()
  loading.value = false
})
</script>

<style scoped>
.history-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
}

/* Stats grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent-primary);
}

.stat-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.stat-sub {
  margin-top: 0.25rem;
}

/* Summary stats row */
.summary-stats {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem 1.5rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.summary-value {
  font-size: 1.5rem;
  line-height: 1;
}

.summary-divider {
  width: 1px;
  height: 32px;
  background: var(--border-color);
}

/* Empty state */
.empty-state {
  padding: 3rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

/* Record list */
.record-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.record-card {
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.record-card:hover {
  transform: none;
}

.record-main {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex: 1;
}

.record-info h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.record-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.record-score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
}

.score-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.record-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* Skeleton styles */
.skeleton-stat-card {
  padding: 1.25rem;
  pointer-events: none;
}

.skeleton-record {
  padding: 1rem 1.25rem;
  pointer-events: none;
}

.skeleton-record-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.skeleton-record-score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

@media (max-width: 768px) {
  .history-view {
    padding-bottom: 72px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .summary-stats {
    flex-wrap: wrap;
    gap: 1rem;
    padding: 0.875rem 1rem;
  }

  .summary-divider {
    display: none;
  }

  .summary-stats {
    justify-content: space-between;
  }

  .summary-item {
    align-items: center;
    text-align: center;
  }

  .summary-value {
    font-size: 1.25rem;
  }

  .record-card {
    flex-direction: column;
    align-items: flex-start;
    padding: 0.875rem 1rem;
    gap: 0.75rem;
  }

  .record-main {
    width: 100%;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .record-score {
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
  }

  .score-value {
    font-size: 1.1rem;
  }

  .record-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .page-header h1 {
    font-size: 1.1rem;
  }
}
</style>
