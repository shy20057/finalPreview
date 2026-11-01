<template>
  <AppShell>
  <view class="profile-view">
    <view class="profile-heading">
      <view>
        <view class="web-p eyebrow">MY SPACE / 学习档案</view>
        <view class="web-h1">个人中心</view>
        <view class="web-p heading-subtitle">回顾每一次练习，继续向目标前进。</view>
      </view>
      <RouteLink to="/settings" class="outline-link">偏好设置 <text aria-hidden="true">↗</text></RouteLink>
    </view>

    <view class="profile-hero card" aria-label="账号信息">
      <view class="hero-copy">
        <view class="hero-avatar" aria-hidden="true">{{ avatarLetter }}</view>
        <view class="hero-identity">
          <text class="hero-kicker">学习者档案</text>
          <view class="web-h2">{{ authStore.username }}</view>
          <view class="web-p">每一次认真作答，都在积累自己的进步。</view>
        </view>
      </view>
      <view class="hero-actions">
        <text class="account-badge"><text class="status-dot"></text> 已登录</text>
        <button type="button" class="web-button signout-link" @click="authStore.logout()">退出登录</button>
      </view>
      <view class="hero-decoration" aria-hidden="true">✦</view>
    </view>

    <view v-if="loadError" class="load-error card" role="alert">
      <text>{{ loadError }}</text>
      <button type="button" @click="loadProfile" class="web-button">重试</button>
    </view>

    <view class="overview-section" aria-labelledby="overview-title">
      <view class="section-heading">
        <view>
          <view class="web-p eyebrow">OVERVIEW</view>
          <view id="overview-title" class="web-h2">学习概览</view>
        </view>
        <text class="section-note">数据来自你的练习记录</text>
      </view>
      <view class="stat-grid">
        <RouteLink to="/history" class="stat-card card card-hover">
          <text class="stat-icon blue" aria-hidden="true">✎</text>
          <text class="stat-number">{{ loading ? '—' : historyStore.recordCount }}</text>
          <text class="stat-label">练习次数</text>
          <text class="stat-hint">查看全部记录 <text aria-hidden="true">↗</text></text>
        </RouteLink>
        <RouteLink to="/history" class="stat-card card card-hover">
          <text class="stat-icon mint" aria-hidden="true">✓</text>
          <text class="stat-number">{{ loading ? '—' : `${accuracy}%` }}</text>
          <text class="stat-label">答题正确率</text>
          <text class="stat-hint">累计 {{ totalQuestions }} 道题</text>
        </RouteLink>
        <RouteLink to="/wrongbook" class="stat-card card card-hover">
          <text class="stat-icon amber" aria-hidden="true">!</text>
          <text class="stat-number">{{ loading ? '—' : wrongBookStore.counts.unmastered }}</text>
          <text class="stat-label">待巩固错题</text>
          <text class="stat-hint">前往错题本 <text aria-hidden="true">↗</text></text>
        </RouteLink>
        <RouteLink to="/favorites" class="stat-card card card-hover">
          <text class="stat-icon pink" aria-hidden="true">☆</text>
          <text class="stat-number">{{ loading ? '—' : favoriteStore.favoriteCount }}</text>
          <text class="stat-label">收藏题目</text>
          <text class="stat-hint">查看我的收藏 <text aria-hidden="true">↗</text></text>
        </RouteLink>
      </view>
    </view>

    <view class="profile-content-grid">
      <view class="activity-card card" aria-labelledby="activity-title">
        <view class="card-heading">
          <view>
            <view class="web-p eyebrow">ACTIVITY</view>
            <view id="activity-title" class="web-h2">近 7 天练习</view>
          </view>
          <text class="card-heading-meta">{{ weeklyTotal }} 次练习</text>
        </view>
        <view class="activity-chart" role="img" :aria-label="`近 7 天共练习 ${weeklyTotal} 次`">
          <view v-for="day in weeklyActivity" :key="day.key" class="activity-day">
            <text class="activity-value">{{ day.count || '' }}</text>
            <view class="activity-track"><view class="activity-bar" :style="{ height: `${day.height}%` }"></view></view>
            <text class="activity-label">{{ day.label }}</text>
          </view>
        </view>
        <view class="web-p activity-footer">{{ weeklyTotal ? '保持节奏，下一次练习从这里开始。' : '这周还没有练习记录，开始第一场练习吧。' }}</view>
        <RouteLink to="/banks" class="primary-link">开始练习 <text aria-hidden="true">→</text></RouteLink>
      </view>

      <view class="recent-card card" aria-labelledby="recent-title">
        <view class="card-heading">
          <view>
            <view class="web-p eyebrow">RECENT</view>
            <view id="recent-title" class="web-h2">最近练习</view>
          </view>
          <RouteLink to="/history" class="text-link">查看全部 <text aria-hidden="true">→</text></RouteLink>
        </view>
        <view v-if="loading" class="recent-empty">正在加载练习记录…</view>
        <view v-else-if="recentRecords.length === 0" class="recent-empty">
          <text class="empty-symbol" aria-hidden="true">✎</text>
          <text class="web-strong">还没有练习记录</text>
          <text>完成一次答题后，这里会显示你的学习轨迹。</text>
          <RouteLink to="/banks">浏览题库 →</RouteLink>
        </view>
        <view v-else class="recent-list">
          <RouteLink v-for="record in recentRecords" :key="record.id" :to="`/result/${record.id}`" class="recent-item">
            <text class="recent-mark" aria-hidden="true">{{ record.mode === 'exam' ? '考' : '练' }}</text>
            <text class="recent-info">
              <text class="web-strong">{{ record.bankName || '未命名题库' }}</text>
              <text class="web-small">{{ formatDate(record.date) }} · {{ record.mode === 'exam' ? '模拟考试' : '练习模式' }}</text>
            </text>
            <text class="recent-score">{{ record.score }}<text class="web-small">分</text></text>
            <text class="recent-arrow" aria-hidden="true">›</text>
          </RouteLink>
        </view>
      </view>
    </view>

    <view class="shortcut-section" aria-labelledby="shortcut-title">
      <view class="section-heading"><view><view class="web-p eyebrow">SHORTCUTS</view><view id="shortcut-title" class="web-h2">常用入口</view></view></view>
      <view class="shortcut-grid">
        <RouteLink to="/banks" class="shortcut card card-hover"><text>▤</text><text class="web-strong">浏览题库</text><text class="web-small">选择下一场练习</text><text aria-hidden="true" class="web-b">↗</text></RouteLink>
        <RouteLink to="/wrongbook" class="shortcut card card-hover"><text>◎</text><text class="web-strong">复习错题</text><text class="web-small">巩固薄弱知识点</text><text aria-hidden="true" class="web-b">↗</text></RouteLink>
        <RouteLink to="/notes" class="shortcut card card-hover"><text>✎</text><text class="web-strong">我的笔记</text><text class="web-small">整理学习心得</text><text aria-hidden="true" class="web-b">↗</text></RouteLink>
      </view>
    </view>
  </view>

  </AppShell>
</template>

<script setup>
import { onPageReady } from '../../composables/usePageReady.js'

import { useRouter } from '../../utils/router.js'
const router = useRouter()

import AppShell from '../../components/AppShell.vue'

import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/auth.js'
import { useHistoryStore } from '../../stores/history.js'
import { useFavoriteStore } from '../../stores/favorite.js'
import { useWrongBookStore } from '../../stores/wrongBook.js'

const authStore = useAuthStore()
const historyStore = useHistoryStore()
const favoriteStore = useFavoriteStore()
const wrongBookStore = useWrongBookStore()
const loading = ref(true)
const loadError = ref('')

const avatarLetter = computed(() => authStore.username.slice(0, 1).toUpperCase() || '学')
const recentRecords = computed(() => historyStore.sortedRecords.slice(0, 4))
const totalQuestions = computed(() => historyStore.records.reduce((sum, record) => sum + (Number(record.totalQuestions) || 0), 0))
const correctQuestions = computed(() => historyStore.records.reduce((sum, record) => sum + (Number(record.correctCount) || 0), 0))
const accuracy = computed(() => totalQuestions.value ? Math.round(correctQuestions.value / totalQuestions.value * 100) : 0)

const weeklyActivity = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - 6 + index)
    const next = new Date(date)
    next.setDate(date.getDate() + 1)
    const count = historyStore.records.filter(record => {
      const value = new Date(record.date)
      return value >= date && value < next
    }).length
    return { key: date.toISOString(), label: `${date.getMonth() + 1}/${date.getDate()}`, count }
  })
  const max = Math.max(1, ...days.map(day => day.count))
  return days.map(day => ({ ...day, height: day.count ? Math.max(14, day.count / max * 100) : 0 }))
})
const weeklyTotal = computed(() => weeklyActivity.value.reduce((sum, day) => sum + day.count, 0))

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未知日期'
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

async function loadProfile() {
  loading.value = true
  loadError.value = ''
  try {
    const results = await Promise.allSettled([historyStore.loadRecords(), favoriteStore.reload()])
    if (results.some(result => result.status === 'rejected')) {
      loadError.value = '部分学习数据加载失败，请稍后重试。'
    }
  } finally {
    loading.value = false
  }
}

onPageReady(loadProfile)
</script>

<style scoped>
.profile-view { width: 100%; max-width: 1160px; margin: 0 auto; padding: 1.3rem 0 3rem; }
.profile-heading, .section-heading, .card-heading { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; }
.profile-heading { margin-bottom: 1.5rem; }
.eyebrow { color: var(--accent-primary); font-size: .68rem; font-weight: 800; letter-spacing: .18em; line-height: 1.4; }
.web-h1, .web-h2, .web-strong { color: var(--text-primary); }
.web-h1 { font-size: clamp(1.8rem, 4vw, 2.5rem); line-height: 1.25; margin: .3rem 0 .25rem; }
.web-h2 { font-size: 1.25rem; line-height: 1.3; margin-top: .25rem; }
.heading-subtitle, .section-note, .card-heading-meta { color: var(--text-muted); font-size: .85rem; }
.outline-link, .text-link, .signout-link { color: var(--text-secondary); text-decoration: none; font-size: .85rem; cursor: pointer; }
.outline-link { padding: .55rem .85rem; border: 1px solid var(--border-hover); border-radius: 9px; white-space: nowrap; }
.outline-link:hover, .text-link:hover, .signout-link:hover { color: var(--accent-primary); border-color: var(--accent-border); }
.profile-hero { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-height: 178px; padding: 2rem; overflow: hidden; background-color: var(--bg-card); }
.profile-hero::after { content: ''; position: absolute; width: 260px; height: 260px; right: 8%; top: -100px; border-radius: 50%; background: var(--accent-soft); filter: blur(30px); pointer-events: none; }
.hero-copy, .hero-actions { display: flex; position: relative; z-index: 1; align-items: center; }
.hero-copy { gap: 1.3rem; min-width: 0; }
.hero-avatar { display: grid; place-items: center; width: 78px; height: 78px; flex-shrink: 0; border-radius: 23px; background: var(--accent-gradient); color: white; font-size: 2.2rem; font-weight: 700; box-shadow: 0 12px 26px var(--accent-soft); }
.hero-kicker { color: var(--accent-primary); font-size: .75rem; font-weight: 700; }
.hero-identity { min-width: 0; }
.hero-identity .web-h2 { margin: .2rem 0; font-size: 1.7rem; overflow-wrap: anywhere; }
.hero-identity .web-p { color: var(--text-muted); font-size: .84rem; }
.hero-actions { flex-direction: column; align-items: flex-end; gap: 1rem; }
.account-badge { display: inline-flex; align-items: center; gap: .45rem; padding: .4rem .7rem; border-radius: 999px; color: var(--success); background: var(--success-soft); font-size: .76rem; font-weight: 700; white-space: nowrap; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.signout-link { border: 0; background: transparent; padding: .25rem 0; }
.hero-decoration { position: absolute; right: 23%; bottom: -4rem; color: var(--accent-soft); font-size: 10rem; line-height: 1; pointer-events: none; }
.load-error { display: flex; justify-content: space-between; gap: 1rem; padding: .8rem 1rem; margin-top: 1rem; color: var(--error); font-size: .85rem; }
.load-error .web-button { border: 0; background: transparent; color: var(--accent-primary); cursor: pointer; }
.overview-section, .shortcut-section { margin-top: 2.1rem; }
.section-heading { margin-bottom: 1rem; }
.stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .9rem; }
.stat-card { display: flex; flex-direction: column; align-items: flex-start; min-height: 174px; padding: 1.2rem; text-decoration: none; }
.stat-icon { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; font-size: 1.1rem; font-weight: 800; }
.stat-icon.blue { color: #76a8ff; background: rgba(91, 138, 204, .16); }
.stat-icon.mint { color: #38cfa2; background: rgba(56, 207, 162, .14); }
.stat-icon.amber { color: #f0b461; background: rgba(240, 180, 97, .14); }
.stat-icon.pink { color: #e68eb5; background: rgba(230, 142, 181, .14); }
.stat-number { margin-top: .9rem; color: var(--text-primary); font-size: 2rem; font-weight: 750; line-height: 1; }
.stat-label { margin-top: .3rem; color: var(--text-secondary); font-size: .88rem; font-weight: 600; }
.stat-hint { margin-top: auto; padding-top: .65rem; color: var(--text-muted); font-size: .74rem; }
.profile-content-grid { display: grid; grid-template-columns: .9fr 1.1fr; gap: 1rem; margin-top: 1rem; }
.activity-card, .recent-card { min-width: 0; min-height: 338px; padding: 1.35rem; }
.activity-chart { display: flex; justify-content: space-around; height: 160px; gap: .6rem; margin-top: 1.35rem; border-bottom: 1px solid var(--border-color); }
.activity-day { display: flex; flex: 1; flex-direction: column; align-items: center; min-width: 0; }
.activity-value { height: 19px; color: var(--accent-primary); font-size: .7rem; font-weight: 700; }
.activity-track { display: flex; align-items: flex-end; width: min(100%, 35px); height: 105px; background: var(--accent-soft); border-radius: 7px 7px 0 0; overflow: hidden; }
.activity-bar { width: 100%; background: var(--accent-gradient); border-radius: 7px 7px 0 0; transition: height .3s ease; }
.activity-label { padding-top: .45rem; color: var(--text-muted); font-size: .7rem; white-space: nowrap; }
.activity-footer { color: var(--text-muted); font-size: .78rem; margin: 1rem 0 .65rem; }
.primary-link { display: inline-flex; align-items: center; gap: .5rem; color: var(--accent-primary); font-size: .83rem; font-weight: 700; text-decoration: none; }
.primary-link:hover { color: var(--accent-secondary); }
.recent-list { margin-top: .65rem; }
.recent-item { display: flex; align-items: center; gap: .8rem; padding: .75rem .15rem; border-bottom: 1px solid var(--border-color); text-decoration: none; }
.recent-item:last-child { border-bottom: 0; }
.recent-item:hover .recent-info .web-strong { color: var(--accent-primary); }
.recent-mark { display: grid; place-items: center; width: 36px; height: 36px; flex-shrink: 0; border-radius: 10px; color: var(--accent-primary); background: var(--accent-soft); font-size: .85rem; font-weight: 800; }
.recent-info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.recent-info .web-strong { font-size: .84rem; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.recent-info .web-small { color: var(--text-muted); font-size: .71rem; }
.recent-score { color: var(--text-primary); font-size: 1.15rem; font-weight: 800; white-space: nowrap; }
.recent-score .web-small { margin-left: .1rem; color: var(--text-muted); font-size: .7rem; font-weight: 400; }
.recent-arrow { color: var(--text-muted); font-size: 1.3rem; }
.recent-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 235px; gap: .4rem; color: var(--text-muted); text-align: center; font-size: .8rem; }
.recent-empty .web-strong { font-size: .95rem; }
.recent-empty .web-a { color: var(--accent-primary); text-decoration: none; margin-top: .45rem; font-weight: 700; }
.empty-symbol { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; color: var(--accent-primary); background: var(--accent-soft); font-size: 1.4rem; margin-bottom: .35rem; }
.shortcut-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .9rem; }
.shortcut { position: relative; display: flex; flex-direction: column; gap: .2rem; padding: 1rem 1.1rem; text-decoration: none; }
.shortcut span { color: var(--accent-primary); font-size: 1.35rem; line-height: 1.2; }
.shortcut .web-strong { font-size: .9rem; }
.shortcut .web-small { color: var(--text-muted); font-size: .75rem; }
.shortcut .web-b { position: absolute; top: 1rem; right: 1rem; color: var(--text-muted); font-size: .85rem; font-weight: 400; }
@media (max-width: 800px) { .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .profile-content-grid { grid-template-columns: 1fr; } }
@media (max-width: 520px) { .profile-view { padding-top: .4rem; } .profile-heading { align-items: flex-start; } .heading-subtitle, .section-note { display: none; } .profile-hero { padding: 1.25rem; align-items: flex-start; } .hero-avatar { width: 58px; height: 58px; border-radius: 17px; font-size: 1.6rem; } .hero-copy { gap: .8rem; } .hero-identity .web-h2 { font-size: 1.25rem; } .hero-identity .web-p { font-size: .73rem; } .hero-actions { gap: .5rem; } .account-badge { font-size: 0; padding: .4rem; } .status-dot { width: 8px; height: 8px; } .signout-link { font-size: .72rem; } .stat-grid, .shortcut-grid { gap: .65rem; } .stat-card { min-height: 145px; padding: .9rem; } .stat-number { font-size: 1.7rem; } .shortcut-grid { grid-template-columns: 1fr; } .shortcut { padding: .8rem 1rem; } }
</style>
