<template>
  <AppShell>
  <view class="quiz-notes-view">
    <view class="page-header">
      <view class="web-h1">练习笔记</view>
      <view class="header-actions">
        <text class="text-muted">共 {{ filteredNotes.length }} 条笔记</text>
        <button
          v-if="notes.length > 0 && !selectionMode"
          class="web-button btn btn-ghost btn-sm"
          @click="enterSelectionMode"
        >批量管理</button>
      </view>
    </view>

    <ViewTransition name="batch-bar">
      <view v-if="selectionMode" class="batch-bar">
        <text>已选 <text class="web-strong">{{ selectedCount }}</text> 条</text>
        <view class="batch-actions">
          <button class="web-button btn btn-ghost btn-sm" :disabled="filteredNotes.length === 0" @click="toggleSelectAllVisible">
            {{ allVisibleSelected ? '取消全选' : '全选当前' }}
          </button>
          <button class="web-button btn btn-ghost btn-sm" :disabled="selectedCount === 0" @click="clearSelection">取消选择</button>
          <button class="web-button btn btn-danger-outline btn-sm" :disabled="selectedCount === 0 || deleting" @click="requestBatchDelete">
            {{ deleting ? '删除中...' : '删除选中' }}
          </button>
          <button class="web-button btn btn-secondary btn-sm" :disabled="deleting" @click="exitSelectionMode">退出批量管理</button>
        </view>
      </view>
    </ViewTransition>

    <view v-if="batchError" class="batch-error">{{ batchError }}</view>

    <!-- 搜索和筛选 -->
    <view class="filter-bar">
      <view class="search-box">
        <AppIcon name="i86163e22" :size="16" />
        <input
          v-model="searchText"
          type="text"
          placeholder="搜索题目或笔记内容..."
        />
      </view>
      <picker class="filter-select" :range="['全部题库', ...bankNames]" :value="Math.max(0, bankNames.indexOf(filterBank) + 1)" @change="filterBank = Number($event.detail.value) === 0 ? '' : bankNames[Number($event.detail.value) - 1]">
        <view>{{ filterBank || '全部题库' }}</view>
      </picker>
    </view>

    <!-- 空状态 -->
    <view v-if="notes.length === 0" class="empty-state card">
      <AppIcon name="if0e98624" :size="48" class="text-muted" />
      <view class="web-p text-muted">暂无练习笔记</view>
      <view class="web-p text-muted text-sm">答题时在右侧面板记录笔记，将在此处统一展示</view>
      <RouteLink to="/banks" class="btn btn-primary">去答题</RouteLink>
    </view>

    <!-- 搜索无结果 -->
    <view v-else-if="filteredNotes.length === 0" class="empty-state card">
      <AppIcon name="i29be70fb" :size="48" class="text-muted" />
      <view class="web-p text-muted">没有找到匹配的笔记</view>
    </view>

    <!-- 按题库分组展示 -->
    <view v-else class="notes-groups">
      <view
        v-for="(group, bankName) in groupedNotes"
        :key="bankName"
        class="note-group"
      >
        <view class="group-header" @click="toggleGroup(bankName)">
          <view class="group-left">
            <AppIcon name="i6b566d5e" :size="14" class="collapse-icon" :class="{ collapsed: !expandedGroups[bankName] }" />
            <AppIcon name="ic562aa1f" :size="14" />
            <text class="group-title">{{ bankName }}</text>
          </view>
          <text class="group-count">{{ group.length }} 条</text>
        </view>

        <view v-show="expandedGroups[bankName]" class="group-list">
          <view
            v-for="note in group"
            :key="note.id"
            class="note-card card"
          >
            <view class="note-card-header">
              <view class="note-meta">
                <button
                  v-if="selectionMode"
                  class="web-button note-checkbox"
                  :class="{ selected: selectedIds.has(note.id) }"
                  :aria-label="selectedIds.has(note.id) ? '取消选择该笔记' : '选择该笔记'"
                  @click="toggleNote(note.id)"
                >
                  <AppIcon name="i5693636f" :size="14" v-if="selectedIds.has(note.id)" />
                </button>
                <text class="badge" :class="typeBadgeClass(note.question)">
                  {{ typeLabel(note.question) }}
                </text>
                <text class="text-muted text-xs">第 {{ note.questionId }} 题</text>
              </view>
              <view class="note-actions">
                <text class="text-muted text-xs">{{ formatDate(note.updatedAt) }}</text>
                <button class="web-button icon-btn danger" @click="handleDelete(note)" title="删除笔记">
                  <AppIcon name="i8c16f120" :size="14" />
                </button>
              </view>
            </view>

            <view class="web-p note-question" v-if="note.question">
              {{ truncate(note.question.question, 100) }}
            </view>
            <view class="web-p note-question" v-else>
              第 {{ note.questionId }} 题（题目信息不可用）
            </view>

            <view class="note-content">
              {{ note.content || '（空笔记）' }}
            </view>

            <RouteLink
              v-if="note.bankId"
              :to="`/quiz/${note.bankId}`"
              class="note-link"
            >
              <AppIcon name="ib67bc1f7" :size="12" />
              前往题库
            </RouteLink>
          </view>
        </view>
      </view>
    </view>

    <ConfirmModal
      v-if="showBatchConfirm"
      title="删除选中笔记"
      :message="`确定删除选中的 ${selectedCount} 条练习笔记吗？此操作不可恢复。`"
      confirm-text="删除"
      cancel-text="取消"
      type="danger"
      @confirm="confirmBatchDelete"
      @cancel="showBatchConfirm = false"
    />
  </view>

  </AppShell>
</template>

<script setup>
import { onPageReady } from '../../composables/usePageReady.js'

import { confirmAction, showError } from '../../utils/dialog.js'

import AppShell from '../../components/AppShell.vue'

import { ref, computed, onMounted, reactive } from 'vue'
import { loadQuizNotes, deleteNote, deleteQuizNotes } from '../../utils/api.js'
import { toggleVisibleSelection } from '../../utils/noteSelection.js'
import ConfirmModal from '../../components/ConfirmModal.vue'

const notes = ref([])
const searchText = ref('')
const filterBank = ref('')
const expandedGroups = reactive({})
const selectionMode = ref(false)
const selectedIds = ref(new Set())
const showBatchConfirm = ref(false)
const deleting = ref(false)
const batchError = ref('')

onPageReady(async () => {
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

const selectedCount = computed(() => selectedIds.value.size)
const allVisibleSelected = computed(() => {
  return filteredNotes.value.length > 0 && filteredNotes.value.every(note => selectedIds.value.has(note.id))
})

function enterSelectionMode() {
  selectionMode.value = true
  batchError.value = ''
}

function exitSelectionMode() {
  selectionMode.value = false
  selectedIds.value = new Set()
  showBatchConfirm.value = false
  batchError.value = ''
}

function toggleNote(id) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function toggleSelectAllVisible() {
  selectedIds.value = toggleVisibleSelection(
    selectedIds.value,
    filteredNotes.value.map(note => note.id),
  )
}

function clearSelection() {
  selectedIds.value = new Set()
}

function requestBatchDelete() {
  if (selectedCount.value === 0) return
  showBatchConfirm.value = true
}

async function confirmBatchDelete() {
  if (selectedCount.value === 0 || deleting.value) return
  deleting.value = true
  batchError.value = ''
  const ids = [...selectedIds.value]
  try {
    await deleteQuizNotes(ids)
    const deletedIds = new Set(ids)
    notes.value = notes.value.filter(note => !deletedIds.has(note.id))
    exitSelectionMode()
  } catch (e) {
    showBatchConfirm.value = false
    batchError.value = '删除失败：' + e.message
  } finally {
    deleting.value = false
  }
}

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
  if (!await confirmAction('确定删除该笔记吗？')) return
  try {
    await deleteNote(note.bankId, note.questionId)
    notes.value = notes.value.filter(n => n.id !== note.id)
  } catch (e) {
    showError(e, '删除失败')
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

.page-header .web-h1 {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.header-actions,
.batch-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.batch-error {
  padding: 0.75rem 1rem;
  color: var(--error);
  background: var(--error-soft);
  border: 1px solid var(--error-border);
  border-radius: var(--radius-md);
}

.batch-bar-enter-active,
.batch-bar-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.batch-bar-enter-from,
.batch-bar-leave-to {
  opacity: 0;
  transform: translateY(-6px);
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

.search-box .app-icon {
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

.note-checkbox {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
  background: transparent;
  border: 2px solid var(--border-color);
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.note-checkbox:hover {
  border-color: var(--accent-primary);
}

.note-checkbox.selected {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
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
  .page-header,
  .batch-bar {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-actions,
  .batch-actions {
    width: 100%;
    flex-wrap: wrap;
  }

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
