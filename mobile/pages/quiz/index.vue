<!-- mobile/pages/quiz/index.vue -->
<!-- uni-app port of src/views/QuizView.vue -->
<template>
  <AppShell>
  <view class="quiz-view" :class="{ 'submission-locked': completionPayload }">
    <!-- Quiz Header -->
    <view class="quiz-header">
      <view class="quiz-header-main">
        <view class="quiz-title">
          <text>{{ bank?.name || '答题' }}</text>
          <ModeSelector :initial-mode="quizStore.mode" @change="handleModeChange" />
        </view>
        <view class="quiz-actions hide-mobile">
          <view
            class="btn btn-sm"
            :class="showAiSidebar ? 'btn-primary' : 'btn-secondary'"
            @click="toggleAiSidebar"
          >
            <AppIcon name="i0a3152c6" :size="14" :colored="true" />
            AI
          </view>
          <view class="btn btn-sm btn-secondary" @click="showNoteDrawer = true">
            <AppIcon name="ifaddd8c9" :size="14" />
            题目笔记
            <text v-if="quizStore.currentNote?.content" class="note-dot"></text>
          </view>
          <view
            class="btn btn-sm btn-secondary"
            :class="{ active: quizStore.shuffled }"
            @click="toggleShuffle"
            :style="{ opacity: quizStore.mode === 'exam' ? 0.4 : 1 }"
          >
            <AppIcon name="i4a70df49" :size="14" />
            随机
          </view>
          <view class="btn btn-sm btn-secondary" @click="exitQuiz">
            <AppIcon name="i7176c948" :size="14" />
            退出
          </view>
        </view>
      </view>
      <view class="progress-bar">
        <view class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></view>
      </view>
    </view>

    <!-- Three Column Layout -->
    <view class="quiz-layout">
      <!-- Left: Question Nav -->
      <view class="quiz-sidebar hide-mobile">
        <QuestionNav />
      </view>

      <!-- Center: Question Content + AI Sidebar (adjacent) -->
      <view class="center-panel">
        <!-- Center: Question Content -->
        <view class="quiz-content">
        <!-- Mobile Action Bar -->
        <view class="mobile-action-bar hide-desktop">
          <view class="action-btn" @click="showMobileNav = true" title="题目导航">
            <AppIcon name="i6b582384" :size="18" />
          </view>
          <view class="action-btn" @click="showMobileAi = true" title="AI解析">
            <AppIcon name="i0a3152c6" :size="18" :colored="true" />
          </view>
          <view class="action-btn" @click="showMobileNote = true" title="笔记">
            <AppIcon name="ifaddd8c9" :size="18" />
            <text v-if="quizStore.currentNote?.content" class="action-dot"></text>
          </view>
          <view
            v-if="!quizStore.batchMode"
            class="action-btn"
            :class="{ active: isCurrentFav, toggling: favAnim }"
            @click="toggleCurrentFav"
            :title="isCurrentFav ? '取消收藏' : '收藏题目'"
          >
            <AppIcon name="i2630959a" :size="18" :fill="isCurrentFav ? 'currentColor' : 'none'" />
          </view>
          <view
            v-if="quizStore.batchMode"
            class="action-btn batch-delete-action"
            :class="{ disabled: quizStore.selectedQuestionIds.length === 0 }"
            @click="handleBatchDelete"
            title="删除"
          >
            <AppIcon name="i8c16f120" :size="18" />
          </view>
          <view
            v-if="!quizStore.batchMode"
            class="action-btn"
            :class="{ active: quizStore.shuffled }"
            @click="toggleShuffle"
            :style="{ opacity: quizStore.mode === 'exam' ? 0.4 : 1 }"
            title="随机"
          >
            <AppIcon name="i4a70df49" :size="18" />
          </view>
          <view class="action-btn exit-btn" @click="exitQuiz" title="退出">
            <AppIcon name="i7176c948" :size="18" />
          </view>
        </view>

        <!-- Loading skeleton -->
        <view v-if="quizLoading" class="question-wrapper animate-fadeIn">
          <view class="question-card card">
            <view class="skeleton skeleton-title" style="width: 85%; margin-bottom: 1.5rem;"></view>
            <view v-for="i in 4" :key="i" class="skeleton-option">
              <view class="skeleton" style="width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;"></view>
              <view class="skeleton skeleton-text" style="flex: 1;"></view>
            </view>
          </view>
          <view class="bottom-nav-bar">
            <view class="skeleton" style="width: 100px; height: 36px;"></view>
            <view class="skeleton" style="width: 80px; height: 16px;"></view>
            <view class="skeleton" style="width: 100px; height: 36px;"></view>
          </view>
        </view>

        <!-- Empty state -->
        <view v-else-if="!quizStore.currentQuestion" class="empty card">
          <view class="empty-state-icon">
            <AppIcon name="i3258529d" :size="32" />
          </view>
          <text class="text-muted">题目加载中...</text>
        </view>

        <!-- Question content -->
        <view v-else class="question-wrapper animate-fadeIn" :key="`${quizStore.bankId}:${quizStore.currentQuestion?.id}`">
          <view class="question-card card">
            <SingleChoice
              v-if="quizStore.currentQuestion.type === 'single'"
              :question="quizStore.currentQuestion"
              :mode="quizStore.mode"
              @answer="handleAnswer"
            />
            <MultipleChoice
              v-else-if="quizStore.currentQuestion.type === 'multi'"
              :question="quizStore.currentQuestion"
              :mode="quizStore.mode"
              @answer="handleAnswer"
            />
            <FillBlank
              v-else-if="quizStore.currentQuestion.type === 'fill'"
              :question="quizStore.currentQuestion"
              :mode="quizStore.mode"
              @answer="handleAnswer"
            />
            <EssayQuestion
              v-else-if="quizStore.currentQuestion.type === 'essay'"
              :question="quizStore.currentQuestion"
              :mode="quizStore.mode"
              :initial-answer="quizStore.answers[quizStore.currentQuestion?.id]"
              @answer="handleAnswer"
            />
          </view>

          <!-- Bottom Nav -->
          <view class="bottom-nav-bar">
            <view
              class="btn btn-secondary"
              :style="{ opacity: quizStore.currentIndex === 0 ? 0.4 : 1 }"
              @click="prevQuestion"
            >
              <AppIcon name="ia032faaf" :size="16" />
              上一题
            </view>
            <text class="nav-counter">
              {{ quizStore.currentIndex + 1 }} / {{ quizStore.totalQuestions }}
            </text>
            <view
              v-if="quizStore.currentIndex < quizStore.totalQuestions - 1"
              class="btn btn-primary"
              @click="nextQuestion"
            >
              下一题
              <AppIcon name="i969f20dd" :size="16" />
            </view>
            <view
              v-else
              class="btn btn-primary"
              @click="finishQuiz"
            >
              {{ finishing ? '保存中...' : completionPayload ? '重试保存' : '完成答题' }}
              <AppIcon name="i24b94a11" :size="16" />
            </view>
          </view>
        </view>
      </view>

        <!-- Resize handle + Right: AI Panel -->
        <view
          v-if="showAiSidebar"
          class="resize-handle"
          @touchstart="startResize"
          @touchmove.stop.prevent="onResize"
          @touchend="stopResize"
          @touchcancel="stopResize"
          title="拖动调整宽度"
        ></view>
        <ViewTransition name="sidebar-slide">
          <view
            v-if="showAiSidebar"
            class="ai-sidebar hide-mobile"
            :style="{ width: aiSidebarWidth + 'px' }"
          >
            <view class="ai-sidebar-toggle" @click="toggleAiSidebar" title="收起 AI 面板">
              <AppIcon name="ia032faaf" :size="14" />
            </view>
            <AiPanel
              :question="quizStore.currentQuestion"
              :userAnswer="quizStore.answers[quizStore.currentQuestion?.id]"
            />
          </view>
        </ViewTransition>
        <!-- Floating toggle button when sidebar is hidden -->
        <view
          v-if="!showAiSidebar"
          class="ai-sidebar-show-btn hide-mobile"
          @click="toggleAiSidebar"
          title="展开 AI 面板"
        >
          <AppIcon name="i0a3152c6" :size="14" :colored="true" />
        </view>
      </view>
    </view>

    <!-- Mobile Question Nav Drawer -->
    <ViewTransition name="drawer">
      <view v-if="showMobileNav" class="drawer-overlay" @click.self="showMobileNav = false">
        <view class="mobile-drawer card" @click.stop>
          <view class="drawer-header">
            <text>题目导航</text>
            <view class="close-btn" @click="showMobileNav = false">
              <AppIcon name="ieba488ee" :size="18" />
            </view>
          </view>
          <view class="drawer-body">
            <QuestionNav />
          </view>
        </view>
      </view>
    </ViewTransition>

    <!-- Mobile AI Drawer -->
    <ViewTransition name="drawer">
      <view v-if="showMobileAi" class="drawer-overlay" @click.self="showMobileAi = false">
        <view class="mobile-drawer card" @click.stop>
          <view class="drawer-header">
            <text>AI 题目解析</text>
            <view class="close-btn" @click="showMobileAi = false">
              <AppIcon name="ieba488ee" :size="18" />
            </view>
          </view>
          <view class="drawer-body">
            <AiPanel
              :question="quizStore.currentQuestion"
              :userAnswer="quizStore.answers[quizStore.currentQuestion?.id]"
            />
          </view>
        </view>
      </view>
    </ViewTransition>

    <!-- Mobile Note Drawer -->
    <ViewTransition name="drawer">
      <view v-if="showMobileNote" class="drawer-overlay" @click.self="showMobileNote = false">
        <view class="mobile-drawer card" @click.stop>
          <view class="drawer-header">
            <text>题目笔记</text>
            <view class="close-btn" @click="showMobileNote = false">
              <AppIcon name="ieba488ee" :size="18" />
            </view>
          </view>
          <view class="drawer-body note-drawer-body">
            <textarea
              class="note-textarea"
              v-model="noteDraft"
              placeholder="记录这道题的要点、易错点、记忆技巧..."
              placeholder-class="input-placeholder"
              rows="10"
            ></textarea>
            <view class="note-drawer-footer">
              <view
                class="btn btn-sm btn-primary save-note-btn"
                :class="{ success: justSaved }"
                :style="{ opacity: quizStore.noteSaving ? 0.4 : 1 }"
                @click="saveNote"
              >
                <text v-if="quizStore.noteSaving">保存中...</text>
                <view v-else-if="justSaved" class="save-success">
                  <AppIcon name="i48f83df6" :size="14" />
                  已保存
                </view>
                <view v-else>
                  <AppIcon name="iaf55b1ca" :size="14" />
                  保存笔记
                </view>
              </view>
              <text v-if="quizStore.currentNote?.updatedAt" class="text-muted text-xs">
                上次保存 {{ formatTime(quizStore.currentNote.updatedAt) }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </ViewTransition>

    <!-- Desktop Left Note Drawer -->
    <view v-if="showNoteDrawer" class="note-drawer-overlay hide-mobile" @click.self="showNoteDrawer = false">
      <view class="note-drawer card" @click.stop>
        <view class="note-drawer-header">
          <view class="note-drawer-title">
            <AppIcon name="ifaddd8c9" :size="16" />
            题目笔记
          </view>
          <view class="close-btn" @click="showNoteDrawer = false">
            <AppIcon name="ieba488ee" :size="18" />
          </view>
        </view>
        <textarea
          class="note-textarea"
          v-model="noteDraft"
          placeholder="记录这道题的要点、易错点、记忆技巧..."
          placeholder-class="input-placeholder"
          rows="14"
        ></textarea>
        <view class="note-drawer-footer">
          <view
            class="btn btn-sm btn-primary save-note-btn"
            :class="{ success: justSaved }"
            :style="{ opacity: quizStore.noteSaving ? 0.4 : 1 }"
            @click="saveNote"
          >
            <text v-if="quizStore.noteSaving">保存中...</text>
            <view v-else-if="justSaved" class="save-success">
              <AppIcon name="i48f83df6" :size="14" />
              已保存
            </view>
            <view v-else>
              <AppIcon name="iaf55b1ca" :size="14" />
              保存笔记
            </view>
          </view>
          <text v-if="quizStore.currentNote?.updatedAt" class="text-muted text-xs">
            上次保存 {{ formatTime(quizStore.currentNote.updatedAt) }}
          </text>
        </view>
      </view>
    </view>
    <!-- 退出确认弹窗 -->
    <ConfirmModal
      v-if="showExitConfirm"
      title="退出答题"
      message="确定要退出答题吗？进度已自动保存，可下次继续。"
      confirm-text="退出"
      cancel-text="继续答题"
      type="info"
      @confirm="confirmExit"
      @cancel="showExitConfirm = false"
    />
  </view>
  </AppShell>
</template>

<script setup>
import { onShow, onHide, onBackPress } from '@dcloudio/uni-app'
import { readPendingSubmission, writePendingSubmission, clearPendingSubmission } from '../../utils/pendingSubmission.js'
import { onPageReady } from '../../composables/usePageReady.js'
const initializePage = callback => onPageReady(callback, { refresh: false })

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from '../../utils/router.js'
import { useBankStore } from '../../stores/bank.js'
import { useQuizStore } from '../../stores/quiz.js'
import { useHistoryStore } from '../../stores/history.js'
import { useFavoriteStore } from '../../stores/favorite.js'
import { burstConfetti } from '../../utils/confetti.js'
import AppShell from '../../components/AppShell.vue'
import SingleChoice from '../../components/SingleChoice.vue'
import MultipleChoice from '../../components/MultipleChoice.vue'
import FillBlank from '../../components/FillBlank.vue'
import EssayQuestion from '../../components/EssayQuestion.vue'
import QuestionNav from '../../components/QuestionNav.vue'
import AiPanel from '../../components/AiPanel.vue'
import ModeSelector from '../../components/ModeSelector.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'

const route = useRoute()
const router = useRouter()
const bankStore = useBankStore()
const quizStore = useQuizStore()
const historyStore = useHistoryStore()
const favoriteStore = useFavoriteStore()

const showExitConfirm = ref(false)

const showNoteDrawer = ref(false)
const showMobileNav = ref(false)
const showMobileAi = ref(false)
const showMobileNote = ref(false)
const showAiSidebar = ref(true)
const aiSidebarWidth = ref(420)
const quizLoading = ref(true)
const sessionRestored = ref(false)
const isPageActive = ref(true)
const finishing = ref(false)
const completionPayload = ref(null)
let cachedSession = null
const favAnim = ref(false)

const bank = computed(() => {
  const targetId = String(route.params.bankId)
  return bankStore.allBanks.find(b => String(b.id) === targetId) || null
})

const progressPercent = computed(() => {
  if (quizStore.totalQuestions === 0) return 0
  return ((quizStore.currentIndex + 1) / quizStore.totalQuestions) * 100
})

const noteContent = computed(() => quizStore.currentNote?.content || '')
const noteDraft = ref('')
const justSaved = ref(false)

function syncNoteDraft() {
  noteDraft.value = noteContent.value
}

watch(noteContent, syncNoteDraft, { immediate: true })

async function saveNote() {
  if (quizStore.noteSaving) return
  try {
    await quizStore.saveCurrentNote(noteDraft.value)
    justSaved.value = true
    setTimeout(() => {
      justSaved.value = false
    }, 1500)
  } catch (e) {
    console.error('保存笔记失败:', e)
    uni.showModal({
      title: '保存失败',
      content: '保存笔记失败，请检查后端服务是否启动。',
      showCancel: false,
    })
  }
}

function formatTime(iso) {
  try {
    const d = new Date(iso)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  } catch {
    return ''
  }
}

function handleModeChange(mode) {
  quizStore.setMode(mode)
}

function toggleShuffle() {
  // 原版用 :disabled="quizStore.mode === 'exam'" 禁用，App 端 view 没有 disabled
  if (quizStore.mode === 'exam') return
  quizStore.toggleShuffle()
}

function handleAnswer(answer) {
  if (completionPayload.value) return
  quizStore.submitAnswer(answer)
  quizStore.persistSession()
}

function nextQuestion() {
  quizStore.nextQuestion()
  quizStore.persistSession()
}

function prevQuestion() {
  quizStore.prevQuestion()
  quizStore.persistSession()
}

const isCurrentFav = computed(() => {
  const q = quizStore.currentQuestion
  if (!q) return false
  return favoriteStore.isFavorited(quizStore.bankId, q.id)
})

async function toggleCurrentFav() {
  const q = quizStore.currentQuestion
  if (!q) return
  // App 端没有鼠标坐标，固定在屏幕中心绽放彩纸
  const { windowWidth } = uni.getSystemInfoSync()
  burstConfetti(windowWidth / 2, 300)
  favAnim.value = true
  await favoriteStore.toggleFavorite(
    quizStore.bankId,
    q.id,
    bank.value?.name || '未知题库',
    q
  )
  setTimeout(() => { favAnim.value = false }, 500)
}

function buildWrongQuestions() {
  const wrongIds = quizStore.wrongQuestionIds || []
  const answers = quizStore.answers || {}
  return wrongIds.map(id => {
    const q = quizStore.questions.find(item => item.id === id)
    if (!q) return null
    return {
      id: q.id,
      type: q.type,
      question: q.question,
      options: q.options || null,
      blanks: q.blanks || null,
      answer: q.answer,
      userAnswer: answers[id],
      score: q.score,
    }
  }).filter(Boolean)
}

async function finishQuiz() {
  if (finishing.value) return
  finishing.value = true
  if (!completionPayload.value) {
    quizStore.finishQuiz()
    completionPayload.value = JSON.parse(JSON.stringify({
      bankId: quizStore.bankId, bankName: bank.value?.name || '未知题库',
      mode: quizStore.mode, score: quizStore.finalScore,
      correctCount: quizStore.correctCount, wrongCount: quizStore.wrongCount,
      totalQuestions: quizStore.totalQuestions, duration: quizStore.duration,
      answers: quizStore.answers, wrongQuestionIds: quizStore.wrongQuestionIds,
      wrongQuestions: buildWrongQuestions(), questions: quizStore.questions,
      submissionId: quizStore.submissionId,
    }))
    writePendingSubmission(completionPayload.value)
  }
  try {
    const record = await historyStore.addRecord(completionPayload.value)
    // 清除保存的进度
    await quizStore.clearQuizSession()
    clearPendingSubmission(completionPayload.value.bankId)
    if (record?.id) {
      router.replace(`/result/${record.id}`)
    }
  } catch (err) {
    console.error('完成答题失败：', err)
    uni.showModal({
      title: '保存失败',
      content: '保存结果尚未确认，请检查网络后点击「重试保存」。重试会发送同一份答案。',
      showCancel: false,
    })
  } finally {
    finishing.value = false
  }
}

async function exitQuiz() {
  showExitConfirm.value = true
}

async function confirmExit() {
  showExitConfirm.value = false
  if (!await quizStore.persistSession()) {
    uni.showModal({ title: '进度尚未保存', content: '请检查网络后重试退出，当前答案仍保留在页面中。', showCancel: false })
    return
  }
  router.replace('/')
}

function handleBatchDelete() {
  if (quizStore.selectedQuestionIds.length === 0) return
  uni.showModal({
    title: '删除题目',
    content: `确定要删除选中的 ${quizStore.selectedQuestionIds.length} 道题目吗？`,
    success: (res) => {
      if (res.confirm) {
        quizStore.removeSelectedQuestions()
      }
    },
  })
}

// AI Sidebar resize
const isResizing = ref(false)
const resizeStartX = ref(0)
const resizeStartWidth = ref(0)

// App 端没有 document，改为从 touch 事件里取坐标
function pointerX(e) {
  const t = e.touches?.[0] || e.changedTouches?.[0] || e
  return t.clientX
}

function startResize(e) {
  isResizing.value = true
  resizeStartX.value = pointerX(e)
  resizeStartWidth.value = aiSidebarWidth.value
}

function onResize(e) {
  if (!isResizing.value) return
  const delta = resizeStartX.value - pointerX(e)
  const newWidth = Math.max(280, Math.min(700, resizeStartWidth.value + delta))
  aiSidebarWidth.value = newWidth
}

function stopResize() {
  isResizing.value = false
}

function toggleAiSidebar() {
  showAiSidebar.value = !showAiSidebar.value
}

onUnmounted(() => {
  stopResize()
})

watch(() => quizStore.currentQuestion?.id, () => {
  if (isPageActive.value && String(quizStore.bankId) === String(route.params.bankId)) quizStore.loadCurrentNote().catch(() => {})
})

onHide(() => {
  isPageActive.value = false
  if (String(quizStore.bankId) === String(route.params.bankId) && !quizLoading.value) {
    cachedSession = JSON.parse(JSON.stringify({ answers: quizStore.answers, currentIndex: quizStore.currentIndex,
      mode: quizStore.mode, shuffled: quizStore.shuffled, startTime: quizStore.startTime,
      wrongIds: quizStore.wrongQuestionIds, submitted: quizStore.submittedQuestionIds,
      submissionId: quizStore.submissionId, questionOrder: quizStore.questions.map(q => q.id) }))
    if (!completionPayload.value) quizStore.persistSession()
  }
})
onShow(() => {
  isPageActive.value = true
  if (cachedSession && bank.value && String(quizStore.bankId) !== String(bank.value.id)) {
    quizStore.startQuiz(bank.value, { session: cachedSession })
    quizStore.loadCurrentNote().catch(() => {})
  }
})
onBackPress(event => {
  if (event.from === 'navigateBack') return false
  if (showMobileNav.value || showMobileAi.value || showMobileNote.value || showNoteDrawer.value) {
    showMobileNav.value = false; showMobileAi.value = false; showMobileNote.value = false; showNoteDrawer.value = false
    return true
  }
  showExitConfirm.value = !showExitConfirm.value
  return true
})

initializePage(async () => {
  await bankStore.loadBuiltinBanks()
  await bankStore.loadUserBanks()
  favoriteStore.load()
  const b = bank.value
  if (!b) {
    // 题库不存在，保持骨架屏直接跳转，不渲染空白
    router.push('/')
    return
  }
  // 尝试加载上次的答题进度
  const session = await quizStore.loadQuizSession(b.id)
  const pending = readPendingSubmission(b.id)
  if (pending) {
    completionPayload.value = pending
    quizStore.startQuiz({ ...b, questions: pending.questions }, { session: {
      answers: pending.answers, currentIndex: Math.max(0, pending.questions.length - 1),
      mode: pending.mode, startTime: Date.now() - pending.duration * 1000,
      submissionId: pending.submissionId, submitted: pending.questions.map(q => q.id),
      wrongIds: pending.wrongQuestionIds,
    } })
  } else if (session) {
    quizStore.startQuiz(b, { mode: quizStore.mode, shuffled: quizStore.shuffled, session })
    sessionRestored.value = true
  } else {
    quizStore.startQuiz(b, { mode: quizStore.mode, shuffled: quizStore.shuffled })
  }
  quizStore.loadAllNotesForBank(quizStore.bankId)
  await quizStore.loadCurrentNote()
  quizLoading.value = false
})
</script>

<style scoped>
.submission-locked .question-card { pointer-events: none; }
.quiz-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  overflow: hidden;
}

.quiz-header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.quiz-header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quiz-title {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.quiz-title > text {
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.quiz-actions {
  display: flex;
  gap: 0.5rem;
}

.quiz-layout {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
  height: calc(100vh - 140px);
  overflow: hidden;
  position: relative;
}

.quiz-sidebar {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
  position: static;
}

/* Center panel holds content + AI sidebar + resize handle */
.center-panel {
  display: flex;
  align-items: start;
  height: 100%;
  overflow: hidden;
  min-width: 0;
}

.quiz-content {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Resize handle - between content and AI sidebar */
.resize-handle {
  width: 6px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  transition: background 0.15s ease;
  flex-shrink: 0;
  z-index: 10;
  position: relative;
}

.resize-handle:hover,
.resize-handle:active {
  background: var(--accent-primary);
}

/* AI Sidebar */
.ai-sidebar {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
  position: relative;
  flex-shrink: 0;
}

.ai-sidebar-toggle {
  position: absolute;
  top: 50%;
  left: -18px;
  transform: translateY(-50%);
  width: 18px;
  height: 48px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-right: none;
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.15s ease;
}

.ai-sidebar-toggle:hover {
  color: var(--accent-primary);
  background: var(--accent-soft);
}

/* Sidebar slide transition */
.sidebar-slide-enter-active {
  transition: width 0.25s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.25s ease;
}
.sidebar-slide-leave-active {
  transition: width 0.2s cubic-bezier(0.4, 0, 1, 1),
              opacity 0.2s ease;
}
.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  width: 0 !important;
  opacity: 0;
}

/* Floating button to show AI sidebar when hidden */
.ai-sidebar-show-btn {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 56px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-right: none;
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  color: var(--accent-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.15s ease;
}

.ai-sidebar-show-btn:hover {
  background: var(--accent-soft);
  border-color: var(--accent-border);
}

.question-wrapper {
  display: flex;
  flex-direction: column;
}

.question-card {
  overflow: visible;
}

.question-card {
  padding: 1.5rem;
}

.skeleton-option {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  margin-bottom: 0.75rem;
}

.empty {
  padding: 3rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.bottom-nav-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem 0;
}

.nav-counter {
  font-size: 0.875rem;
  color: var(--text-muted);
  font-weight: 500;
}

/* Note dot */
.note-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-primary);
  margin-left: auto;
}

.quiz-actions .note-dot {
  margin-left: 0;
}

/* Desktop Note Drawer */
.note-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.4);
}

.note-drawer {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 360px;
  max-width: 85vw;
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  border-radius: 0;
  border-right: 1px solid var(--border-color);
  animation: slideInLeft 0.2s ease-out;
}

@keyframes slideInLeft {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

.note-drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.note-drawer-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.note-textarea {
  flex: 1;
  width: 100%;
  padding: 0.875rem 1rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.7;
  resize: none;
  transition: border-color 0.15s ease;
}

.note-textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.note-textarea::placeholder {
  color: var(--text-muted);
}

.note-drawer-footer {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.save-note-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-width: 6.5rem;
  transition: all 0.2s ease;
}

.save-note-btn.success {
  background: var(--success);
  border-color: var(--success);
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.35);
}

.save-success {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.save-success .app-icon {
  animation: check-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes check-pop {
  0% { transform: scale(0) rotate(-45deg); opacity: 0; }
  60% { transform: scale(1.3) rotate(10deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

/* Mobile Action Bar */
.mobile-action-bar {
  display: none;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 0.5rem;
}

.action-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 36px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover, .action-btn.active {
  background: var(--accent-soft);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.action-btn.toggling {
  animation: star-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-primary);
}

.exit-btn {
  margin-left: auto;
  color: var(--error);
}

.exit-btn:hover {
  background: var(--error-soft);
  border-color: var(--error);
  color: var(--error);
}

.batch-delete-action {
  color: var(--error);
}

.batch-delete-action:hover:not(.disabled) {
  background: var(--error-soft);
  border-color: var(--error);
}

.batch-delete-action.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Mobile Drawers */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 200;
  display: flex;
  justify-content: flex-end;
}

/* Batch Operation Toolbar */
.batch-toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  margin-bottom: 0.75rem;
}

.batch-select-all {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text-secondary);
  user-select: none;
}

.batch-select-all:hover {
  color: var(--text-primary);
}

.batch-checkbox {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid var(--border-color);
  background: var(--bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  color: transparent;
}

.batch-checkbox.selected {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: white;
}

.batch-count {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-left: auto;
}

.batch-delete-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--error-soft);
  color: var(--error);
  border: 1px solid var(--error-border);
}

.batch-delete-btn:hover:not(:disabled) {
  background: rgba(244, 63, 94, 0.25);
}

.batch-delete-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.mobile-drawer {
  width: 320px;
  max-width: 90vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-left: 1px solid var(--border-color);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.drawer-header > text {
  font-size: 1rem;
  font-weight: 600;
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
  padding: 1rem;
}

.note-drawer-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Drawer transition */
.drawer-enter-active, .drawer-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-enter-active .mobile-drawer, .drawer-leave-active .mobile-drawer {
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-enter-from, .drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from .mobile-drawer, .drawer-leave-to .mobile-drawer {
  transform: translateX(100%);
}

@media (max-width: 768px) {
  .quiz-layout {
    grid-template-columns: 1fr;
  }

  .quiz-view {
    padding-bottom: 72px;
  }

  .mobile-action-bar {
    display: flex;
  }

  .bottom-nav-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 90;
    background: var(--bg-surface);
    border-top: 1px solid var(--border-color);
    padding: 0.6rem 1rem;
    padding-bottom: calc(0.6rem + env(safe-area-inset-bottom, 0px));
  }

  .quiz-header {
    flex-direction: column;
    gap: 0.5rem;
  }

  .quiz-header-main {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .quiz-title {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .quiz-title > text {
    font-size: 1.2rem;
    width: 100%;
  }

  .question-card {
    padding: 1rem;
    padding-bottom: 80px;
  }

  .nav-counter {
    font-size: 0.8rem;
  }

  .single-choice,
  .multiple-choice,
  .fill-blank,
  .essay-question {
    padding-bottom: 80px;
  }
}
</style>
