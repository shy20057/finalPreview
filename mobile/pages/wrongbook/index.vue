<!-- mobile/pages/wrongbook/index.vue -->
<!--
  Port of src/views/WrongBookView.vue
  Deltas: HTML 标签 → uni 组件（div/main/button/h1/p/h3 → view，span/strong → text），
  `<Teleport>` 删除（遮罩层直接内联），`:disabled` → 内联样式（App 端 <view> 无 disabled）。
  业务逻辑、class 名、层级顺序、文案、动画参数保持不变。
-->
<template>
  <AppShell>
    <view class="wrongbook-view">
      <view class="page-header">
        <view class="page-title">错题本</view>
        <view class="header-right">
          <text class="text-muted">共 {{ wrongBook.counts.total }} 道<template v-if="wrongBook.counts.mastered > 0">· 已掌握 {{ wrongBook.counts.mastered }}</template></text>
          <view
            v-if="!wrongBook.selectionMode && wrongBook.filteredEntries.length > 0"
            class="btn btn-ghost btn-sm batch-toggle"
            @click="wrongBook.enterSelectionMode()"
          >
            <AppIcon name="i1dc4534d" :size="14" />
            批量管理
          </view>
        </view>
      </view>

      <!-- 批量操作工具栏 -->
      <ViewTransition name="batch-bar">
        <view v-if="wrongBook.selectionMode" class="batch-bar">
          <view class="batch-info">
            <text class="batch-count">已选 <text>{{ selectedCount }}</text> / {{ wrongBook.filteredEntries.length }} 道</text>
          </view>
          <view class="batch-actions">
            <view class="btn btn-ghost btn-sm" @click="onSelectAll">
              {{ allSelected ? '取消全选' : '全选当前' }}
            </view>
            <view class="btn btn-ghost btn-sm" :style="disabledStyle(selectedCount === 0)" @click="onInvert">
              反选
            </view>
            <view class="btn btn-ghost btn-sm" :style="disabledStyle(selectedCount === 0)" @click="wrongBook.clearSelection()">
              清空选择
            </view>
            <view class="btn btn-secondary btn-sm" :style="disabledStyle(selectedCount === 0 || exporting)" @click="onExportToBank">
              <AppIcon name="ie1abd1f1" :size="14" />
              {{ exporting ? '导出中...' : '导出为题库' }}
            </view>
            <view class="btn btn-danger-outline btn-sm" :style="disabledStyle(selectedCount === 0)" @click="onBatchDelete">
              <AppIcon name="i4ad244a4" :size="14" />
              删除选中
            </view>
            <view class="btn btn-secondary btn-sm batch-cancel" @click="wrongBook.exitSelectionMode()">
              取消
            </view>
          </view>
        </view>
      </ViewTransition>

      <!-- 导出反馈提示 -->
      <ViewTransition name="toast">
        <view v-if="exportSuccess" class="export-toast export-toast--success">
          <AppIcon name="ic8e63dbf" :size="14" />
          导出成功！已创建「{{ exportedBankName }}」
        </view>
      </ViewTransition>
      <ViewTransition name="toast">
        <view v-if="exportError" class="export-toast export-toast--error">{{ exportError }}</view>
      </ViewTransition>

      <view class="wrongbook-layout">
        <WrongSidebar class="sidebar-slot" />

        <view class="wrongbook-main">
          <WrongTopBar class="topbar-slot hide-mobile" />

          <!-- 窄屏顶部筛选条（在 <1024px 显示） -->
          <view class="mobile-filters hide-desktop">
            <view class="filter-scroll">
              <text class="text-muted text-sm filter-scroll-label">学科</text>
              <view
                v-for="s in ['全部', ...wrongBook.availableSubjects]"
                :key="s"
                class="chip"
                :class="{ active: wrongBook.isSubjectChecked(s) }"
                @click="wrongBook.toggleSubject(s)"
              >{{ s }}</view>
            </view>
            <view class="filter-scroll">
              <text class="text-muted text-sm filter-scroll-label">题型</text>
              <view
                v-for="t in ['single','multi','fill','essay']"
                :key="t"
                class="chip"
                :class="{ active: wrongBook.selectedTypes.includes(t) }"
                @click="toggleType(t)"
              >{{ typeLabel(t) }}</view>
            </view>
            <view class="filter-scroll">
              <text class="text-muted text-sm filter-scroll-label">时间</text>
              <view
                v-for="r in wrongBook.TIME_RANGES"
                :key="r.value"
                class="chip"
                :class="{ active: wrongBook.selectedTimeRange === r.value }"
                @click="wrongBook.setTimeRange(r.value)"
              >{{ r.label }}</view>
              <DatePicker
                v-model="wrongBook.customDate"
                placeholder="选择日期"
                class="mobile-date-picker"
                @change="wrongBook.setCustomDate"
              />
            </view>
          </view>

          <view class="results">
            <view v-if="wrongBook.filteredEntries.length === 0" class="empty-wrap">
              <WrongEmptyState
                :message="emptyMessage"
                :show-action="wrongBook.counts.total === 0"
              />
            </view>
            <view v-else class="card-list">
              <WrongCard
                v-for="entry in wrongBook.filteredEntries"
                :key="entry.key"
                :entry="entry"
                :selectable="wrongBook.selectionMode"
                :selected="wrongBook.selectedKeys.has(entry.key)"
                @click="onCardClick"
                @toggle-select="onToggleSelect"
              />
            </view>
          </view>
        </view>
      </view>

      <WrongDetailDrawer />

      <!-- 批量删除确认弹窗 -->
      <ViewTransition name="modal">
        <view v-if="showConfirm" class="modal-overlay" @click.self="cancelDelete">
          <view class="modal-card" role="dialog" aria-modal="true">
            <view class="modal-icon" data-tone="danger">
              <AppIcon name="i4ad244a4" :size="28" />
            </view>
            <view class="modal-title">从错题本移除 {{ pendingDeleteCount }} 道题？</view>
            <view class="modal-desc">
              移除后这些题目将不再出现在错题列表中。原始答题历史记录会保留。
            </view>
            <view class="modal-actions">
              <view class="btn btn-secondary btn-sm" @click="cancelDelete">取消</view>
              <view class="btn btn-danger btn-sm" @click="confirmDelete">确认删除</view>
            </view>
          </view>
        </view>
      </ViewTransition>
    </view>
  </AppShell>
</template>

<script setup>
import { onPageReady } from '../../composables/usePageReady.js'

import { onMounted, computed, ref } from 'vue'
import { useWrongBookStore } from '../../stores/wrongBook.js'
import { useHistoryStore } from '../../stores/history.js'
import { useBankStore } from '../../stores/bank.js'
import WrongSidebar from '../../components/wrongbook/WrongSidebar.vue'
import WrongTopBar from '../../components/wrongbook/WrongTopBar.vue'
import WrongCard from '../../components/wrongbook/WrongCard.vue'
import WrongDetailDrawer from '../../components/wrongbook/WrongDetailDrawer.vue'
import WrongEmptyState from '../../components/wrongbook/WrongEmptyState.vue'
import DatePicker from '../../components/DatePicker.vue'
import AppShell from '../../components/AppShell.vue'

const wrongBook = useWrongBookStore()
const historyStore = useHistoryStore()
const bankStore = useBankStore()

const TYPE_LABELS = { single: '单选', multi: '多选', fill: '填空', essay: '简答' }
function typeLabel(t) { return TYPE_LABELS[t] || t }

// App 端 <view> 没有 :disabled，用内联样式复现原版 `.btn:disabled` 的观感
function disabledStyle(disabled) {
  return disabled ? 'opacity: 0.4; pointer-events: none;' : ''
}

function toggleType(t) {
  const set = new Set(wrongBook.selectedTypes)
  if (set.has(t)) set.delete(t)
  else set.add(t)
  wrongBook.selectedTypes = Array.from(set)
}

function onCardClick(entry) {
  if (wrongBook.selectionMode) return
  wrongBook.openDrawer(entry)
}

function onToggleSelect(key) {
  wrongBook.toggleSelect(key)
}

const selectedCount = computed(() => wrongBook.selectedKeys.size)
const allSelected = computed(() => {
  const total = wrongBook.filteredEntries.length
  return total > 0 && selectedCount.value === total
})

function onSelectAll() {
  if (allSelected.value) {
    wrongBook.clearSelection()
  } else {
    wrongBook.selectAll(wrongBook.filteredEntries.map(e => e.key))
  }
}

function onInvert() {
  if (selectedCount.value === 0) return
  const next = new Set()
  for (const e of wrongBook.filteredEntries) {
    if (!wrongBook.selectedKeys.has(e.key)) next.add(e.key)
  }
  wrongBook.selectedKeys = next
}

// 批量删除二次确认
const showConfirm = ref(false)
const pendingDeleteCount = ref(0)

function onBatchDelete() {
  if (selectedCount.value === 0) return
  pendingDeleteCount.value = selectedCount.value
  showConfirm.value = true
}

function cancelDelete() {
  showConfirm.value = false
}

function confirmDelete() {
  const keys = Array.from(wrongBook.selectedKeys)
  wrongBook.removeEntries(keys)
  showConfirm.value = false
}

const emptyMessage = computed(() => {
  if (wrongBook.counts.total === 0) return '暂无错题，继续加油！'
  if (wrongBook.counts.unmastered === 0 && wrongBook.counts.mastered > 0) {
    return '已掌握全部错题！'
  }
  return '没有匹配的错题'
})

// 导出为题库
const exporting = ref(false)
const exportSuccess = ref(false)
const exportError = ref('')
const exportedBankName = ref('')

async function onExportToBank() {
  if (selectedCount.value === 0 || exporting.value) return
  exporting.value = true
  exportError.value = ''
  try {
    const dateStr = new Date().toISOString().split('T')[0]
    const questions = wrongBook.filteredEntries
      .filter(e => wrongBook.selectedKeys.has(e.key))
      .map(e => ({
        id: e.id,
        type: e.type,
        question: e.question,
        options: e.options,
        blanks: e.blanks,
        answer: e.answer,
        score: e.score,
      }))
    const bankData = {
      name: `错题巩固_${dateStr}`,
      subject: '错题本',
      questions,
    }
    const newBank = await bankStore.addBank(bankData)
    exportedBankName.value = newBank.name
    exportSuccess.value = true
    wrongBook.exitSelectionMode()
    setTimeout(() => { exportSuccess.value = false }, 3000)
  } catch (err) {
    exportError.value = err.message || '导出失败，请重试'
    setTimeout(() => { exportError.value = '' }, 4000)
  } finally {
    exporting.value = false
  }
}

onPageReady(async () => {
  await Promise.all([
    historyStore.loadRecords(),
    bankStore.loadBuiltinBanks(),
    bankStore.loadUserBanks(),
  ])
})
</script>

<style scoped>
.wrongbook-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header .page-title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.batch-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--accent-primary);
}

.batch-toggle .app-icon {
  width: 14px;
  height: 14px;
}

/* ===== Batch action bar ===== */
.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  border-radius: var(--radius-md);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.batch-count {
  font-size: 0.88rem;
  color: var(--text-primary);
}

.batch-count text {
  color: var(--accent-primary);
  font-variant-numeric: tabular-nums;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.batch-actions .btn .app-icon {
  width: 14px;
  height: 14px;
}

.batch-cancel {
  margin-left: 0.25rem;
}

.batch-bar-enter-active,
.batch-bar-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.batch-bar-enter-from,
.batch-bar-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ===== Export toast ===== */
.export-toast {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: var(--shadow-md);
  border: 1px solid;
}

.export-toast--success {
  background: var(--success-soft);
  color: var(--success);
  border-color: var(--success-border);
}

.export-toast--error {
  background: var(--error-soft);
  color: var(--error);
  border-color: var(--error-border);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ===== Confirm modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
  z-index: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-card {
  width: min(380px, 100%);
  padding: 1.5rem 1.5rem 1.25rem;
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.625rem;
}

.modal-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.modal-icon[data-tone="danger"] {
  background: var(--error-soft);
  color: var(--error);
}

.modal-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.modal-desc {
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--text-secondary);
  margin: 0;
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-card,
.modal-leave-to .modal-card {
  transform: scale(0.94) translateY(6px);
}

.wrongbook-layout {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
}

.wrongbook-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.empty-wrap {
  padding-top: 2rem;
}

.mobile-filters {
  display: none;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.filter-scroll {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.filter-scroll-label {
  flex-shrink: 0;
  font-weight: 500;
}

.chip {
  padding: 0.3rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 0.82rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.chip:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.chip.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: #fff;
}

.mobile-date-picker :deep(.date-picker-trigger) {
  padding: 0.3rem 0.6rem;
  font-size: 0.82rem;
  min-width: 6.5rem;
  border-radius: 9999px;
  background: var(--bg-card);
  color: var(--text-secondary);
}

.mobile-date-picker :deep(.date-picker-trigger.filled) {
  background: var(--accent-soft);
  border-color: var(--accent-border);
  color: var(--accent-primary);
}

@media (max-width: 1023px) {
  .mobile-filters {
    display: flex;
  }
  .wrongbook-layout {
    flex-direction: column;
  }
  .wrongbook-view {
    padding-bottom: 72px;
  }
  .sidebar-slot {
    display: none;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.375rem;
  }

  .page-header .page-title {
    font-size: 1.4rem;
  }

  .filter-scroll {
    flex-wrap: wrap;
  }

  .chip {
    flex-shrink: 0;
  }
}
</style>
