<template>
  <div class="quiz-notes-view">
    <div class="page-header">
      <h1>练习笔记</h1>
      <span class="text-muted">共 {{ filteredNotes.length }} 条笔记</span>
    </div>

    <!-- 搜索和筛选 -->
    <div class="filter-bar">
      <div class="search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          v-model="searchText"
          type="text"
          placeholder="搜索题目或笔记内容..."
        />
      </div>
      <select v-model="filterBank" class="filter-select">
        <option value="">全部题库</option>
        <option v-for="name in bankNames" :key="name" :value="name">{{ name }}</option>
      </select>
    </div>

    <!-- 空状态 -->
    <div v-if="notes.length === 0" class="empty-state card">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
      <p class="text-muted">暂无练习笔记</p>
      <p class="text-muted text-sm">答题时在右侧面板记录笔记，将在此处统一展示</p>
      <router-link to="/banks" class="btn btn-primary">去答题</router-link>
    </div>

    <!-- 搜索无结果 -->
    <div v-else-if="filteredNotes.length === 0" class="empty-state card">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <p class="text-muted">没有找到匹配的笔记</p>
    </div>

    <!-- 按题库分组展示 -->
    <div v-else class="notes-groups">
      <div
        v-for="(group, bankName) in groupedNotes"
        :key="bankName"
        class="note-group"
      >
        <div class="group-header" @click="toggleGroup(bankName)">
          <div class="group-left">
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              class="collapse-icon"
              :class="{ collapsed: !expandedGroups[bankName] }"
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <span class="group-title">{{ bankName }}</span>
          </div>
          <span class="group-count">{{ group.length }} 条</span>
        </div>

        <div v-show="expandedGroups[bankName]" class="group-list">
          <div
            v-for="note in group"
            :key="note.id"
            class="note-card card"
          >
            <div class="note-card-header">
              <div class="note-meta">
                <span class="badge" :class="typeBadgeClass(note.question)">
                  {{ typeLabel(note.question) }}
                </span>
                <span class="text-muted text-xs">第 {{ note.questionId }} 题</span>
              </div>
              <div class="note-actions">
                <span class="text-muted text-xs">{{ formatDate(note.updatedAt) }}</span>
                <button class="icon-btn danger" @click="handleDelete(note)" title="删除笔记">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>

            <p class="note-question" v-if="note.question">
              {{ truncate(note.question.question, 100) }}
            </p>
            <p class="note-question" v-else>
              第 {{ note.questionId }} 题（题目信息不可用）
            </p>

            <div class="note-content">
              {{ note.content || '（空笔记）' }}
            </div>

            <router-link
              v-if="note.bankId"
              :to="`/quiz/${note.bankId}`"
              class="note-link"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              前往题库
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { loadQuizNotes, deleteNote } from '../utils/api.js'

const notes = ref([])
const searchText = ref('')
const filterBank = ref('')
const expandedGroups = reactive({})

onMounted(async () => {
  try {
    const data = await loadQuizNotes()
    notes.value = data
    // 默认展开所有分组
    for (const n of data) {
      expandedGroups[n.bankName] = true
    }
  } catch (e) {
    console.error('加载练习笔记失败', e)
  }
})

const bankNames = computed(() => {
  const set = new Set(notes.value.map(n => n.bankName))
  return [...set].sort()
})

const filteredNotes = computed(() => {
  let list = notes.value
  if (filterBank.value) {
    list = list.filter(n => n.bankName === filterBank.value)
  }
  if (searchText.value.trim()) {
    const kw = searchText.value.trim().toLowerCase()
    list = list.filter(n => {
      const qMatch = n.question?.question?.toLowerCase().includes(kw)
      const cMatch = n.content?.toLowerCase().includes(kw)
      return qMatch || cMatch
    })
  }
  return list
})

const groupedNotes = computed(() => {
  const groups = {}
  for (const n of filteredNotes.value) {
    const key = n.bankName || '未知题库'
    if (!groups[key]) groups[key] = []
    groups[key].push(n)
  }
  return groups
})

function toggleGroup(bankName) {
  expandedGroups[bankName] = !expandedGroups[bankName]
}

function typeLabel(q) {
  if (!q) return '未知'
  if (q.type === 'single') return '单选'
  if (q.type === 'multi') return '多选'
  if (q.type === 'fill') return '填空'
  if (q.type === 'essay') return '简答'
  return '其他'
}

function typeBadgeClass(q) {
  if (!q) return 'badge-muted'
  if (q.type === 'single') return 'badge-primary'
  if (q.type === 'multi') return 'badge-accent'
  if (q.type === 'fill') return 'badge-warning'
  if (q.type === 'essay') return 'badge-success'
  return 'badge-muted'
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function truncate(str, len) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}

async function handleDelete(note) {
  if (!confirm('确定删除该笔记吗？')) return
  try {
    await deleteNote(note.bankId, note.questionId)
    notes.value = notes.value.filter(n => n.id !== note.id)
  } catch (e) {
    alert('删除失败：' + e.message)
  }
}
</script>

<style scoped>
.quiz-notes-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
}

/* Filter bar */
.filter-bar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: border-color 0.15s ease;
}

.search-box:focus-within {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.search-box svg {
  color: var(--text-muted);
  flex-shrink: 0;
}

.search-box input {
  flex: 1;
  border: none;
  background: none;
  outline: none;
  font-family: inherit;
  font-size: 0.875rem;
  color: var(--text-primary);
}

.search-box input::placeholder {
  color: var(--text-muted);
}

.filter-select {
  padding: 0.5rem 0.75rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: 0.875rem;
  color: var(--text-primary);
  cursor: pointer;
  min-width: 140px;
}

.filter-select:focus {
  outline: none;
  border-color: var(--accent-primary);
}

/* Empty state */
.empty-state {
  padding: 3rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

/* Notes groups */
.notes-groups {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.note-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.625rem 0.75rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s ease;
}

.group-header:hover {
  background: var(--bg-surface-raised);
}

.group-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.collapse-icon {
  transition: transform 0.2s ease;
}

.collapse-icon.collapsed {
  transform: rotate(-90deg);
}

.group-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.group-count {
  font-size: 0.75rem;
  color: var(--text-muted);
  background: var(--bg-surface);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-left: 0.5rem;
}

/* Note card */
.note-card {
  padding: 1rem;
}

.note-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.note-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.note-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.icon-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.icon-btn:hover {
  background: var(--bg-surface);
  color: var(--text-secondary);
}

.icon-btn.danger:hover {
  background: var(--error-soft);
  color: var(--error);
}

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
}

.badge-primary {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
}

.badge-accent {
  background: var(--accent-soft);
  color: var(--accent-primary);
}

.badge-warning {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.badge-success {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

.badge-muted {
  background: var(--bg-surface);
  color: var(--text-muted);
}

.note-question {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.note-content {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.6;
  padding: 0.625rem 0.75rem;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}

.note-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--accent-primary);
  text-decoration: none;
  transition: opacity 0.15s ease;
}

.note-link:hover {
  opacity: 0.8;
}

/* Mobile */
@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
  }

  .filter-select {
    width: 100%;
  }

  .group-list {
    padding-left: 0;
  }
}
</style>
