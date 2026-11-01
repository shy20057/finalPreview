<!-- mobile/components/MultipleChoice.vue -->
<!-- Port of src/components/MultipleChoice.vue — App-Vue 端（详见 mobile/PORTING.md） -->
<template>
  <view class="single-choice">
    <view class="question-header">
      <view class="question-badges">
        <text class="badge badge-accent">多选题</text>
        <text class="text-muted text-sm">{{ question.score || 2 }}分</text>
      </view>
      <view
        v-if="!batchMode"
        class="favorite-btn"
        :class="{ favorited: isFav, toggling: favAnim }"
        @click.stop="toggleFav"
        :title="isFav ? '取消收藏' : '收藏题目'"
      >
        <AppIcon name="i1147612b" :size="18" :fill="isFav ? 'currentColor' : 'none'" />
      </view>
      <view
        v-else
        class="batch-checkbox"
        :class="{ selected: isSelected }"
        @click.stop="toggleSelect"
      >
        <AppIcon name="i9d758b40" :size="14" v-if="isSelected" />
      </view>
    </view>

    <text class="question-text">{{ question.question }}</text>

    <view class="options-list">
      <view
        v-for="option in question.options"
        :key="option.label"
        class="option-item"
        :class="{
          selected: selectedAnswers.includes(option.label) && !submitted,
          correct: submitted && question.answer.includes(option.label),
          incorrect: submitted && selectedAnswers.includes(option.label) && !question.answer.includes(option.label)
        }"
        @click="toggleOption(option.label)"
      >
        <text class="option-checkbox"></text>
        <text class="option-label-text">{{ option.label }}</text>
        <text class="option-text">{{ option.text }}</text>
        <text v-if="submitted && question.answer.includes(option.label)" class="option-icon correct-icon">
          <AppIcon name="i36ca5d1a" :size="18" />
        </text>
        <text v-if="submitted && selectedAnswers.includes(option.label) && !question.answer.includes(option.label)" class="option-icon incorrect-icon">
          <AppIcon name="i9899d249" :size="18" />
        </text>
      </view>
    </view>

    <view
      v-if="!submitted && !batchMode"
      class="btn btn-primary submit-btn"
      :style="{ opacity: selectedAnswers.length === 0 ? 0.4 : 1 }"
      @click="submitAnswer"
    >
      提交答案
    </view>
    <view
      v-if="batchMode && !submitted"
      class="btn btn-danger-solid submit-btn"
      :style="{ opacity: isSelected ? 1 : 0.4 }"
      @click="handleBatchDelete"
    >
      删除
    </view>

    <view v-if="submitted && question.explanation" class="explanation animate-fadeIn">
      <view class="explanation-header">
        <AppIcon name="ib3fbd7e5" :size="16" />
        <text>解析</text>
      </view>
      <text>{{ question.explanation }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted, getCurrentInstance } from 'vue'
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
const favAnim = ref(false)

// App 端没有 DOM，用 SelectorQuery 取代 el.getBoundingClientRect()
const scope = getCurrentInstance()?.proxy

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
  const query = uni.createSelectorQuery()
  if (scope) query.in(scope)
  query
    .select('.favorite-btn')
    .boundingClientRect(rect => {
      if (rect) burstConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2)
    })
    .exec()
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
  selectedAnswers.value = [...(quizStore.answers[props.question.id] || [])]
  submitted.value = quizStore.isSubmitted(props.question.id)
}, { immediate: true })

function toggleOption(label) {
  if (submitted.value || props.batchMode) return
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
  if (!isSelected.value) return
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

.explanation text {
  color: var(--text-secondary);
  line-height: 1.7;
  font-size: 0.9rem;
}
</style>
