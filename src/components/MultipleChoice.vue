<template>
  <div class="single-choice">
    <div class="question-header">
      <div class="question-badges">
        <span class="badge badge-accent">多选题</span>
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
          selected: selectedAnswers.includes(option.label) && !submitted,
          correct: submitted && question.answer.includes(option.label),
          incorrect: submitted && selectedAnswers.includes(option.label) && !question.answer.includes(option.label)
        }"
        @click="toggleOption(option.label)"
        :disabled="submitted"
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
      v-if="!submitted"
      class="btn btn-primary submit-btn"
      :disabled="selectedAnswers.length === 0"
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
import { ref, watch } from 'vue'

const props = defineProps({
  question: { type: Object, required: true },
  mode: { type: String, default: 'practice' }
})

const emit = defineEmits(['answer'])

const selectedAnswers = ref([])
const submitted = ref(false)

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
  // 实时同步答题状态，让 quizStore 立即记录错题
  emit('answer', [...selectedAnswers.value].sort())
}

function submitAnswer() {
  if (selectedAnswers.value.length > 0) {
    submitted.value = true
    emit('answer', [...selectedAnswers.value].sort())
  }
}
</script>
