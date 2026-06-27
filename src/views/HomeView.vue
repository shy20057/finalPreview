<template>
  <div class="home-view">
    <!-- Asymmetric Hero -->
    <section class="hero">
      <div class="hero-left">
        <div class="hero-eyebrow animate-fadeIn stagger-1">
          <span class="badge badge-accent">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            期末复习系统
          </span>
        </div>
        <h1 class="hero-title animate-fadeIn stagger-2">高效复习<br><span class="text-accent">轻松备考</span></h1>
        <p class="hero-desc text-secondary animate-fadeIn stagger-3">
          覆盖多学科的智能练习系统，支持练习模式与模拟考试，助你查漏补缺、胸有成竹。
        </p>
        <div class="hero-cta animate-fadeIn stagger-4">
          <button class="btn btn-primary btn-lg" @click="goToPractice">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
            开始练习
          </button>
          <button class="btn btn-secondary btn-lg" @click="router.push('/banks')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            管理题库
          </button>
        </div>
      </div>
      <div class="hero-right animate-fadeIn stagger-3">
        <div class="hero-illustration">
          <div class="hero-card-stack">
            <div class="hero-card hero-card-back">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <div class="hero-card hero-card-mid">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--success)">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <div class="hero-card hero-card-front">
              <div class="hero-card-content">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--accent-primary)">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4M12 8h.01"/>
                </svg>
                <span class="text-sm font-medium">AI 解析</span>
              </div>
            </div>
          </div>
          <div class="hero-float-badge">
            <span class="text-accent font-bold text-sm">+{{ bankStore.allBanks.length }}</span>
            <span class="text-muted text-xs">题库已就绪</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Mode Cards — asymmetric grid -->
    <section class="mode-section">
      <div class="section-label animate-fadeIn stagger-2">
        <span class="text-muted text-sm font-medium">选择学习方式</span>
      </div>
      <div class="mode-cards">
        <div class="mode-card card card-hover animate-slideInUp stagger-3" @click="goToPractice">
          <div class="mode-icon" style="color: var(--accent-primary)">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              <path d="M8 7h8M8 11h8M8 15h4"/>
            </svg>
          </div>
          <div class="mode-info">
            <h3>练习模式</h3>
            <p class="text-muted text-sm">逐题练习，即时判分</p>
          </div>
          <div class="mode-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
          </div>
        </div>
        <div class="mode-card card card-hover animate-slideInUp stagger-4" @click="goToExam">
          <div class="mode-icon" style="color: var(--warning)">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <div class="mode-info">
            <h3>模拟考试</h3>
            <p class="text-muted text-sm">随机出题，模拟实战</p>
          </div>
          <div class="mode-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
          </div>
        </div>
      </div>
    </section>

    <!-- All Banks -->
    <section class="all-banks-section animate-fadeIn">
      <div class="section-header">
        <h2 class="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; vertical-align: -2px; margin-right: 6px;">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          系统题库
        </h2>
        <button class="btn btn-primary btn-sm" @click="bankStore.openImportModal">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          导入题库
        </button>
      </div>

      <!-- 骨架屏 -->
      <div v-if="loading" class="bank-grid">
        <div v-for="i in 4" :key="i" class="skeleton-bank-card card">
          <div class="bank-header">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton" style="width: 48px; height: 20px; border-radius: 999px;"></div>
          </div>
          <div class="skeleton skeleton-text" style="width: 40%;"></div>
          <div class="bank-meta">
            <div class="skeleton skeleton-text" style="width: 30%;"></div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="bankStore.allBanks.length === 0" class="empty-state card">
        <div class="empty-state-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </div>
        <p class="text-muted">暂无题库</p>
        <button class="btn btn-primary" @click="bankStore.openImportModal">导入题库</button>
      </div>

      <!-- 有题库：学科Tab + 卡片网格 -->
      <template v-else>
        <div class="subject-tabs">
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

        <div v-if="bankStore.filteredBanks.length === 0" class="empty-state card">
          <p class="text-muted">该学科暂无题库</p>
        </div>

        <div v-else class="bank-grid">
          <div
            v-for="(bank, index) in bankStore.filteredBanks"
            :key="bank.id"
            class="bank-card card card-hover animate-slideInUp"
            :class="`stagger-${(index % 6) + 1}`"
            @click="startBank(bank)"
          >
            <div class="bank-header">
              <h3>{{ bank.name }}</h3>
              <span v-if="bank.builtin" class="badge badge-success">内置</span>
              <span v-else class="badge badge-accent">用户</span>
            </div>
            <p class="text-muted text-sm">{{ bank.subject || '未分类' }}</p>
            <div class="bank-meta">
              <span class="text-muted text-xs">{{ bank.questions?.length || 0 }} 题 · {{ getTypeSummary(bank) }}</span>
            </div>
          </div>
        </div>
      </template>
    </section>

    <ImportModal
      v-if="bankStore.importModalOpen"
      @close="bankStore.closeImportModal"
      @import="handleImport"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBankStore } from '../stores/bank.js'
import { useQuizStore } from '../stores/quiz.js'
import ImportModal from '../components/ImportModal.vue'

const router = useRouter()
const bankStore = useBankStore()
const quizStore = useQuizStore()
const loading = ref(true)

const recentBanks = computed(() => {
  return bankStore.allBanks.slice(0, 4)
})

function getTypeSummary(bank) {
  if (!bank.questions) return ''
  const s = bank.questions.filter(q => q.type === 'single').length
  const f = bank.questions.filter(q => q.type === 'fill').length
  const parts = []
  if (s) parts.push(`${s}单选`)
  if (f) parts.push(`${f}填空`)
  return parts.join(' · ')
}

function startBank(bank) {
  bankStore.selectBank(bank)
  router.push(`/quiz/${bank.id}`)
}

function goToPractice() {
  if (bankStore.filteredBanks.length > 0) {
    const bank = bankStore.filteredBanks[0]
    bankStore.selectBank(bank)
    quizStore.setMode('practice')
    router.push(`/quiz/${bank.id}`)
  } else {
    bankStore.openImportModal()
  }
}

function goToExam() {
  if (bankStore.filteredBanks.length > 0) {
    const bank = bankStore.filteredBanks[0]
    bankStore.selectBank(bank)
    quizStore.setMode('exam')
    router.push(`/quiz/${bank.id}`)
  } else {
    bankStore.openImportModal()
  }
}

function handleImport(bankData) {
  const newBank = bankStore.addBank(bankData)
  bankStore.closeImportModal()
  bankStore.selectBank(newBank)
  router.push(`/quiz/${newBank.id}`)
}

onMounted(async () => {
  await bankStore.loadBuiltinBanks()
  await bankStore.loadUserBanks()
  loading.value = false
})
</script>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

/* ===== Asymmetric Hero ===== */
.hero {
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 3rem;
  align-items: center;
  padding: 1rem 0;
}

.hero-left {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hero-eyebrow {
  margin-bottom: -0.25rem;
}

.hero-title {
  font-size: clamp(2rem, 4vw, 2.75rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.hero-desc {
  font-size: 1.05rem;
  line-height: 1.7;
  max-width: 42ch;
}

.hero-cta {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

/* Illustration */
.hero-right {
  display: flex;
  justify-content: center;
}

.hero-illustration {
  position: relative;
  width: 280px;
  height: 200px;
}

.hero-card-stack {
  position: relative;
  width: 100%;
  height: 100%;
}

.hero-card {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-card-back {
  width: 180px;
  height: 130px;
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  top: 20px;
  left: 40px;
  transform: rotate(-8deg);
}

.hero-card-mid {
  width: 160px;
  height: 110px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  top: 40px;
  left: 70px;
  transform: rotate(-3deg);
}

.hero-card-front {
  width: 140px;
  height: 96px;
  background: var(--bg-card);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-xl);
  top: 55px;
  left: 90px;
  box-shadow: 0 8px 24px rgba(74, 222, 128, 0.12);
}

.hero-card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
}

.hero-float-badge {
  position: absolute;
  bottom: 0;
  right: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 0.5rem 0.875rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  box-shadow: var(--shadow-md);
}
/* ===== Mode Section ===== */
.mode-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-label {
  margin-bottom: 0.25rem;
}

.mode-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.mode-card {
  padding: 1.25rem 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.mode-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  background: var(--bg-surface-raised);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.mode-card:hover .mode-icon {
  transform: scale(1.05);
}

.mode-info {
  flex: 1;
}

.mode-info h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 0.125rem;
}

.mode-arrow {
  color: var(--text-muted);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.mode-card:hover .mode-arrow {
  transform: translateX(3px);
  color: var(--accent-primary);
}

/* ===== Section Header ===== */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
}

/* ===== Bank Grid ===== */
.bank-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

.bank-card {
  padding: 1.25rem;
  cursor: pointer;
}

.bank-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.bank-header h3 {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
}

.bank-meta {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

/* Skeleton bank card */
.skeleton-bank-card {
  padding: 1.25rem;
  pointer-events: none;
}

/* Subject tabs */
.subject-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  margin-bottom: 0.25rem;
  scrollbar-width: thin;
}

.subject-tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 0.8rem;
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
  min-width: 16px;
  height: 16px;
  padding: 0 0.2rem;
  background: var(--bg-surface-raised);
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 600;
}

/* ===== Responsive ===== */
@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .hero-right {
    display: none;
  }

  .hero-desc {
    max-width: none;
  }
}

@media (max-width: 768px) {
  .home-view {
    gap: 1.5rem;
    padding-bottom: 72px;
  }

  .hero {
    padding: 0.5rem 0;
  }

  .hero-title {
    font-size: 1.75rem;
  }

  .hero-desc {
    font-size: 0.95rem;
  }

  .mode-cards {
    grid-template-columns: 1fr;
  }

  .bank-grid {
    grid-template-columns: 1fr;
  }

  .hero-cta {
    flex-direction: column;
    gap: 0.5rem;
  }

  .hero-cta .btn {
    width: 100%;
  }
}
</style>


