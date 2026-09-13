<template>
  <div class="quiz-view">
    <!-- Quiz Header -->
    <div class="quiz-header">
      <div class="quiz-header-main">
        <div class="quiz-title">
          <h1>{{ bank?.name || '答题' }}</h1>
          <ModeSelector :initial-mode="quizStore.mode" @change="handleModeChange" />
        </div>
        <div class="quiz-actions hide-mobile">
          <button
            class="btn btn-sm"
            :class="showAiSidebar ? 'btn-primary' : 'btn-secondary'"
            @click="toggleAiSidebar"
          >
            <svg width="14" height="14" viewBox="0 0 1024 1024">
              <path d="M122.281 287v450L317.15 624.5v-225z" fill="#0423DB"/>
              <path d="M317.15 399.5v225L512 512z" fill="#1C54E4"/>
              <path d="M512 512L317.15 399.5l389.625-225.131L901.719 287z" fill="#AB9BFF"/>
              <path d="M317.15 399.5L122.281 287 512 62l194.775 112.369z" fill="#7347FF"/>
              <path d="M901.719 737L512 962 317.15 849.5l389.7-225z" fill="#00CFCA"/>
              <path d="M706.85 624.5L901.719 512v225z m-389.7 225L122.281 737 512 512l194.85 112.5z" fill="#00EBD2"/>
            </svg>
            AI
          </button>
          <button class="btn btn-sm btn-secondary" @click="showNoteDrawer = true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            题目笔记
            <span v-if="quizStore.currentNote?.content" class="note-dot"></span>
          </button>
          <button
            class="btn btn-sm btn-secondary"
            :class="{ active: quizStore.shuffled }"
            @click="toggleShuffle"
            :disabled="quizStore.mode === 'exam'"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
            </svg>
            随机
          </button>
          <button class="btn btn-sm btn-secondary" @click="exitQuiz">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            退出
          </button>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>

    <!-- Three Column Layout -->
    <div class="quiz-layout">
      <!-- Left: Question Nav -->
      <aside class="quiz-sidebar hide-mobile">
        <QuestionNav />
      </aside>

      <!-- Center: Question Content + AI Sidebar (adjacent) -->
      <div class="center-panel">
        <!-- Center: Question Content -->
        <section class="quiz-content">
        <!-- Mobile Action Bar -->
        <div class="mobile-action-bar hide-desktop">
          <button class="action-btn" @click="showMobileNav = true" title="题目导航">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
          </button>
          <button class="action-btn" @click="showMobileAi = true" title="AI解析">
            <svg width="18" height="18" viewBox="0 0 1024 1024">
              <path d="M122.281 287v450L317.15 624.5v-225z" fill="#0423DB"/>
              <path d="M317.15 399.5v225L512 512z" fill="#1C54E4"/>
              <path d="M512 512L317.15 399.5l389.625-225.131L901.719 287z" fill="#AB9BFF"/>
              <path d="M317.15 399.5L122.281 287 512 62l194.775 112.369z" fill="#7347FF"/>
              <path d="M901.719 737L512 962 317.15 849.5l389.7-225z" fill="#00CFCA"/>
              <path d="M706.85 624.5L901.719 512v225z m-389.7 225L122.281 737 512 512l194.85 112.5z" fill="#00EBD2"/>
            </svg>
          </button>
          <button class="action-btn" @click="showMobileNote = true" title="笔记">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <span v-if="quizStore.currentNote?.content" class="action-dot"></span>
          </button>
          <button
            v-if="!quizStore.batchMode"
            class="action-btn"
            :class="{ active: isCurrentFav, toggling: favAnim }"
            @click="toggleCurrentFav"
            :title="isCurrentFav ? '取消收藏' : '收藏题目'"
            ref="favBtnRef"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" :fill="isCurrentFav ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
          <button
            v-if="quizStore.batchMode"
            class="action-btn batch-delete-action"
            :class="{ disabled: quizStore.selectedQuestionIds.length === 0 }"
            @click="handleBatchDelete"
            title="删除"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
          <button
            v-if="!quizStore.batchMode"
            class="action-btn"
            :class="{ active: quizStore.shuffled }"
            @click="toggleShuffle"
            :disabled="quizStore.mode === 'exam'"
            title="随机"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
            </svg>
          </button>
          <button class="action-btn exit-btn" @click="exitQuiz" title="退出">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Loading skeleton -->
        <div v-if="quizLoading" class="question-wrapper animate-fadeIn">
          <div class="question-card card">
            <div class="skeleton skeleton-title" style="width: 85%; margin-bottom: 1.5rem;"></div>
            <div v-for="i in 4" :key="i" class="skeleton-option">
              <div class="skeleton" style="width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;"></div>
              <div class="skeleton skeleton-text" style="flex: 1;"></div>
            </div>
          </div>
          <div class="bottom-nav-bar">
            <div class="skeleton" style="width: 100px; height: 36px;"></div>
            <div class="skeleton" style="width: 80px; height: 16px;"></div>
            <div class="skeleton" style="width: 100px; height: 36px;"></div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="!quizStore.currentQuestion" class="empty card">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <p class="text-muted">题目加载中...</p>
        </div>

        <!-- Question content -->
        <div v-else class="question-wrapper animate-fadeIn" :key="quizStore.currentIndex">
          <div class="question-card card">
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
          </div>

          <!-- Bottom Nav -->
          <div class="bottom-nav-bar">
            <button
              class="btn btn-secondary"
              :disabled="quizStore.currentIndex === 0"
              @click="prevQuestion"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
              上一题
            </button>
            <span class="nav-counter">
              {{ quizStore.currentIndex + 1 }} / {{ quizStore.totalQuestions }}
            </span>
            <button
              v-if="quizStore.currentIndex < quizStore.totalQuestions - 1"
              class="btn btn-primary"
              @click="nextQuestion"
            >
              下一题
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9,18 15,12 9,6"/>
              </svg>
            </button>
            <button
              v-else
              class="btn btn-primary"
              @click="finishQuiz"
            >
              完成答题
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            </button>
          </div>
        </div>
      </section>

        <!-- Resize handle + Right: AI Panel -->
        <div
          v-if="showAiSidebar"
          class="resize-handle"
          @mousedown="startResize"
          title="拖动调整宽度"
        ></div>
        <transition name="sidebar-slide">
          <aside
            v-if="showAiSidebar"
            class="ai-sidebar hide-mobile"
            :style="{ width: aiSidebarWidth + 'px' }"
          >
            <button class="ai-sidebar-toggle" @click="toggleAiSidebar" title="收起 AI 面板">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
            </button>
            <AiPanel
              :question="quizStore.currentQuestion"
              :userAnswer="quizStore.answers[quizStore.currentQuestion?.id]"
            />
          </aside>
        </transition>
        <!-- Floating toggle button when sidebar is hidden -->
        <button
          v-if="!showAiSidebar"
          class="ai-sidebar-show-btn hide-mobile"
          @click="toggleAiSidebar"
          title="展开 AI 面板"
        >
          <svg width="14" height="14" viewBox="0 0 1024 1024">
            <path d="M122.281 287v450L317.15 624.5v-225z" fill="#0423DB"/>
            <path d="M317.15 399.5v225L512 512z" fill="#1C54E4"/>
            <path d="M512 512L317.15 399.5l389.625-225.131L901.719 287z" fill="#AB9BFF"/>
            <path d="M317.15 399.5L122.281 287 512 62l194.775 112.369z" fill="#7347FF"/>
            <path d="M901.719 737L512 962 317.15 849.5l389.7-225z" fill="#00CFCA"/>
            <path d="M706.85 624.5L901.719 512v225z m-389.7 225L122.281 737 512 512l194.85 112.5z" fill="#00EBD2"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile Question Nav Drawer -->
    <transition name="drawer">
      <div v-if="showMobileNav" class="drawer-overlay" @click.self="showMobileNav = false">
        <div class="mobile-drawer card">
          <header class="drawer-header">
            <h3>题目导航</h3>
            <button class="close-btn" @click="showMobileNav = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </header>
          <div class="drawer-body">
            <QuestionNav />
          </div>
        </div>
      </div>
    </transition>

    <!-- Mobile AI Drawer -->
    <transition name="drawer">
      <div v-if="showMobileAi" class="drawer-overlay" @click.self="showMobileAi = false">
        <div class="mobile-drawer card">
          <header class="drawer-header">
            <h3>AI 题目解析</h3>
            <button class="close-btn" @click="showMobileAi = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </header>
          <div class="drawer-body">
            <AiPanel
              :question="quizStore.currentQuestion"
              :userAnswer="quizStore.answers[quizStore.currentQuestion?.id]"
            />
          </div>
        </div>
      </div>
    </transition>

    <!-- Mobile Note Drawer -->
    <transition name="drawer">
      <div v-if="showMobileNote" class="drawer-overlay" @click.self="showMobileNote = false">
        <div class="mobile-drawer card">
          <header class="drawer-header">
            <h3>题目笔记</h3>
            <button class="close-btn" @click="showMobileNote = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </header>
          <div class="drawer-body note-drawer-body">
            <textarea
              class="note-textarea"
              v-model="noteDraft"
              placeholder="记录这道题的要点、易错点、记忆技巧..."
              rows="10"
            ></textarea>
            <div class="note-drawer-footer">
              <button
                class="btn btn-sm btn-primary save-note-btn"
                :class="{ success: justSaved }"
                :disabled="quizStore.noteSaving"
                @click="saveNote"
              >
                <span v-if="quizStore.noteSaving">保存中...</span>
                <span v-else-if="justSaved" class="save-success">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  已保存
                </span>
                <span v-else>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  保存笔记
                </span>
              </button>
              <span v-if="quizStore.currentNote?.updatedAt" class="text-muted text-xs">
                上次保存 {{ formatTime(quizStore.currentNote.updatedAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Desktop Left Note Drawer -->
    <div v-if="showNoteDrawer" class="note-drawer-overlay hide-mobile" @click.self="showNoteDrawer = false">
      <div class="note-drawer card">
        <div class="note-drawer-header">
          <div class="note-drawer-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            题目笔记
          </div>
          <button class="close-btn" @click="showNoteDrawer = false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <textarea
          class="note-textarea"
          v-model="noteDraft"
          placeholder="记录这道题的要点、易错点、记忆技巧..."
          rows="14"
        ></textarea>
        <div class="note-drawer-footer">
          <button
            class="btn btn-sm btn-primary save-note-btn"
            :class="{ success: justSaved }"
            :disabled="quizStore.noteSaving"
            @click="saveNote"
          >
            <span v-if="quizStore.noteSaving">保存中...</span>
            <span v-else-if="justSaved" class="save-success">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              已保存
            </span>
            <span v-else>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              保存笔记
            </span>
          </button>
          <span v-if="quizStore.currentNote?.updatedAt" class="text-muted text-xs">
            上次保存 {{ formatTime(quizStore.currentNote.updatedAt) }}
          </span>
        </div>
      </div>
    </div>
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
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBankStore } from '../stores/bank.js'
import { useQuizStore } from '../stores/quiz.js'
import { useHistoryStore } from '../stores/history.js'
import { useFavoriteStore } from '../stores/favorite.js'
import { burstConfetti } from '../utils/confetti.js'
import SingleChoice from '../components/SingleChoice.vue'
import MultipleChoice from '../components/MultipleChoice.vue'
import FillBlank from '../components/FillBlank.vue'
import EssayQuestion from '../components/EssayQuestion.vue'
import QuestionNav from '../components/QuestionNav.vue'
import AiPanel from '../components/AiPanel.vue'
import ModeSelector from '../components/ModeSelector.vue'
import ConfirmModal from '../components/ConfirmModal.vue'

const props = defineProps({ bankId: String })
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
const favBtnRef = ref(null)
const favAnim = ref(false)

const bank = computed(() => {
  const targetId = String(props.bankId)
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
  try {
    await quizStore.saveCurrentNote(noteDraft.value)
    justSaved.value = true
    setTimeout(() => {
      justSaved.value = false
    }, 1500)
  } catch (e) {
    console.error('保存笔记失败:', e)
    alert('保存笔记失败，请检查后端服务是否启动。')
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
  quizStore.toggleShuffle()
}

function handleAnswer(answer) {
  quizStore.submitAnswer(answer)
  quizStore.persistSession({ bankName: bank.value?.name, score: quizStore.finalScore, correctCount: quizStore.correctCount, wrongCount: quizStore.wrongCount, totalQuestions: quizStore.totalQuestions, duration: quizStore.duration, wrongQuestions: buildWrongQuestions() })
}

function nextQuestion() {
  quizStore.nextQuestion()
  quizStore.persistSession({ bankName: bank.value?.name, score: quizStore.finalScore, correctCount: quizStore.correctCount, wrongCount: quizStore.wrongCount, totalQuestions: quizStore.totalQuestions, duration: quizStore.duration, wrongQuestions: buildWrongQuestions() })
}

function prevQuestion() {
  quizStore.prevQuestion()
  quizStore.persistSession({ bankName: bank.value?.name, score: quizStore.finalScore, correctCount: quizStore.correctCount, wrongCount: quizStore.wrongCount, totalQuestions: quizStore.totalQuestions, duration: quizStore.duration, wrongQuestions: buildWrongQuestions() })
}

const isCurrentFav = computed(() => {
  const q = quizStore.currentQuestion
  if (!q) return false
  return favoriteStore.isFavorited(quizStore.bankId, q.id)
})

async function toggleCurrentFav() {
  const q = quizStore.currentQuestion
  if (!q) return
  if (favBtnRef.value) {
    const rect = favBtnRef.value.getBoundingClientRect()
    burstConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2)
  }
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
  quizStore.finishQuiz()
  try {
    const record = await historyStore.addRecord({
      bankId: quizStore.bankId,
      bankName: bank.value?.name || '未知题库',
      mode: quizStore.mode,
      score: quizStore.finalScore,
      correctCount: quizStore.correctCount,
      wrongCount: quizStore.wrongCount,
      totalQuestions: quizStore.totalQuestions,
      duration: quizStore.duration,
      answers: quizStore.answers,
      wrongQuestionIds: quizStore.wrongQuestionIds,
      wrongQuestions: buildWrongQuestions(),
    })
    // 清除保存的进度
    await quizStore.clearQuizSession()
    if (record?.id) {
      router.push(`/result/${record.id}`)
    }
  } catch (err) {
    console.error('完成答题失败：', err)
    alert('保存答题记录失败，请确认后端服务是否启动（端口 3000）。答题数据未保存。')
  }
}

async function exitQuiz() {
  showExitConfirm.value = true
}

async function confirmExit() {
  showExitConfirm.value = false
  await quizStore.persistSession({ bankName: bank.value?.name, score: quizStore.finalScore, correctCount: quizStore.correctCount, wrongCount: quizStore.wrongCount, totalQuestions: quizStore.totalQuestions, duration: quizStore.duration, wrongQuestions: buildWrongQuestions() })
  router.push('/')
}

function handleBatchDelete() {
  if (quizStore.selectedQuestionIds.length === 0) return
  if (confirm(`确定要删除选中的 ${quizStore.selectedQuestionIds.length} 道题目吗？`)) {
    quizStore.removeSelectedQuestions()
  }
}

// AI Sidebar resize
const isResizing = ref(false)
const resizeStartX = ref(0)
const resizeStartWidth = ref(0)

function startResize(e) {
  isResizing.value = true
  resizeStartX.value = e.clientX
  resizeStartWidth.value = aiSidebarWidth.value
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onResize(e) {
  if (!isResizing.value) return
  const delta = resizeStartX.value - e.clientX
  const newWidth = Math.max(280, Math.min(700, resizeStartWidth.value + delta))
  aiSidebarWidth.value = newWidth
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

function toggleAiSidebar() {
  showAiSidebar.value = !showAiSidebar.value
}

onUnmounted(() => {
  stopResize()
})

watch(() => quizStore.currentQuestion?.id, () => {
  quizStore.loadCurrentNote()
})

watch(() => bank.value, (b) => {
  if (b && quizStore.bankId !== b.id) {
    quizStore.startQuiz(b, { mode: quizStore.mode, shuffled: quizStore.shuffled })
    quizStore.loadAllNotesForBank(b.id)
  }
})

onMounted(async () => {
  await bankStore.loadBuiltinBanks()
  await bankStore.loadUserBanks()
  favoriteStore.load()
  const b = bank.value
  if (!b) {
    quizLoading.value = false
    return
  }
  // 尝试加载上次的答题进度
  const session = await quizStore.loadQuizSession(b.id)
  if (session) {
    quizStore.startQuiz(b, { mode: quizStore.mode, shuffled: quizStore.shuffled, session })
    sessionRestored.value = true
  } else {
    quizStore.startQuiz(b, { mode: quizStore.mode, shuffled: quizStore.shuffled })
  }
  quizStore.loadAllNotesForBank(quizStore.bankId)
  quizLoading.value = false
})
</script>

<style scoped>
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

.quiz-title h1 {
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

.save-success svg {
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

.drawer-header h3 {
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

  .quiz-title h1 {
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
