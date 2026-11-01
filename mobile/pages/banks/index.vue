<template>
  <AppShell>
    <view class="bank-list-view">
      <view class="page-header">
        <text>题库管理</text>
        <view class="btn btn-primary" @click="bankStore.openImportModal">
          <AppIcon name="iebefd945" :size="16" />
          导入题库
        </view>
      </view>

      <!-- 学科Tab栏 -->
      <view v-if="!loading && bankStore.allBanks.length > 0" class="subject-tabs animate-fadeIn">
        <view
          v-for="subject in bankStore.subjects"
          :key="subject"
          class="subject-tab"
          :class="{ active: bankStore.selectedSubject === subject }"
          @click="bankStore.selectedSubject = subject"
        >
          {{ subject }}
          <text class="tab-count">{{ subject === '全部' ? bankStore.allBanks.length : (bankStore.banksBySubject[subject]?.length || 0) }}</text>
        </view>
      </view>

      <!-- Loading skeleton -->
      <view v-if="loading" class="bank-table card animate-fadeIn">
        <view class="skeleton-thead">
          <view class="skeleton" style="height: 36px; width: 100%; border-radius: 0;"></view>
        </view>
        <view v-for="i in 4" :key="i" class="skeleton-row">
          <view class="skeleton skeleton-text" style="width: 30%;"></view>
          <view class="skeleton skeleton-text" style="width: 15%;"></view>
          <view class="skeleton skeleton-text" style="width: 10%;"></view>
          <view class="skeleton skeleton-text" style="width: 20%;"></view>
          <view class="skeleton skeleton-text" style="width: 10%;"></view>
          <view class="skeleton" style="width: 120px; height: 28px;"></view>
        </view>
      </view>

      <view v-else-if="bankStore.allBanks.length === 0" class="empty-state card animate-fadeIn">
        <view class="empty-state-icon">
          <AppIcon name="i3258529d" :size="32" />
        </view>
        <view class="text-muted">暂无题库，请导入或等待内置题库加载</view>
        <view class="btn btn-primary" @click="bankStore.openImportModal">导入题库</view>
      </view>

      <!-- 无该学科题库 -->
      <view v-else-if="bankStore.filteredBanks.length === 0" class="empty-state card animate-fadeIn">
        <view class="text-muted">该学科暂无题库</view>
      </view>

      <!-- 表格视图（"全部"时按学科分组，其他按单一学科） -->
      <view v-else class="bank-groups animate-fadeIn">
        <!-- "全部"视图：按学科分组 -->
        <template v-if="bankStore.selectedSubject === '全部'">
          <view
            v-for="(banks, subject) in bankStore.banksBySubject"
            :key="subject"
            class="bank-group"
          >
            <view class="group-header">
              <AppIcon name="ic562aa1f" :size="14" />
              <text class="group-title">{{ subject }}</text>
              <text class="group-count">{{ banks.length }} 个题库</text>
            </view>
            <view class="bank-table card">
              <view class="bank-table-el">
                <view class="bank-thead-el">
                  <view class="bank-tr-el">
                    <view class="bank-th-el">题库名称</view>
                    <view class="bank-th-el">题目数</view>
                    <view class="bank-th-el">类型</view>
                    <view class="bank-th-el">来源</view>
                    <view class="bank-th-el">操作</view>
                  </view>
                </view>
                <view class="bank-tbody-el">
                  <view
                    v-for="(bank, index) in banks"
                    :key="bank.id"
                    class="bank-tr-el animate-slideInUp"
                    :class="`stagger-${(index % 6) + 1}`"
                  >
                    <view class="bank-td-el bank-name-cell">
                      <view v-if="editingBankId === bank.id" class="bank-name-edit">
                        <input
                          v-model="editingName"
                          class="input"
                          :focus="true"
                          @confirm="saveEditing"
                          @blur="saveEditing"
                        />
                      </view>
                      <view v-else class="bank-name-display">
                        <text class="bank-name">{{ bank.name }}</text>
                        <view
                          v-if="!bank.builtin"
                          class="edit-name-btn"
                          @click="startEditing(bank)"
                        >
                          <AppIcon name="ifaddd8c9" :size="14" />
                        </view>
                      </view>
                    </view>
                    <view class="bank-td-el">{{ bank.questions?.length || 0 }}</view>
                    <view class="bank-td-el">
                      <text class="text-muted text-sm">{{ getTypeSummary(bank) }}</text>
                    </view>
                    <view class="bank-td-el">
                      <text v-if="bank.builtin" class="badge badge-success">内置</text>
                      <text v-else class="badge badge-accent">用户导入</text>
                    </view>
                    <view class="bank-td-el">
                      <view class="actions">
                        <view class="btn btn-sm btn-secondary" @click="startQuiz(bank)">开始答题</view>
                        <view
                          v-if="!bank.builtin"
                          class="btn btn-sm btn-danger"
                          @click="deleteBank(bank.id)"
                        >删除</view>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </template>

        <!-- 单学科视图：直接列表 -->
        <template v-else>
          <view class="bank-table card">
            <view class="bank-table-el">
              <view class="bank-thead-el">
                <view class="bank-tr-el">
                  <view class="bank-th-el">题库名称</view>
                  <view class="bank-th-el">题目数</view>
                  <view class="bank-th-el">类型</view>
                  <view class="bank-th-el">来源</view>
                  <view class="bank-th-el">操作</view>
                </view>
              </view>
              <view class="bank-tbody-el">
                <view
                  v-for="(bank, index) in bankStore.filteredBanks"
                  :key="bank.id"
                  class="bank-tr-el animate-slideInUp"
                  :class="`stagger-${(index % 6) + 1}`"
                >
                  <view class="bank-td-el bank-name-cell">
                    <view v-if="editingBankId === bank.id" class="bank-name-edit">
                      <input
                        v-model="editingName"
                        class="input"
                        :focus="true"
                        @confirm="saveEditing"
                        @blur="saveEditing"
                      />
                    </view>
                    <view v-else class="bank-name-display">
                      <text class="bank-name">{{ bank.name }}</text>
                      <view
                        v-if="!bank.builtin"
                        class="edit-name-btn"
                        @click="startEditing(bank)"
                      >
                        <AppIcon name="ifaddd8c9" :size="14" />
                      </view>
                    </view>
                  </view>
                  <view class="bank-td-el">{{ bank.questions?.length || 0 }}</view>
                  <view class="bank-td-el">
                    <text class="text-muted text-sm">{{ getTypeSummary(bank) }}</text>
                  </view>
                  <view class="bank-td-el">
                    <text v-if="bank.builtin" class="badge badge-success">内置</text>
                    <text v-else class="badge badge-accent">用户导入</text>
                  </view>
                  <view class="bank-td-el">
                    <view class="actions">
                      <view class="btn btn-sm btn-secondary" @click="startQuiz(bank)">开始答题</view>
                      <view
                        v-if="!bank.builtin"
                        class="btn btn-sm btn-danger"
                        @click="deleteBank(bank.id)"
                      >删除</view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </template>
      </view>

      <ImportModal
        v-if="bankStore.importModalOpen"
        @close="bankStore.closeImportModal"
        @import="handleImport"
      />

      <ConfirmModal
        v-if="showDeleteModal"
        title="删除题库"
        :message="`确定要删除该题库吗？此操作不可恢复。`"
        confirm-text="删除"
        cancel-text="取消"
        type="danger"
        @confirm="confirmDelete"
        @cancel="closeDeleteModal"
      />
    </view>
  </AppShell>
</template>

<script setup>
import { onPageReady } from '../../composables/usePageReady.js'

import { onMounted, ref } from 'vue'
import { useRouter } from '../../utils/router.js'
import { useBankStore } from '../../stores/bank.js'
import { useQuizStore } from '../../stores/quiz.js'
import ImportModal from '../../components/ImportModal.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'
import AppShell from '../../components/AppShell.vue'

const router = useRouter()
const bankStore = useBankStore()
const quizStore = useQuizStore()
const loading = ref(true)
const editingBankId = ref(null)
const editingName = ref('')
const originalName = ref('')
const originalSubject = ref('')

// Delete confirmation modal state
const showDeleteModal = ref(false)
const pendingDeleteId = ref(null)

function startEditing(bank) {
  editingBankId.value = bank.id
  editingName.value = bank.name
  originalName.value = bank.name
  originalSubject.value = bank.subject || ''
}

async function saveEditing() {
  if (!editingBankId.value) return
  const newName = editingName.value.trim()
  if (newName && newName !== originalName.value) {
    await bankStore.updateBank(editingBankId.value, { name: newName, subject: originalSubject.value })
  }
  cancelEditing()
}

function cancelEditing() {
  editingBankId.value = null
  editingName.value = ''
  originalName.value = ''
  originalSubject.value = ''
}

function getTypeSummary(bank) {
  if (!bank.questions) return ''
  const s = bank.questions.filter(q => q.type === 'single').length
  const m = bank.questions.filter(q => q.type === 'multi').length
  const f = bank.questions.filter(q => q.type === 'fill').length
  const e = bank.questions.filter(q => q.type === 'essay').length
  const parts = []
  if (s) parts.push(`${s}单选`)
  if (m) parts.push(`${m}多选`)
  if (f) parts.push(`${f}填空`)
  if (e) parts.push(`${e}简答`)
  return parts.join(' · ') || '—'
}

function startQuiz(bank) {
  bankStore.selectBank(bank)
  router.push(`/quiz/${bank.id}`)
}

function deleteBank(id) {
  pendingDeleteId.value = id
  showDeleteModal.value = true
}

function confirmDelete() {
  if (pendingDeleteId.value) {
    bankStore.deleteBank(pendingDeleteId.value)
  }
  closeDeleteModal()
}

function closeDeleteModal() {
  showDeleteModal.value = false
  pendingDeleteId.value = null
}

function handleImport(bankData) {
  bankStore.addBank(bankData)
  bankStore.closeImportModal()
}

onPageReady(async () => {
  await bankStore.loadBuiltinBanks()
  await bankStore.loadUserBanks()
  loading.value = false
})
</script>

<style scoped>
.bank-list-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header text {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

/* Subject tabs */
.subject-tabs {
  display: flex;
  gap: 0.375rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
  scrollbar-width: thin;
}

.subject-tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4rem 0.875rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.subject-tab:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.subject-tab.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: #fff;
}

.subject-tab.active .tab-count {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 0.25rem;
  background: var(--bg-surface-raised);
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
}

.empty-state {
  padding: 3rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.bank-groups {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.bank-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
}

.group-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.group-count {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.bank-table {
  overflow: hidden;
}

/* 原版 <table>/<thead>/<tbody>/<tr>/<th>/<td> —— App 端没有这些标签，
   用 view + display:table 还原同样的表格布局。 */
.bank-table .bank-table-el {
  display: table;
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.bank-table .bank-thead-el {
  display: table-header-group;
}

.bank-table .bank-tbody-el {
  display: table-row-group;
}

.bank-table .bank-tr-el {
  display: table-row;
}

.bank-table .bank-th-el,
.bank-table .bank-td-el {
  display: table-cell;
  padding: 0.875rem 1rem;
  text-align: left;
}

.bank-table .bank-th-el {
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: var(--bg-surface-raised);
  border-bottom: 1px solid var(--border-color);
}

.bank-table .bank-td-el {
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
}

.bank-table .bank-tbody-el .bank-tr-el:last-child .bank-td-el {
  border-bottom: none;
}

.bank-table .bank-tbody-el .bank-tr-el {
  transition: background 0.15s ease;
}

.bank-table .bank-tbody-el .bank-tr-el:hover {
  background: var(--bg-card-hover);
}

.bank-name {
  font-weight: 500;
}

.bank-name-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.edit-name-btn {
  padding: 4px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s ease;
}

.bank-table .bank-tr-el:hover .edit-name-btn {
  opacity: 1;
}

.edit-name-btn:hover {
  background: var(--bg-surface-raised);
  color: var(--accent-primary);
}

.bank-name-edit input {
  width: 100%;
  padding: 0.375rem 0.625rem;
  font-size: 0.9rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

/* Skeleton loading styles */
.skeleton-thead {
  background: var(--bg-surface-raised);
  border-bottom: 1px solid var(--border-color);
}

.skeleton-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--border-color);
}

.skeleton-row:last-child {
  border-bottom: none;
}

@media (max-width: 768px) {
  .bank-list-view {
    padding-bottom: 72px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .page-header text {
    font-size: 1.4rem;
  }

  .page-header .btn {
    width: 100%;
  }

  .subject-tabs {
    flex-wrap: wrap;
  }

  .bank-table {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .bank-table .bank-th-el,
  .bank-table .bank-td-el {
    white-space: nowrap;
    padding: 0.75rem 0.875rem;
  }

  .actions {
    flex-direction: column;
    gap: 0.375rem;
  }

  .actions .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
