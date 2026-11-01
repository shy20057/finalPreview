<template>
  <AppShell>
    <view class="favorite-view">
      <view class="page-header">
        <view class="page-h1">
          <AppIcon name="i1481b489" :size="22" :colored="true" style="margin-right: 0.5rem; vertical-align: -3px;" />
          我的收藏
        </view>
        <text class="text-muted">共 {{ favoriteStore.favoriteCount }} 道</text>
      </view>

      <view v-if="favoriteStore.loading" class="empty-wrap">
        <view class="skeleton skeleton-title" style="width: 60%; margin: 0 auto 1rem;"></view>
        <view v-for="i in 3" :key="i" class="skeleton skeleton-text" style="height: 3rem; margin-bottom: 0.75rem;"></view>
      </view>

      <view v-else-if="favoriteStore.favorites.length === 0" class="empty-wrap">
        <view class="empty-state">
          <view class="empty-state-icon">
            <AppIcon name="i43ca4b0e" :size="32" />
          </view>
          <view class="text-muted">还没有收藏任何题目</view>
          <view class="text-muted text-sm">答题时点击题目右上角的星标即可收藏</view>
          <view class="btn btn-primary" style="margin-top: 0.75rem;" @click="router.push('/banks')">
            去题库看看
          </view>
        </view>
      </view>

      <view v-else class="favorite-layout">
        <!-- Filter bar -->
        <view class="filter-bar">
          <view class="filter-scroll">
            <text class="text-muted text-sm filter-label">题型</text>
            <view
              v-for="t in ['全部', ...TYPES]"
              :key="t"
              class="chip"
              :class="{ active: typeFilter === t }"
              @click="typeFilter = t"
            >{{ t === '全部' ? '全部' : typeLabel(t) }}</view>
          </view>
          <view class="filter-scroll">
            <text class="text-muted text-sm filter-label">题库</text>
            <view
              v-for="bn in ['全部', ...bankNames]"
              :key="bn"
              class="chip"
              :class="{ active: bankFilter === bn }"
              @click="bankFilter = bn"
            >{{ bn === '全部' ? '全部' : bn }}</view>
          </view>
        </view>

        <!-- Card list -->
        <view class="card-list">
          <view
            v-for="fav in filteredFavorites"
            :key="fav.id"
            class="fav-card card"
            @click="openDetail(fav)"
          >
            <view class="fav-card-left">
              <text class="badge" :class="typeBadgeClass(fav.questionData?.type)">
                {{ typeLabel(fav.questionData?.type) }}
              </text>
              <text class="fav-bank-name">{{ fav.bankName }}</text>
            </view>
            <view class="fav-question-text">{{ truncate(fav.questionData?.question || '', 100) }}</view>
            <view class="fav-card-footer">
              <text class="text-muted text-xs">收藏于 {{ formatDate(fav.createdAt) }}</text>
              <view
                class="btn btn-sm btn-secondary"
                @click.stop="removeFav(fav)"
              >
                <AppIcon name="i8b9794fb" :size="14" />
                取消收藏
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- Detail drawer -->
      <ViewTransition name="drawer">
        <view v-if="detailFav" class="drawer-overlay" @click.self="detailFav = null">
          <view class="detail-drawer card">
            <view class="drawer-header">
              <view>
                <text class="badge" :class="typeBadgeClass(detailFav.questionData?.type)">
                  {{ typeLabel(detailFav.questionData?.type) }}
                </text>
                <text class="text-muted text-sm" style="margin-left: 0.5rem;">{{ detailFav.bankName }}</text>
              </view>
              <view class="close-btn" @click="detailFav = null">
                <AppIcon name="ieba488ee" :size="18" />
              </view>
            </view>
            <view class="drawer-body">
              <view class="detail-question">{{ detailFav.questionData?.question }}</view>

              <!-- Options for single/multi -->
              <view v-if="detailFav.questionData?.options" class="detail-options">
                <view
                  v-for="opt in detailFav.questionData.options"
                  :key="opt.label"
                  class="detail-option"
                  :class="{ 'is-answer': isCorrectOption(detailFav.questionData, opt.label) }"
                >
                  <text class="detail-option-label">{{ opt.label}}</text>
                  <text>{{ opt.text }}</text>
                  <AppIcon name="i7359e77d" :size="16" v-if="isCorrectOption(detailFav.questionData, opt.label)" style="margin-left: auto; color: var(--success);" />
                </view>
              </view>

              <!-- Answer for fill -->
              <view v-if="detailFav.questionData?.type === 'fill'" class="detail-fill-answers">
                <text class="text-muted text-sm">正确答案：</text>
                <text v-for="(ans, i) in detailFav.questionData.answer" :key="i" class="fill-answer-tag">{{ ans }}</text>
              </view>

              <!-- Answer for essay -->
              <view v-if="detailFav.questionData?.type === 'essay'" class="detail-essay-answer">
                <view class="text-muted text-sm" style="margin-bottom: 0.5rem;">参考答案：</view>
                <view class="essay-text">{{ detailFav.questionData.answer }}</view>
              </view>

              <!-- Explanation -->
              <view v-if="detailFav.questionData?.explanation" class="detail-explanation">
                <view class="explanation-header">
                  <AppIcon name="ib3fbd7e5" :size="14" />
                  解析
                </view>
                <view>{{ detailFav.questionData.explanation }}</view>
              </view>
            </view>
            <view class="drawer-footer">
              <view
                class="btn btn-secondary"
                @click="removeFav(detailFav); detailFav = null"
              >
                <AppIcon name="i8b9794fb" :size="16" />
                取消收藏
              </view>
            </view>
          </view>
        </view>
      </ViewTransition>
    </view>
  </AppShell>
</template>

<script setup>
import { onPageReady } from '../../composables/usePageReady.js'

import { ref, computed, onMounted } from 'vue'
import { useRouter } from '../../utils/router.js'
import { useFavoriteStore } from '../../stores/favorite.js'
import AppShell from '../../components/AppShell.vue'

const router = useRouter()
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

onPageReady(() => {
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

.page-header .page-h1 {
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

.explanation-header + view {
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
