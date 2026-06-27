<template>
  <div class="right-panel">
    <!-- Stats Section -->
    <div class="stats-section">
      <div class="panel-header">
        <span class="panel-title">答题统计</span>
      </div>

      <div class="stats-list">
        <div class="stat-row">
          <div class="stat-icon success">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          </div>
          <span class="stat-name">正确</span>
          <span class="stat-value text-success">{{ quizStore.correctCount }}</span>
        </div>
        <div class="stat-row">
          <div class="stat-icon error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </div>
          <span class="stat-name">错误</span>
          <span class="stat-value text-error">{{ quizStore.wrongCount }}</span>
        </div>
        <div class="stat-row">
          <div class="stat-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 12h8"/>
            </svg>
          </div>
          <span class="stat-name">未答</span>
          <span class="stat-value">{{ quizStore.unansweredCount }}</span>
        </div>
        <div class="stat-row">
          <div class="stat-icon accent">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            </svg>
          </div>
          <span class="stat-name">得分</span>
          <span class="stat-value text-accent">{{ quizStore.currentScore }}</span>
        </div>
      </div>

      <div class="accuracy-bar">
        <div class="accuracy-header">
          <span class="text-sm">正确率</span>
          <span class="text-sm font-semibold">{{ quizStore.accuracy }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar-fill" :style="{ width: quizStore.accuracy + '%' }"></div>
        </div>
      </div>

      <div v-if="quizStore.wrongQuestionIds.length > 0" class="wrong-panel">
        <div class="panel-subtitle">错题 ({{ quizStore.wrongQuestionIds.length }})</div>
        <div class="wrong-list">
          <button
            v-for="q in wrongQuestionsLimited"
            :key="q.id"
            class="wrong-item"
            @click="jumpToQuestion(q)"
          >
            <span class="badge badge-error">{{ q.type === 'single' ? '单选' : q.type === 'multi' ? '多选' : q.type === 'essay' ? '简答' : '填空' }}</span>
            <span class="wrong-text">{{ truncate(q.question, 20) }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Notes Section -->
    <div class="notes-section card">
      <div class="panel-header">
        <span class="panel-title">题目笔记</span>
        <span v-if="quizStore.noteSaving" class="text-muted text-xs">保存中...</span>
      </div>
      <textarea
        class="note-input"
        :value="noteContent"
        @input="handleInput"
        placeholder="记录这道题的要点、易错点、记忆技巧..."
        rows="8"
      ></textarea>
      <div class="note-hint text-muted text-xs">笔记会自动保存到 IndexedDB</div>
    </div>
  </div>
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
  const value = e.target.value
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

.note-input::placeholder {
  color: var(--text-muted);
}

.note-hint {
  text-align: right;
}
</style>
