<template>
  <div class="bank-list-view">
    <div class="page-header">
      <h1>题库管理</h1>
      <button class="btn btn-primary" @click="bankStore.openImportModal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        导入题库
      </button>
    </div>

    <!-- 学科Tab栏 -->
    <div v-if="!loading && bankStore.allBanks.length > 0" class="subject-tabs animate-fadeIn">
      <button
        v-for="subject in bankStore.subjects"
        :key="subject"
        class="subject-tab"
        :class="{ active: bankStore.selectedSubject === subject }"
        @click="bankStore.selectedSubject = subject"
      >
        {{ subject }}
        <span class="tab-count">{{ subject === '全部' ? bankStore.allBanks.length : (bankStore.banksBySubject[subject]?.length || 0) }}</span>
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="bank-table card animate-fadeIn">
      <div class="skeleton-thead">
        <div class="skeleton" style="height: 36px; width: 100%; border-radius: 0;"></div>
      </div>
      <div v-for="i in 4" :key="i" class="skeleton-row">
        <div class="skeleton skeleton-text" style="width: 30%;"></div>
        <div class="skeleton skeleton-text" style="width: 15%;"></div>
        <div class="skeleton skeleton-text" style="width: 10%;"></div>
        <div class="skeleton skeleton-text" style="width: 20%;"></div>
        <div class="skeleton skeleton-text" style="width: 10%;"></div>
        <div class="skeleton" style="width: 120px; height: 28px;"></div>
      </div>
    </div>

    <div v-else-if="bankStore.allBanks.length === 0" class="empty-state card animate-fadeIn">
      <div class="empty-state-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      </div>
      <p class="text-muted">暂无题库，请导入或等待内置题库加载</p>
      <button class="btn btn-primary" @click="bankStore.openImportModal">导入题库</button>
    </div>

    <!-- 无该学科题库 -->
    <div v-else-if="bankStore.filteredBanks.length === 0" class="empty-state card animate-fadeIn">
      <p class="text-muted">该学科暂无题库</p>
    </div>

    <!-- 表格视图（"全部"时按学科分组，其他按单一学科） -->
    <div v-else class="bank-groups animate-fadeIn">
      <!-- "全部"视图：按学科分组 -->
      <template v-if="bankStore.selectedSubject === '全部'">
        <div
          v-for="(banks, subject) in bankStore.banksBySubject"
          :key="subject"
          class="bank-group"
        >
          <div class="group-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <span class="group-title">{{ subject }}</span>
            <span class="group-count">{{ banks.length }} 个题库</span>
          </div>
          <div class="bank-table card">
            <table>
              <thead>
                <tr>
                  <th>题库名称</th>
                  <th>题目数</th>
                  <th>类型</th>
                  <th>来源</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(bank, index) in banks"
                  :key="bank.id"
                  class="animate-slideInUp"
                  :class="`stagger-${(index % 6) + 1}`"
                >
                  <td class="bank-name-cell">
                    <span class="bank-name">{{ bank.name }}</span>
                  </td>
                  <td>{{ bank.questions?.length || 0 }}</td>
                  <td>
                    <span class="text-muted text-sm">{{ getTypeSummary(bank) }}</span>
                  </td>
                  <td>
                    <span v-if="bank.builtin" class="badge badge-success">内置</span>
                    <span v-else class="badge badge-accent">用户导入</span>
                  </td>
                  <td>
                    <div class="actions">
                      <button class="btn btn-sm btn-secondary" @click="startQuiz(bank)">开始答题</button>
                      <button
                        v-if="!bank.builtin"
                        class="btn btn-sm btn-danger"
                        @click="deleteBank(bank.id)"
                      >删除</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- 单学科视图：直接列表 -->
      <template v-else>
        <div class="bank-table card">
          <table>
            <thead>
              <tr>
                <th>题库名称</th>
                <th>题目数</th>
                <th>类型</th>
                <th>来源</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(bank, index) in bankStore.filteredBanks"
                :key="bank.id"
                class="animate-slideInUp"
                :class="`stagger-${(index % 6) + 1}`"
              >
                <td class="bank-name-cell">
                  <span class="bank-name">{{ bank.name }}</span>
                </td>
                <td>{{ bank.questions?.length || 0 }}</td>
                <td>
                  <span class="text-muted text-sm">{{ getTypeSummary(bank) }}</span>
                </td>
                <td>
                  <span v-if="bank.builtin" class="badge badge-success">内置</span>
                  <span v-else class="badge badge-accent">用户导入</span>
                </td>
                <td>
                  <div class="actions">
                    <button class="btn btn-sm btn-secondary" @click="startQuiz(bank)">开始答题</button>
                    <button
                      v-if="!bank.builtin"
                      class="btn btn-sm btn-danger"
                      @click="deleteBank(bank.id)"
                    >删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

    <ImportModal
      v-if="bankStore.importModalOpen"
      @close="bankStore.closeImportModal"
      @import="handleImport"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBankStore } from '../stores/bank.js'
import { useQuizStore } from '../stores/quiz.js'
import ImportModal from '../components/ImportModal.vue'

const router = useRouter()
const bankStore = useBankStore()
const quizStore = useQuizStore()
const loading = ref(true)

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
  if (confirm('确定要删除这个题库吗？')) {
    bankStore.deleteBank(id)
  }
}

function handleImport(bankData) {
  bankStore.addBank(bankData)
  bankStore.closeImportModal()
}

onMounted(async () => {
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

.page-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
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

.bank-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.bank-table th,
.bank-table td {
  padding: 0.875rem 1rem;
  text-align: left;
}

.bank-table th {
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: var(--bg-surface-raised);
  border-bottom: 1px solid var(--border-color);
}

.bank-table td {
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
}

.bank-table tr:last-child td {
  border-bottom: none;
}

.bank-table tbody tr {
  transition: background 0.15s ease;
}

.bank-table tbody tr:hover {
  background: var(--bg-card-hover);
}

.bank-name {
  font-weight: 500;
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

  .page-header h1 {
    font-size: 1.1rem;
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

  .bank-table th,
  .bank-table td {
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
