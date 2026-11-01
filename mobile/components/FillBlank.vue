<!-- mobile/components/FillBlank.vue -->
<!-- Port of src/components/FillBlank.vue — App-Vue 端（详见 mobile/PORTING.md） -->
<template>
  <view class="fill-blank">
    <view class="question-header">
      <view class="question-badges">
        <text class="badge badge-success">填空题</text>
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

    <view class="blanks-list">
      <view
        v-for="(blank, index) in blankCount"
        :key="index"
        class="blank-item"
        :class="{
          correct: submitted && isBlankCorrect(index),
          incorrect: submitted && !isBlankCorrect(index) && userAnswers[index]
        }"
      >
        <view class="blank-row">
          <text class="blank-number">{{ index + 1 }}</text>
          <view class="input-wrapper">
            <input
              type="text"
              v-model="userAnswers[index]"
              :disabled="submitted || batchMode"
              :placeholder="submitted ? '' : '请输入答案'"
              placeholder-class="input-placeholder"
              class="input blank-input"
              :focus="focusedBlank === index"
              @focus="focusedBlank = index"
              @confirm="handleEnter(index)"
              :ref="el => blankInputs[index] = el"
            />
            <text v-if="submitted" class="blank-status">
              <AppIcon name="i8a95e5be" :size="18" v-if="isBlankCorrect(index)" />
              <AppIcon name="i7ec858e6" :size="18" v-else />
            </text>
          </view>
        </view>
        <text v-if="submitted && !isBlankCorrect(index)" class="correct-answer">
          正确答案: {{ question.answer[index] }}
        </text>
      </view>
    </view>

    <view
      v-if="!submitted && !batchMode"
      class="btn btn-primary submit-btn"
      :style="{ opacity: allFilled ? 1 : 0.4 }"
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
import { ref, computed, watch, nextTick, onMounted, getCurrentInstance } from 'vue'
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

const submitted = ref(false)
const userAnswers = ref([])
const blankInputs = ref([])
const focusedBlank = ref(-1)

const blankCount = computed(() => props.question.blanks || 1)

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
  const saved = quizStore.answers[props.question.id]
  userAnswers.value = Array.from({ length: blankCount.value }, (_, i) => saved?.[i] || '')
  submitted.value = quizStore.isSubmitted(props.question.id)
  blankInputs.value = []
}, { immediate: true })

// 填空题输入时实时同步到 quizStore，确保错题实时记录
watch(userAnswers, (val) => {
  emit('answer', [...val])
}, { deep: true })

const allFilled = computed(() => {
  return userAnswers.value.every(ans => ans && ans.trim() !== '')
})

function isBlankCorrect(index) {
  return userAnswers.value[index]?.trim().toLowerCase() === props.question.answer[index]?.trim().toLowerCase()
}

function handleEnter(index) {
  if (index < blankCount.value - 1) {
    nextTick(() => {
      focusedBlank.value = index + 1
    })
  } else if (allFilled.value) {
    submitAnswer()
  }
}

function submitAnswer() {
  if (allFilled.value) {
    submitted.value = true
    quizStore.markSubmitted(props.question.id)
    emit('answer', [...userAnswers.value])
  }
}

function handleBatchDelete() {
  if (!isSelected.value) return
  quizStore.removeSelectedQuestions()
}
</script>

<style scoped>
.fill-blank {
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

.blanks-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.blank-item {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.875rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-left: 3px solid transparent;
  border-radius: var(--radius-md);
  transition: all 0.15s ease;
}

.blank-item.correct {
  border-left-color: var(--success);
  background: var(--success-soft);
}

.blank-item.incorrect {
  border-left-color: var(--error);
  background: var(--error-soft);
}

.blank-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.blank-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-surface-raised);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.blank-input {
  flex: 1;
  padding: 0.6rem 0.875rem;
}

.blank-status {
  flex-shrink: 0;
  color: var(--text-muted);
}

.blank-item.correct .blank-status {
  color: var(--success);
}

.blank-item.incorrect .blank-status {
  color: var(--error);
}

.correct-answer {
  font-size: 0.8rem;
  color: var(--success);
  font-weight: 500;
  padding-left: 2.25rem;
}

.submit-btn {
  align-self: center;
  min-width: 160px;
  margin-top: 0.5rem;
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
