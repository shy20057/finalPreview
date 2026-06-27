<template>
  <div class="question-nav-panel">
    <div class="panel-header">
      <span class="panel-title">题目导航</span>
      <span class="text-muted text-xs">{{ quizStore.currentIndex + 1 }} / {{ quizStore.totalQuestions }}</span>
    </div>

    <div class="nav-groups">
      <div
        v-for="group in groups"
        :key="group.type"
        class="nav-group"
      >
        <div class="group-header">
          <span class="group-title">{{ group.label }}</span>
          <span class="group-meta">
            {{ group.doneCount }} / {{ group.questions.length }}
          </span>
        </div>
        <div class="nav-grid">
          <button
            v-for="item in group.questions"
            :key="item.q.id"
            class="nav-cell"
            :class="{
              current: item.idx === quizStore.currentIndex,
              correct: statusMap[item.q.id] === 'correct',
              wrong: statusMap[item.q.id] === 'wrong'
            }"
            :title="`第 ${item.idx + 1} 题`"
            @click="jump(item.idx)"
          >
            {{ item.idx + 1 }}
          </button>
        </div>
      </div>
    </div>

    <div class="nav-legend">
      <div class="legend-item"><span class="legend-dot current"></span>当前</div>
      <div class="legend-item"><span class="legend-dot correct"></span>正确</div>
      <div class="legend-item"><span class="legend-dot wrong"></span>错误</div>
      <div class="legend-item"><span class="legend-dot"></span>未答</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useQuizStore } from '../stores/quiz.js'

const emit = defineEmits(['jump'])
const quizStore = useQuizStore()

const TYPE_LABELS = {
  single: '单选题',
  multi: '多选题',
  fill: '填空题',
  essay: '简答题',
}
const TYPE_ORDER = ['single', 'multi', 'fill', 'essay']

const statusMap = computed(() => {
  const map = {}
  for (const q of quizStore.questions) {
    map[q.id] = quizStore.getQuestionStatus(q.id)
  }
  return map
})

const groups = computed(() => {
  const bucket = {}
  for (const type of TYPE_ORDER) bucket[type] = []

  quizStore.questions.forEach((q, idx) => {
    const type = TYPE_ORDER.includes(q.type) ? q.type : 'single'
    bucket[type].push({ q, idx })
  })

  return TYPE_ORDER
    .filter(type => bucket[type].length > 0)
    .map(type => {
      const questions = bucket[type]
      const doneCount = questions.filter(
        ({ q }) => statusMap.value[q.id] === 'correct' || statusMap.value[q.id] === 'wrong'
      ).length
      return { type, label: TYPE_LABELS[type], questions, doneCount }
    })
})

function jump(idx) {
  quizStore.jumpToQuestion(idx)
  emit('jump')
}
</script>

<style scoped>
.question-nav-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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

.nav-groups {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border-color);
}

.group-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.group-meta {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.nav-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.35rem;
}

.nav-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
}

.nav-cell:hover {
  border-color: var(--accent-border);
  color: var(--text-primary);
}

.nav-cell.current {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-soft);
  color: var(--accent-primary);
  font-weight: 700;
}

.nav-cell.correct {
  background: var(--success-soft);
  border-color: var(--success-border);
  color: var(--success);
}

.nav-cell.wrong {
  background: var(--error-soft);
  border-color: var(--error-border);
  color: var(--error);
}

.nav-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
}

.legend-dot.current {
  border-color: var(--accent-primary);
  background: var(--accent-soft);
}

.legend-dot.correct {
  border-color: var(--success-border);
  background: var(--success-soft);
}

.legend-dot.wrong {
  border-color: var(--error-border);
  background: var(--error-soft);
}
</style>