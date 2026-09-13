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
              answered: statusMap[item.q.id] === 'answered',
              correct: statusMap[item.q.id] === 'correct',
              wrong: statusMap[item.q.id] === 'wrong'
            }"
            :title="`第 ${item.idx + 1} 题${favoriteStore.isFavorited(quizStore.bankId, item.q.id) ? ' (已收藏)' : ''}${quizStore.hasNote(item.q.id) ? ' (有笔记)' : ''}`"
            @click="jump(item.idx)"
          >
            {{ item.idx + 1 }}
            <span v-if="favoriteStore.isFavorited(quizStore.bankId, item.q.id)" class="nav-fav-star">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </span>
            <span v-if="quizStore.hasNote(item.q.id)" class="nav-note-dot">
              <svg width="8" height="8" viewBox="0 0 1024 1024" fill="#F25A55">
                <path d="M831.029734 904.644267c-59.5968-53.461333-172.561067-78.276267-250.683733-71.765334-21.742933 1.809067-51.746133 15.684267-71.432533 14.830934-17.297067-0.750933-35.968-13.303467-54.792534-9.856l-4.770133-4.770134c-25.736533-47.744-43.630933-101.367467-52.317867-155.204266-25.915733-160.597333 21.085867-267.485867 75.118934-411.144534 1.834667-4.872533 8.900267-17.1776 3.447466-20.4032-6.8096 9.890133-18.3808 13.678933-26.385066 21.316267-42.9312 40.968533-94.788267 116.7872-120.0896 170.922667-59.400533 127.1296-57.284267 276.8896 0.955733 404.053333-41.3952 9.582933-105.864533 34.653867-138.359467 62.011733-17.501867-13.3888-38.075733-23.773867-54.9632-38.0672C-27.261466 727.739733-42.595866 487.552 84.567868 318.088533 173.869201 199.082667 317.493734 139.938133 446.227601 73.864533l62.762667-42.496c30.353067 19.0464 59.972267 39.466667 91.374933 56.8064 83.106133 45.883733 171.537067 80.4608 247.458133 138.9824 145.425067 112.1024 215.185067 294.971733 153.9328 473.719467-29.3376 85.614933-94.071467 157.7216-170.7264 203.776z" fill="#F88783"/>
                <path d="M831.029734 904.644267c7.927467 7.108267 16.4864 21.546667 26.0352 28.8256l21.674667 37.947733c-19.549867 4.010667-40.081067 11.118933-59.733333 14.225067-107.153067 16.964267-212.8128 5.7856-298.24-64.3584-3.336533-2.7392-8.712533-1.732267-9.3952-2.3296-21.1968-18.577067-41.5488-57.053867-57.250134-81.1008 18.824533-3.447467 37.495467 9.1136 54.792534 9.856 19.6864 0.853333 49.6896-13.021867 71.432533-14.830934 78.122667-6.510933 191.086933 18.295467 250.683733 71.765334zM330.071868 842.632533c1.5104-0.349867 3.242667 0.315733 4.770133 0 16.170667 48.9216 49.4848 89.216 81.109333 128.802134-62.404267 22.8608-142.0544 24.567467-207.445333 14.216533-19.652267-3.114667-40.174933-10.222933-59.733333-14.225067-2.389333-2.167467 7.697067-21.538133 10.1888-25.591466 5.2992-8.610133 25.787733-35.319467 32.759466-41.1904 32.494933-27.357867 96.964267-52.4288 138.359467-62.011734z" fill="#AAF2A8"/>
                <path d="M449.350801 833.092267l4.770133 4.770133c15.701333 24.046933 36.053333 62.5152 57.250134 81.1008-28.177067 23.1424-61.499733 40.046933-95.419734 52.471467-31.616-39.586133-64.938667-79.872-81.109333-128.802134 39.022933-8.123733 74.2144-12.228267 114.500267-9.540266z" fill="#5FB85E"/>
                <path d="M449.350801 833.092267c-40.285867-2.688-75.485867 1.416533-114.500267 9.540266-1.527467 0.315733-3.268267-0.349867-4.770133 0-58.24-127.163733-60.356267-276.932267-0.955733-404.053333 25.301333-54.135467 77.1584-129.954133 120.0896-170.922667 8.004267-7.637333 19.584-11.426133 26.385066-21.316266 5.4528 3.234133-1.6128 15.530667-3.447466 20.4032-54.024533 143.6672-101.034667 250.5472-75.118934 411.144533 8.686933 53.8368 26.581333 107.460267 52.317867 155.204267z" fill="#F25A55"/>
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>

    <div class="nav-legend">
      <div class="legend-item"><span class="legend-dot current"></span>当前</div>
      <div class="legend-item"><span class="legend-dot answered"></span>已答</div>
      <div class="legend-item"><span class="legend-dot correct"></span>正确</div>
      <div class="legend-item"><span class="legend-dot wrong"></span>错误</div>
      <div class="legend-item"><span class="legend-dot"></span>未答</div>
      <div class="legend-item"><span class="legend-dot note-dot-legend">
        <svg width="8" height="8" viewBox="0 0 1024 1024" fill="#F25A55">
          <path d="M831.029734 904.644267c-59.5968-53.461333-172.561067-78.276267-250.683733-71.765334-21.742933 1.809067-51.746133 15.684267-71.432533 14.830934-17.297067-0.750933-35.968-13.303467-54.792534-9.856l-4.770133-4.770134c-25.736533-47.744-43.630933-101.367467-52.317867-155.204266-25.915733-160.597333 21.085867-267.485867 75.118934-411.144534 1.834667-4.872533 8.900267-17.1776 3.447466-20.4032-6.8096 9.890133-18.3808 13.678933-26.385066 21.316267-42.9312 40.968533-94.788267 116.7872-120.0896 170.922667-59.400533 127.1296-57.284267 276.8896 0.955733 404.053333-41.3952 9.582933-105.864533 34.653867-138.359467 62.011733-17.501867-13.3888-38.075733-23.773867-54.9632-38.0672C-27.261466 727.739733-42.595866 487.552 84.567868 318.088533 173.869201 199.082667 317.493734 139.938133 446.227601 73.864533l62.762667-42.496c30.353067 19.0464 59.972267 39.466667 91.374933 56.8064 83.106133 45.883733 171.537067 80.4608 247.458133 138.9824 145.425067 112.1024 215.185067 294.971733 153.9328 473.719467-29.3376 85.614933-94.071467 157.7216-170.7264 203.776z" fill="#F88783"/>
          <path d="M831.029734 904.644267c7.927467 7.108267 16.4864 21.546667 26.0352 28.8256l21.674667 37.947733c-19.549867 4.010667-40.081067 11.118933-59.733333 14.225067-107.153067 16.964267-212.8128 5.7856-298.24-64.3584-3.336533-2.7392-8.712533-1.732267-9.3952-2.3296-21.1968-18.577067-41.5488-57.053867-57.250134-81.1008 18.824533-3.447467 37.495467 9.1136 54.792534 9.856 19.6864 0.853333 49.6896-13.021867 71.432533-14.830934 78.122667-6.510933 191.086933 18.295467 250.683733 71.765334zM330.071868 842.632533c1.5104-0.349867 3.242667 0.315733 4.770133 0 16.170667 48.9216 49.4848 89.216 81.109333 128.802134-62.404267 22.8608-142.0544 24.567467-207.445333 14.216533-19.652267-3.114667-40.174933-10.222933-59.733333-14.225067-2.389333-2.167467 7.697067-21.538133 10.1888-25.591466 5.2992-8.610133 25.787733-35.319467 32.759466-41.1904 32.494933-27.357867 96.964267-52.4288 138.359467-62.011734z" fill="#AAF2A8"/>
          <path d="M449.350801 833.092267l4.770133 4.770133c15.701333 24.046933 36.053333 62.5152 57.250134 81.1008-28.177067 23.1424-61.499733 40.046933-95.419734 52.471467-31.616-39.586133-64.938667-79.872-81.109333-128.802134 39.022933-8.123733 74.2144-12.228267 114.500267-9.540266z" fill="#5FB85E"/>
          <path d="M449.350801 833.092267c-40.285867-2.688-75.485867 1.416533-114.500267 9.540266-1.527467 0.315733-3.268267-0.349867-4.770133 0-58.24-127.163733-60.356267-276.932267-0.955733-404.053333 25.301333-54.135467 77.1584-129.954133 120.0896-170.922667 8.004267-7.637333 19.584-11.426133 26.385066-21.316266 5.4528 3.234133-1.6128 15.530667-3.447466 20.4032-54.024533 143.6672-101.034667 250.5472-75.118934 411.144533 8.686933 53.8368 26.581333 107.460267 52.317867 155.204267z" fill="#F25A55"/>
        </svg>
      </span>有笔记</div>
    </div>
  </div>
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