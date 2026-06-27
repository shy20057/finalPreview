<template>
  <button class="wrong-card" :class="{ mastered: isMastered }" @click="$emit('click', entry)">
    <div class="card-left">
      <span class="type-badge" :class="`type-${entry.type}`">{{ typeLabel(entry.type) }}</span>
      <span class="subject-tag text-muted">{{ entry.subject }}</span>
      <span class="question-text">{{ truncated }}</span>
    </div>
    <div class="card-right">
      <span v-if="entry.wrongCount > 1" class="wrong-count" :title="`累计答错 ${entry.wrongCount} 次`">
        错 {{ entry.wrongCount }} 次
      </span>
      <span class="last-date text-muted">{{ formatDate(entry.lastWrongAt) }}</span>
      <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9,18 15,12 9,6"/>
      </svg>
    </div>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useWrongBookStore } from '../../stores/wrongBook.js'

const props = defineProps({
  entry: { type: Object, required: true },
})
defineEmits(['click'])

const wrongBook = useWrongBookStore()
const isMastered = computed(() => wrongBook.isEntryMastered(props.entry.key) === true)

const TYPE_LABELS = { single: '单选', multi: '多选', fill: '填空', essay: '简答' }
const TYPE_LIMIT = 80

function typeLabel(type) {
  return TYPE_LABELS[type] || '其他'
}

const truncated = computed(() => {
  const q = props.entry.question || ''
  return q.length > TYPE_LIMIT ? q.slice(0, TYPE_LIMIT) + '…' : q
})

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.wrong-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 0.875rem 1.125rem;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: var(--radius-md);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
}

/* 深色主题 */
.wrong-card {
  background: rgba(20, 22, 38, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* 浅色主题 */
[data-theme="light"] .wrong-card {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.55);
}

.wrong-card:hover {
  border-color: var(--accent-border);
}

[data-theme="light"] .wrong-card:hover {
  background: rgba(255, 255, 255, 0.88);
}

.wrong-card.mastered {
  opacity: 0.65;
}

.card-left {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex: 1;
  min-width: 0;
}

.type-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-primary);
  border: 1px solid var(--accent-border);
  white-space: nowrap;
  flex-shrink: 0;
}

.type-badge.type-fill {
  background: var(--success-soft);
  color: var(--success);
  border-color: var(--success-border);
}
.type-badge.type-essay {
  background: rgba(234, 179, 8, 0.12);
  color: #b45309;
  border-color: rgba(234, 179, 8, 0.3);
}

.subject-tag {
  font-size: 0.78rem;
  flex-shrink: 0;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.question-text {
  flex: 1;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.card-right {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-shrink: 0;
}

.wrong-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--error);
  background: var(--error-soft);
  border: 1px solid var(--error-border);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.last-date {
  font-size: 0.78rem;
}

.chevron {
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .wrong-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem;
  }
  .card-left {
    flex-wrap: wrap;
    gap: 0.375rem;
  }
  .card-right {
    align-self: flex-end;
  }
  .question-text {
    white-space: normal;
    -webkit-line-clamp: 2;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
</style>
