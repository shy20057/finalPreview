<template>
  <aside class="wrong-sidebar">
    <!-- 学科 -->
    <section class="filter-group">
      <h3 class="filter-title">学科</h3>
      <label class="filter-row all">
        <input
          type="checkbox"
          :checked="wrongBook.isSubjectChecked('全部')"
          @change="wrongBook.toggleSubject('全部')"
        />
        <span class="filter-label">全部</span>
      </label>
      <label
        v-for="subject in wrongBook.availableSubjects"
        :key="subject"
        class="filter-row"
      >
        <input
          type="checkbox"
          :checked="wrongBook.isSubjectChecked(subject)"
          @change="wrongBook.toggleSubject(subject)"
        />
        <span class="filter-label">{{ subject }}</span>
        <span class="filter-count text-muted">{{ wrongBook.counts.bySubject[subject] || 0 }}</span>
      </label>
    </section>

    <!-- 题型 -->
    <section class="filter-group">
      <h3 class="filter-title">题型</h3>
      <label v-for="t in TYPES" :key="t.value" class="filter-row">
        <input
          type="checkbox"
          :checked="wrongBook.selectedTypes.includes(t.value)"
          @change="toggleType(t.value)"
        />
        <span class="filter-label">{{ t.label }}</span>
        <span class="filter-count text-muted">{{ wrongBook.counts.byType[t.value] || 0 }}</span>
      </label>
    </section>

    <!-- 状态 -->
    <section class="filter-group">
      <h3 class="filter-title">状态</h3>
      <label class="filter-row">
        <input
          type="checkbox"
          :checked="wrongBook.selectedStatuses.includes('unmastered')"
          @change="toggleStatus('unmastered')"
        />
        <span class="filter-label">未掌握</span>
        <span class="filter-count text-muted">{{ wrongBook.counts.unmastered }}</span>
      </label>
      <label class="filter-row">
        <input
          type="checkbox"
          :checked="wrongBook.selectedStatuses.includes('mastered')"
          @change="toggleStatus('mastered')"
        />
        <span class="filter-label">已掌握</span>
        <span class="filter-count text-muted">{{ wrongBook.counts.mastered }}</span>
      </label>
    </section>
  </aside>
</template>

<script setup>
import { useWrongBookStore } from '../../stores/wrongBook.js'

const wrongBook = useWrongBookStore()

const TYPES = [
  { value: 'single', label: '单选' },
  { value: 'multi', label: '多选' },
  { value: 'fill', label: '填空' },
  { value: 'essay', label: '简答' },
]

function toggleType(t) {
  const set = new Set(wrongBook.selectedTypes)
  if (set.has(t)) set.delete(t)
  else set.add(t)
  wrongBook.selectedTypes = Array.from(set)
}

function toggleStatus(s) {
  const set = new Set(wrongBook.selectedStatuses)
  if (set.has(s)) set.delete(s)
  else set.add(s)
  wrongBook.selectedStatuses = Array.from(set)
}
</script>

<style scoped>
.wrong-sidebar {
  width: 240px;
  flex-shrink: 0;
  padding: 1rem;
  backdrop-filter: blur(14px) saturate(150%);
  -webkit-backdrop-filter: blur(14px) saturate(150%);
  border-radius: var(--radius-xl);
  align-self: flex-start;
  position: sticky;
  top: 1rem;
  max-height: calc(100vh - 5rem);
  overflow-y: auto;
}

/* 深色主题：深色半透明，让星空透出来 */
.wrong-sidebar {
  background: rgba(20, 22, 38, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

/* 浅色主题：白色半透明，让向日葵透出来 */
[data-theme="light"] .wrong-sidebar {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.filter-group + .filter-group {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border-color);
}

.filter-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.625rem;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.4rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.88rem;
  transition: background 0.12s ease;
}

.filter-row:hover {
  background: var(--bg-surface-raised);
}

[data-theme="light"] .filter-row:hover {
  background: rgba(0, 0, 0, 0.05);
}

.filter-row input[type="checkbox"] {
  accent-color: var(--accent-primary);
  cursor: pointer;
}

.filter-row.all .filter-label {
  font-weight: 600;
}

.filter-label {
  flex: 1;
  color: var(--text-primary);
}

.filter-count {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 1023px) {
  .wrong-sidebar {
    display: none;
  }
}
</style>
