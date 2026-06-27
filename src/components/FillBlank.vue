<template>
  <div class="fill-blank">
    <div class="question-header">
      <div class="question-badges">
        <span class="badge badge-success">填空题</span>
        <span class="text-muted text-sm">{{ question.score || 2 }}分</span>
      </div>
    </div>

    <h3 class="question-text">{{ question.question }}</h3>

    <div class="blanks-list">
      <div
        v-for="(blank, index) in blankCount"
        :key="index"
        class="blank-item"
        :class="{
          correct: submitted && isBlankCorrect(index),
          incorrect: submitted && !isBlankCorrect(index) && userAnswers[index]
        }"
      >
        <div class="blank-row">
          <span class="blank-number">{{ index + 1 }}</span>
          <div class="input-wrapper">
            <input
              type="text"
              v-model="userAnswers[index]"
              :disabled="submitted"
              :placeholder="submitted ? '' : '请输入答案'"
              class="input blank-input"
              @keydown.enter="handleEnter(index)"
              :ref="el => blankInputs[index] = el"
            />
            <span v-if="submitted" class="blank-status">
              <svg v-if="isBlankCorrect(index)" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </span>
          </div>
        </div>
        <span v-if="submitted && !isBlankCorrect(index)" class="correct-answer">
          正确答案: {{ question.answer[index] }}
        </span>
      </div>
    </div>

    <button
      v-if="!submitted"
      class="btn btn-primary submit-btn"
      :disabled="!allFilled"
      @click="submitAnswer"
    >
      提交答案
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
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  question: { type: Object, required: true },
  mode: { type: String, default: 'practice' }
})

const emit = defineEmits(['answer'])

const submitted = ref(false)
const userAnswers = ref([])
const blankInputs = ref([])

const blankCount = computed(() => props.question.blanks || 1)

watch(() => props.question.id, () => {
  userAnswers.value = Array(blankCount.value).fill('')
  submitted.value = false
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
      blankInputs.value[index + 1]?.focus()
    })
  } else if (allFilled.value) {
    submitAnswer()
  }
}

function submitAnswer() {
  if (allFilled.value) {
    submitted.value = true
    emit('answer', [...userAnswers.value])
  }
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

.explanation p {
  color: var(--text-secondary);
  line-height: 1.7;
  font-size: 0.9rem;
}
</style>
