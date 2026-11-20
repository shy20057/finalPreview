<template>
  <div class="favorite-view">
    <div class="page-header">
      <h1>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2" style="margin-right: 0.5rem; vertical-align: -3px;">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        我的收藏
      </h1>
      <span class="text-muted">共 {{ favoriteStore.favoriteCount }} 道</span>
    </div>

    <div v-if="favoriteStore.loading" class="empty-wrap">
      <div class="skeleton skeleton-title" style="width: 60%; margin: 0 auto 1rem;"></div>
      <div v-for="i in 3" :key="i" class="skeleton skeleton-text" style="height: 3rem; margin-bottom: 0.75rem;"></div>
    </div>

    <div v-else-if="favoriteStore.favorites.length === 0" class="empty-wrap">
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>
        <p class="text-muted">还没有收藏任何题目</p>
        <p class="text-muted text-sm">答题时点击题目右上角的星标即可收藏</p>
<!--  todo  -->
        <router-link to="/banks" class="btn btn-primary" style="margin-top: 0.75rem;">
          去题库看看
        </router-link>
      </div>
    </div>

    <div v-else class="favorite-layout">
      <!-- Filter bar -->
      <div class="filter-bar">
        <div class="filter-scroll">
          <span class="text-muted text-sm filter-label">题型</span>
          <button
            v-for="t in ['全部', ...TYPES]"
            :key="t"
            class="chip"
            :class="{ active: typeFilter === t }"
            @click="typeFilter = t"
          >{{ t === '全部' ? '全部' : typeLabel(t) }}</button>
        </div>
        <div class="filter-scroll">
          <span class="text-muted text-sm filter-label">题库</span>
          <button
            v-for="bn in ['全部', ...bankNames]"
            :key="bn"
            class="chip"
            :class="{ active: bankFilter === bn }"
            @click="bankFilter = bn"
          >{{ bn === '全部' ? '全部' : bn }}</button>
        </div>
      </div>

      <!-- Card list -->
      <div class="card-list">
        <div
          v-for="fav in filteredFavorites"
          :key="fav.id"
          class="fav-card card"
          @click="openDetail(fav)"
        >
          <div class="fav-card-left">
            <span class="badge" :class="typeBadgeClass(fav.questionData?.type)">
              {{ typeLabel(fav.questionData?.type) }}
            </span>
            <span class="fav-bank-name">{{ fav.bankName }}</span>
          </div>
          <p class="fav-question-text">{{ truncate(fav.questionData?.question || '', 100) }}</p>
          <div class="fav-card-footer">
            <span class="text-muted text-xs">收藏于 {{ formatDate(fav.createdAt) }}</span>
            <button
              class="btn btn-sm btn-secondary"
              @click.stop="removeFav(fav)"
              title="取消收藏"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              取消收藏
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail drawer -->
    <Transition name="drawer">
      <div v-if="detailFav" class="drawer-overlay" @click.self="detailFav = null">
        <div class="detail-drawer card">
          <header class="drawer-header">
            <div>
              <span class="badge" :class="typeBadgeClass(detailFav.questionData?.type)">
                {{ typeLabel(detailFav.questionData?.type) }}
              </span>
              <span class="text-muted text-sm" style="margin-left: 0.5rem;">{{ detailFav.bankName }}</span>
            </div>
            <button class="close-btn" @click="detailFav = null">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </header>
          <div class="drawer-body">
            <h3 class="detail-question">{{ detailFav.questionData?.question }}</h3>

            <!-- Options for single/multi -->
            <div v-if="detailFav.questionData?.options" class="detail-options">
              <div
                v-for="opt in detailFav.questionData.options"
                :key="opt.label"
                class="detail-option"
                :class="{ 'is-answer': isCorrectOption(detailFav.questionData, opt.label) }"
              >
                <span class="detail-option-label">{{ opt.label }}</span>
                <span>{{ opt.text }}</span>
                <svg v-if="isCorrectOption(detailFav.questionData, opt.label)" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-left: auto; color: var(--success);">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
              </div>
            </div>

            <!-- Answer for fill -->
            <div v-if="detailFav.questionData?.type === 'fill'" class="detail-fill-answers">
              <span class="text-muted text-sm">正确答案：</span>
              <span v-for="(ans, i) in detailFav.questionData.answer" :key="i" class="fill-answer-tag">{{ ans }}</span>
            </div>

            <!-- Answer for essay -->
            <div v-if="detailFav.questionData?.type === 'essay'" class="detail-essay-answer">
              <div class="text-muted text-sm" style="margin-bottom: 0.5rem;">参考答案：</div>
              <p class="essay-text">{{ detailFav.questionData.answer }}</p>
            </div>

            <!-- Explanation -->
            <div v-if="detailFav.questionData?.explanation" class="detail-explanation">
              <div class="explanation-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4M12 8h.01"/>
                </svg>
                解析
              </div>
              <p>{{ detailFav.questionData.explanation }}</p>
            </div>
          </div>
          <div class="drawer-footer">
            <button
              class="btn btn-secondary"
              @click="removeFav(detailFav); detailFav = null"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              取消收藏
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFavoriteStore } from '../stores/favorite.js'

const favoriteStore = useFavoriteStore()

const typeFilter = ref('全部')
const bankFilter = ref('全部')
const detailFav = ref(null)

const TYPES = ['single', 'multi', 'fill', 'essay']
const TYPE_LABELS = { single: '单选', multi: '多选', fill: '填空', essay: '简答' }

function typeLabel(t) { return TYPE_LABELS[t] || t }

function typeBadgeClass(type) {
  return type === 'fill' ? 'badge-success' : type === 'essay' ? 'badge-accent' : 'badge-accent'
}

const bankNames = computed(() => {
  const names = new Set()
  for (const f of favoriteStore.favorites) {
    if (f.bankName) names.add(f.bankName)
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const filteredFavorites = computed(() => {
  return favoriteStore.favorites.filter(f => {
    if (typeFilter.value !== '全部' && f.questionData?.type !== typeFilter.value) return false
    if (bankFilter.value !== '全部' && f.bankName !== bankFilter.value) return false
    return true
  })
})

function truncate(text, maxLen) {
  if (!text) return ''
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

function formatDate(iso) {
  try {
    const d = new Date(iso)
    const now = new Date()
    const diff = now - d
    if (diff < 86400000 && d.getDate() === now.getDate()) {
      return `今天 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    }
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
  } catch {
    return ''
  }
}

function isCorrectOption(qData, label) {
  if (!qData) return false
  if (qData.type === 'multi') {
    return Array.isArray(qData.answer) && qData.answer.includes(label)
  }
  return qData.answer === label
}

function openDetail(fav) {
  detailFav.value = fav
}

async function removeFav(fav) {
  await favoriteStore.toggleFavorite(
    fav.bankId,
    fav.questionId,
    fav.bankName,
    fav.questionData
  )
}

onMounted(() => {
  favoriteStore.load()
})
</script>

<style scoped>
.favorite-view {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.page-header {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.page-header h1 {
  font-size: 1.35rem;
  font-weight: 700;
}

.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 0.75rem 0;
}

.filter-scroll {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow-x: auto;
  flex-wrap: wrap;
}

.filter-label {
  flex-shrink: 0;
  min-width: 2.5rem;
}

.chip {
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.chip:hover {
  border-color: var(--accent-border);
  color: var(--text-primary);
}

.chip.active {
  background: var(--accent-soft);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.fav-card {
  padding: 1rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.fav-card:hover {
  border-color: var(--accent-border);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.fav-card-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.fav-bank-name {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.fav-question-text {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text-primary);
  margin-bottom: 0.625rem;
}

.fav-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Detail drawer */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 200;
  display: flex;
  justify-content: flex-end;
}

.detail-drawer {
  width: 420px;
  max-width: 90vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-left: 1px solid var(--border-color);
  border-radius: 0;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--bg-surface-raised);
  color: var(--text-primary);
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1rem;
}

.detail-question {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.7;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.detail-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.detail-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
}

.detail-option.is-answer {
  background: var(--success-soft);
  border-color: var(--success-border);
}

.detail-option-label {
  font-weight: 700;
  min-width: 20px;
  color: var(--text-muted);
}

.detail-option.is-answer .detail-option-label {
  color: var(--success);
}

.detail-fill-answers {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.fill-answer-tag {
  padding: 0.2rem 0.6rem;
  background: var(--success-soft);
  border: 1px solid var(--success-border);
  border-radius: var(--radius-sm);
  color: var(--success);
  font-size: 0.85rem;
  font-weight: 500;
}

.detail-essay-answer {
  margin-bottom: 1rem;
}

.essay-text {
  padding: 0.75rem;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  font-size: 0.9rem;
  line-height: 1.7;
  white-space: pre-wrap;
  color: var(--text-primary);
}

.detail-explanation {
  padding: 0.75rem;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-md);
}

.explanation-header {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.4rem;
  color: var(--accent-primary);
  font-weight: 600;
  font-size: 0.8rem;
}

.explanation-header + p {
  color: var(--text-secondary);
  line-height: 1.7;
  font-size: 0.85rem;
}

.drawer-footer {
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.drawer-footer .btn {
  width: 100%;
}

/* Drawer transition */
.drawer-enter-active, .drawer-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-enter-active .detail-drawer, .drawer-leave-active .detail-drawer {
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-enter-from, .drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from .detail-drawer, .drawer-leave-to .detail-drawer {
  transform: translateX(100%);
}

.empty-wrap {
  padding: 2rem 0;
}
</style>
