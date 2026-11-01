<!-- mobile/components/StatsPanel.vue -->
<!-- Port of src/components/StatsPanel.vue — App-Vue 端（详见 mobile/PORTING.md） -->
<template>
  <view class="right-panel">
    <!-- Stats Section -->
    <view class="stats-section">
      <view class="panel-header">
        <text class="panel-title">答题统计</text>
      </view>

      <view class="stats-list">
        <view class="stat-row">
          <view class="stat-icon success">
            <AppIcon name="i36ca5d1a" :size="14" />
          </view>
          <text class="stat-name">正确</text>
          <text class="stat-value text-success">{{ quizStore.correctCount }}</text>
        </view>
        <view class="stat-row">
          <view class="stat-icon error">
            <AppIcon name="i9899d249" :size="14" />
          </view>
          <text class="stat-name">错误</text>
          <text class="stat-value text-error">{{ quizStore.wrongCount }}</text>
        </view>
        <view class="stat-row">
          <view class="stat-icon">
            <AppIcon name="i2c670601" :size="14" />
          </view>
          <text class="stat-name">未答</text>
          <text class="stat-value">{{ quizStore.unansweredCount }}</text>
        </view>
        <view class="stat-row">
          <view class="stat-icon accent">
            <AppIcon name="i1998460e" :size="14" />
          </view>
          <text class="stat-name">得分</text>
          <text class="stat-value text-accent">{{ quizStore.currentScore }}</text>
        </view>
      </view>

      <view class="accuracy-bar">
        <view class="accuracy-header">
          <text class="text-sm">正确率</text>
          <text class="text-sm font-semibold">{{ quizStore.accuracy }}%</text>
        </view>
        <view class="progress-bar">
          <view class="progress-bar-fill" :style="{ width: quizStore.accuracy + '%' }"></view>
        </view>
      </view>

      <view v-if="quizStore.wrongQuestionIds.length > 0" class="wrong-panel">
        <view class="panel-subtitle">错题 ({{ quizStore.wrongQuestionIds.length }})</view>
        <view class="wrong-list">
          <view
            v-for="q in wrongQuestionsLimited"
            :key="q.id"
            class="wrong-item"
            @click="jumpToQuestion(q)"
          >
            <text class="badge badge-error">{{ q.type === 'single' ? '单选' : q.type === 'multi' ? '多选' : q.type === 'essay' ? '简答' : '填空' }}</text>
            <text class="wrong-text">{{ truncate(q.question, 20) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Notes Section -->
    <view class="notes-section card">
      <view class="panel-header">
        <text class="panel-title">题目笔记</text>
        <text v-if="quizStore.noteSaving" class="text-muted text-xs">保存中...</text>
      </view>
      <textarea
        class="note-input"
        :value="noteContent"
        @input="handleInput"
        placeholder="记录这道题的要点、易错点、记忆技巧..."
        placeholder-class="input-placeholder"
        rows="8"
      ></textarea>
      <view class="note-hint text-muted text-xs">笔记会自动保存到 IndexedDB</view>
    </view>
  </view>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useQuizStore } from '../stores/quiz.js'

const quizStore = useQuizStore()

const wrongQuestionsLimited = computed(() => {
  return quizStore.wrongQuestions.slice(0, 5)
})

const noteContent = computed(() => {
  return quizStore.currentNote?.content || ''
})

// Load note when question changes
watch(() => quizStore.currentQuestion?.id, () => {
  if (quizStore.currentQuestion) {
    quizStore.loadCurrentNote()
  }
})

let saveTimer = null

function handleInput(e) {
  // uni-app 的 textarea/input 事件值在 e.detail.value
  const value = e.detail.value
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    quizStore.saveCurrentNote(value)
  }, 500)
}

function jumpToQuestion(q) {
  const idx = quizStore.questions.findIndex(x => x.id === q.id)
  if (idx !== -1) {
    quizStore.jumpToQuestion(idx)
  }
}

function truncate(str, len) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}
</script>

<style scoped>
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stats-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  background: var(--bg-surface);
  border-radius: var(--radius-sm);
}

.stat-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-surface-raised);
  color: var(--text-muted);
}

.stat-icon.success {
  background: var(--success-soft);
  color: var(--success);
}

.stat-icon.error {
  background: var(--error-soft);
  color: var(--error);
}

.stat-icon.accent {
  background: var(--accent-soft);
  color: var(--accent-primary);
}

.stat-name {
  flex: 1;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 0.95rem;
  font-weight: 600;
}

.accuracy-bar {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color);
}

.accuracy-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.wrong-panel {
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color);
}

.panel-subtitle {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.wrong-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.wrong-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.5rem;
  background: var(--bg-surface);
  border-radius: var(--radius-sm);
  border: none;
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.wrong-item:hover {
  background: var(--bg-surface-raised);
  color: var(--text-primary);
}

.wrong-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Notes */
.notes-section {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.note-input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: 0.85rem;
  color: var(--text-primary);
  line-height: 1.6;
  resize: vertical;
  transition: border-color 0.15s ease;
}

.note-input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.note-hint {
  text-align: right;
}
</style>
