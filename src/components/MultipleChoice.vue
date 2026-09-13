<template>
  <div class="single-choice">
    <div class="question-header">
      <div class="question-badges">
        <span class="badge badge-accent">多选题</span>
        <span class="text-muted text-sm">{{ question.score || 2 }}分</span>
      </div>
      <button
        v-if="!batchMode"
        class="favorite-btn"
        :class="{ favorited: isFav, toggling: favAnim }"
        @click.stop="toggleFav"
        :title="isFav ? '取消收藏' : '收藏题目'"
        ref="favBtnRef"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" :fill="isFav ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </button>
      <button
        v-else
        class="batch-checkbox"
        :class="{ selected: isSelected }"
        @click.stop="toggleSelect"
      >
        <svg v-if="isSelected" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20,6 9,17 4,12"/>
        </svg>
      </button>
    </div>

    <h3 class="question-text">{{ question.question }}</h3>

    <div class="options-list">
      <button
        v-for="option in question.options"
        :key="option.label"
        class="option-item"
        :class="{
          selected: selectedAnswers.includes(option.label) && !submitted,
          correct: submitted && question.answer.includes(option.label),
          incorrect: submitted && selectedAnswers.includes(option.label) && !question.answer.includes(option.label)
        }"
        @click="toggleOption(option.label)"
        :disabled="submitted || batchMode"
      >
        <span class="option-checkbox"></span>
        <span class="option-label-text">{{ option.label }}</span>
        <span class="option-text">{{ option.text }}</span>
        <span v-if="submitted && question.answer.includes(option.label)" class="option-icon correct-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
        </span>
        <span v-if="submitted && selectedAnswers.includes(option.label) && !question.answer.includes(option.label)" class="option-icon incorrect-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </span>
      </button>
    </div>

    <button
      v-if="!submitted && !batchMode"
      class="btn btn-primary submit-btn"
      :disabled="selectedAnswers.length === 0"
      @click="submitAnswer"
    >
      提交答案
    </button>
    <button
      v-if="batchMode && !submitted"
      class="btn btn-danger-solid submit-btn"
      :disabled="!isSelected"
      @click="handleBatchDelete"
    >
      删除
    </button>

    <div v-if="submitted && question.explanation" class="explanation animate-fadeIn">
      <div class="explanation-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
        <span>解析</span>
      </div>
      <p>{{ question.explanation }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useFavoriteStore } from '../stores/favorite.js'
import { useQuizStore } from '../stores/quiz.js'
import { useBankStore } from '../stores/bank.js'
import { burstConfetti } from '../utils/confetti.js'

const props = defineProps({
  question: { type: Object, required: true },
  mode: { type: String, default: 'practice' },
  batchMode: { type: Boolean, default: false }
})

const emit = defineEmits(['answer', 'select'])

const favoriteStore = useFavoriteStore()
const quizStore = useQuizStore()
const bankStore = useBankStore()

const selectedAnswers = ref([])
const submitted = ref(false)
const favBtnRef = ref(null)
const favAnim = ref(false)

const isFav = computed(() => {
  return favoriteStore.isFavorited(quizStore.bankId, props.question.id)
})

const isSelected = computed(() => {
  return quizStore.selectedQuestionIds.includes(props.question.id)
})

function toggleSelect() {
  quizStore.toggleQuestionSelection(props.question.id)
  emit('select', props.question.id)
}

async function toggleFav() {
  if (favBtnRef.value) {
    const rect = favBtnRef.value.getBoundingClientRect()
    burstConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2)
  }
  favAnim.value = true
  const bank = bankStore.allBanks.find(b => String(b.id) === String(quizStore.bankId))
  await favoriteStore.toggleFavorite(
    quizStore.bankId,
    props.question.id,
    bank?.name || '未知题库',
    props.question
  )
  setTimeout(() => { favAnim.value = false }, 500)
}

onMounted(() => {
  favoriteStore.load()
})

watch(() => props.question.id, () => {
  selectedAnswers.value = []
  submitted.value = false
}, { immediate: true })

function toggleOption(label) {
  if (submitted.value) return
  const idx = selectedAnswers.value.indexOf(label)
  if (idx > -1) {
    selectedAnswers.value.splice(idx, 1)
  } else {
    selectedAnswers.value.push(label)
  }
  emit('answer', [...selectedAnswers.value].sort())
}

function submitAnswer() {
  if (selectedAnswers.value.length > 0) {
    submitted.value = true
    quizStore.markSubmitted(props.question.id)
    emit('answer', [...selectedAnswers.value].sort())
  }
}

function handleBatchDelete() {
  quizStore.removeSelectedQuestions()
}
</script>

<style scoped>
.single-choice {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.question-badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.question-text {
  font-size: 1.1rem;
  font-weight: 500;
  line-height: 1.8;
  color: var(--text-primary);
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.option-label-text {
  font-weight: 600;
  font-size: 0.9rem;
  min-width: 20px;
  color: var(--text-secondary);
}

.option-item.selected .option-label-text,
.option-item.correct .option-label-text,
.option-item.incorrect .option-label-text {
  color: inherit;
}

.submit-btn {
  align-self: center;
  min-width: 160px;
  margin-top: 0.5rem;
  width: 100%;
  max-width: 200px;
}

.explanation {
  padding: 1rem;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-md);
}

.explanation-header {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
  color: var(--accent-primary);
  font-weight: 600;
  font-size: 0.85rem;
}

.explanation p {
  color: var(--text-secondary);
  line-height: 1.7;
  font-size: 0.9rem;
}
</style>