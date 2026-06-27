<template>
  <div class="essay-question">
    <div class="question-header">
      <div class="question-badges">
        <span class="badge badge-accent">简答题</span>
        <span class="text-muted text-sm">{{ question.score || 5 }}分</span>
      </div>
    </div>

    <h3 class="question-text">{{ question.question }}</h3>

    <div class="essay-input-area">
      <textarea
        v-if="!submitted"
        v-model="userAnswer"
        class="essay-textarea"
        placeholder="请输入你的答案..."
        rows="6"
      ></textarea>
      <div v-else class="user-answer-box">
        <div class="answer-label">你的答案</div>
        <div class="answer-content">{{ userAnswer || '（未填写）' }}</div>
      </div>
    </div>

    <button
      v-if="!submitted"
      class="btn btn-primary submit-btn"
      :disabled="!userAnswer.trim()"
      @click="submitAnswer"
    >
      提交答案
    </button>

    <div v-if="submitted" class="reference-answer animate-fadeIn">
      <div class="reference-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
        </svg>
        <span>参考答案</span>
      </div>
      <p class="reference-content">{{ question.answer }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  question: { type: Object, required: true },
  mode: { type: String, default: 'practice' },
  initialAnswer: { type: String, default: '' }
})

const emit = defineEmits(['answer'])

const userAnswer = ref('')
const submitted = ref(false)

watch(() => props.question.id, () => {
  userAnswer.value = props.initialAnswer || ''
  submitted.value = !!props.initialAnswer
}, { immediate: true })

// 简答题输入时实时同步到 quizStore（虽然不算错题，但记录作答内容）
watch(userAnswer, (val) => {
  emit('answer', val)
})

function submitAnswer() {
  if (userAnswer.value.trim()) {
    submitted.value = true
    emit('answer', userAnswer.value.trim())
  }
}
</script>

<style scoped>
.essay-question {
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

.essay-input-area {
  width: 100%;
}

.essay-textarea {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 0.95rem;
  line-height: 1.7;
  resize: vertical;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.essay-textarea:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.essay-textarea::placeholder {
  color: var(--text-muted);
}

.user-answer-box {
  padding: 1rem;
  background: var(--bg-surface-raised);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.answer-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.5rem;
}

.answer-content {
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.submit-btn {
  align-self: center;
  min-width: 160px;
  margin-top: 0.5rem;
}

.reference-answer {
  padding: 1rem;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-md);
}

.reference-header {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
  color: var(--accent-primary);
  font-weight: 600;
  font-size: 0.85rem;
}

.reference-content {
  color: var(--text-secondary);
  line-height: 1.7;
  font-size: 0.9rem;
  white-space: pre-wrap;
}
</style>
