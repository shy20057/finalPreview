<!-- mobile/components/QuestionNav.vue -->
<!-- Port of src/components/QuestionNav.vue — App-Vue 端（详见 mobile/PORTING.md） -->
<template>
  <view class="question-nav-panel">
    <view class="panel-header">
      <text class="panel-title">题目导航</text>
      <text class="text-muted text-xs">{{ quizStore.currentIndex + 1 }} / {{ quizStore.totalQuestions }}</text>
    </view>

    <view class="nav-groups">
      <view
        v-for="group in groups"
        :key="group.type"
        class="nav-group"
      >
        <view class="group-header">
          <text class="group-title">{{ group.label }}</text>
          <text class="group-meta">
            {{ group.doneCount }} / {{ group.questions.length }}
          </text>
        </view>
        <view class="nav-grid">
          <view
            v-for="item in group.questions"
            :key="item.q.id"
            class="nav-cell"
            :class="{
              current: item.idx === quizStore.currentIndex,
              answered: statusMap[item.q.id] === 'answered',
              correct: statusMap[item.q.id] === 'correct',
              wrong: statusMap[item.q.id] === 'wrong'
            }"
            :title="`第 ${item.idx + 1} 题${favoriteStore.isFavorited(quizStore.bankId, item.q.id) ? ' (已收藏)' : ''}${quizStore.hasNote(item.q.id) ? ' (有笔记)' : ''}`"
            @click="jump(item.idx)"
          >
            {{ item.idx + 1 }}
            <text v-if="favoriteStore.isFavorited(quizStore.bankId, item.q.id)" class="nav-fav-star">
              <AppIcon name="ib0c81a9f" :size="8" :colored="true" />
            </text>
            <text v-if="quizStore.hasNote(item.q.id)" class="nav-note-dot">
              <AppIcon name="ic3009927" :size="8" :colored="true" />
            </text>
          </view>
        </view>
      </view>
    </view>

    <view class="nav-legend">
      <view class="legend-item"><text class="legend-dot current"></text>当前</view>
      <view class="legend-item"><text class="legend-dot answered"></text>已答</view>
      <view class="legend-item"><text class="legend-dot correct"></text>正确</view>
      <view class="legend-item"><text class="legend-dot wrong"></text>错误</view>
      <view class="legend-item"><text class="legend-dot"></text>未答</view>
      <view class="legend-item"><text class="legend-dot note-dot-legend">
        <AppIcon name="ic3009927" :size="8" :colored="true" />
      </text>有笔记</view>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useQuizStore } from '../stores/quiz.js'
import { useFavoriteStore } from '../stores/favorite.js'

const emit = defineEmits(['jump'])
const quizStore = useQuizStore()
const favoriteStore = useFavoriteStore()

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
    const raw = quizStore.getQuestionStatus(q.id)
    if (raw === 'unanswered') {
      map[q.id] = 'unanswered'
    } else if (quizStore.isSubmitted(q.id)) {
      // 已提交：显示真实对错
      map[q.id] = raw
    } else {
      // 已选答案但未提交：只显示已答，不暴露对错
      map[q.id] = 'answered'
    }
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
        ({ q }) => statusMap.value[q.id] !== 'unanswered'
      ).length
      return { type, label: TYPE_LABELS[type], questions, doneCount }
    })
})

function jump(idx) {
  quizStore.jumpToQuestion(idx)
  quizStore.persistSession()
  emit('jump')
}

onMounted(() => {
  favoriteStore.load()
})
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
  position: relative;
}

.nav-fav-star {
  position: absolute;
  top: 1px;
  right: 1px;
  line-height: 0;
}

.nav-note-dot {
  position: absolute;
  bottom: 1px;
  left: 50%;
  transform: translateX(-50%);
  line-height: 0;
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

.nav-cell.answered {
  background: var(--accent-soft);
  border-color: var(--accent-border);
  color: var(--accent-primary);
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

.legend-dot.answered {
  border-color: var(--accent-border);
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

.legend-dot.note-dot-legend {
  background: transparent;
  border-color: #3259CE;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
