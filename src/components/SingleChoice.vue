<template>
  <div class="single-choice">
    <div class="question-header">
      <div class="question-badges">
        <span class="badge badge-accent">单选题</span>
        <span class="text-muted text-sm">{{ question.score || 2 }}分</span>
      </div>
    </div>

    <h3 class="question-text">{{ question.question }}</h3>

    <div class="options-list">
      <button
        v-for="option in question.options"
        :key="option.label"
        class="option-item"
        :class="{
          selected: selectedAnswer === option.label && !submitted,
          correct: submitted && option.label === question.answer,
          incorrect: submitted && selectedAnswer === option.label && option.label !== question.answer
        }"
        @click="selectOption(option.label)"
        :disabled="submitted"
      >
        <span class="option-dot"></span>
        <span class="option-label-text">{{ option.label }}</span>
        <span class="option-text">{{ option.text }}</span>
        <span v-if="submitted && option.label === question.answer" class="option-icon correct-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
        </span>
        <span v-if="submitted && selectedAnswer === option.label && option.label !== question.answer" class="option-icon incorrect-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </span>
      </button>
    </div>

    <button
      v-if="!submitted"
      class="btn btn-primary submit-btn"
      :disabled="!selectedAnswer"
      @click="submitAnswer"
      style="display: inline-flex !important; visibility: visible !important; opacity: 1 !important;"
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
import { ref, watch } from 'vue'

const props = defineProps({
  question: { type: Object, required: true },
  mode: { type: String, default: 'practice' }
})

const emit = defineEmits(['answer'])

const selectedAnswer = ref(null)
const submitted = ref(false)

// Reset when question changes
watch(() => props.question.id, () => {
  selectedAnswer.value = null
  submitted.value = false
}, { immediate: true })

function selectOption(label) {
  if (!submitted.value) {
    selectedAnswer.value = label
    // 实时将答案同步到 quizStore，确保"完成答题"或"下一题"时能记录错题
    emit('answer', label)
  }
}

function submitAnswer() {
  if (selectedAnswer.value) {
    submitted.value = true
    emit('answer', selectedAnswer.value)
  }
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
  display: inline-flex !important;
  visibility: visible !important;
  opacity: 1 !important;
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
