<!-- mobile/components/EssayQuestion.vue -->
<!-- Port of src/components/EssayQuestion.vue — App-Vue 端（详见 mobile/PORTING.md） -->
<template>
  <view class="essay-question">
    <view class="question-header">
      <view class="question-badges">
        <text class="badge badge-accent">简答题</text>
        <text class="text-muted text-sm">{{ question.score || 5 }}分</text>
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

    <view class="essay-input-area">
      <textarea
        v-if="!submitted && !batchMode"
        v-model="userAnswer"
        class="essay-textarea"
        placeholder="请输入你的答案..."
        placeholder-class="input-placeholder"
        rows="6"
      ></textarea>
      <view v-else-if="!batchMode" class="user-answer-box">
        <view class="answer-label">你的答案</view>
        <view class="answer-content">{{ userAnswer || '（未填写）' }}</view>
      </view>
    </view>

    <view
      v-if="!submitted && !batchMode"
      class="btn btn-primary submit-btn"
      :style="{ opacity: userAnswer.trim() ? 1 : 0.4 }"
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

    <view v-if="submitted" class="reference-answer animate-fadeIn">
      <view class="reference-header">
        <AppIcon name="ib0eda946" :size="16" />
        <text>参考答案</text>
      </view>
      <text class="reference-content">{{ question.answer }}</text>
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
  initialAnswer: { type: String, default: '' },
  batchMode: { type: Boolean, default: false }
})

const emit = defineEmits(['answer', 'select'])

const favoriteStore = useFavoriteStore()
const quizStore = useQuizStore()
const bankStore = useBankStore()

const userAnswer = ref('')
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
  userAnswer.value = props.initialAnswer || ''
  submitted.value = quizStore.isSubmitted(props.question.id)
}, { immediate: true })

// 简答题输入时实时同步到 quizStore（虽然不算错题，但记录作答内容）
watch(userAnswer, (val) => {
  emit('answer', val)
})

function submitAnswer() {
  if (userAnswer.value.trim()) {
    submitted.value = true
    quizStore.markSubmitted(props.question.id)
    emit('answer', userAnswer.value.trim())
  }
}

function handleBatchDelete() {
  if (!isSelected.value) return
  quizStore.removeSelectedQuestions()
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
