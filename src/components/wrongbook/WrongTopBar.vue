<template>
  <div class="wrong-topbar">
    <input
      type="search"
      class="search-input"
      :value="wrongBook.keyword"
      @input="onInput"
      placeholder="搜索题干关键词..."
    />
    <div class="sort-control">
      <label class="text-muted sort-label">排序</label>
      <select :value="wrongBook.sortBy" @change="onSortChange" class="sort-select">
        <option value="lastWrongAt">最近答错</option>
        <option value="wrongCount">答错次数</option>
        <option value="firstWrongAt">首次答错</option>
      </select>
    </div>
    <button class="btn btn-sm btn-secondary" @click="exportMarkdown" :disabled="wrongBook.filteredEntries.length === 0">
      导出
    </button>
  </div>
</template>

<script setup>
import { useWrongBookStore } from '../../stores/wrongBook.js'

const wrongBook = useWrongBookStore()

function onInput(e) {
  wrongBook.keyword = e.target.value
}

function onSortChange(e) {
  wrongBook.sortBy = e.target.value
}

function exportMarkdown() {
  const lines = ['# 错题汇总', '']
  for (const e of wrongBook.filteredEntries) {
    lines.push(`## [${e.subject}] 第 ${e.id} 题`)
    lines.push('')
    lines.push(`**题型**：${typeLabel(e.type)}`)
    lines.push('')
    lines.push(`**题目**：${e.question}`)
    lines.push('')
    if (e.options && e.options.length) {
      for (const opt of e.options) lines.push(`- ${opt.label}. ${opt.text}`)
      lines.push('')
    }
    lines.push(`**正确答案**：${formatAnswer(e.answer)}`)
    lines.push('')
    lines.push(`**答错次数**：${e.wrongCount}`)
    lines.push('')
    lines.push('---')
    lines.push('')
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wrong-questions-${new Date().toISOString().slice(0, 10)}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function typeLabel(t) {
  return { single: '单选', multi: '多选', fill: '填空', essay: '简答' }[t] || t
}

function formatAnswer(a) {
  if (Array.isArray(a)) return a.join(' / ')
  return String(a ?? '')
}
</script>

<style scoped>
.wrong-topbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
}

.search-input {
  flex: 1;
  padding: 0.55rem 0.875rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.search-input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.sort-control {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.sort-label {
  font-size: 0.8rem;
  white-space: nowrap;
}

.sort-select {
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  outline: none;
}

.sort-select:focus {
  border-color: var(--accent-primary);
}
</style>
