import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getNote, saveNote, loadNotesByBank, getSession, saveSession, deleteSession } from '../utils/storage.js'

export const useQuizStore = defineStore('quiz', () => {
  const bankId = ref(null)
  const questions = ref([])
  const answers = ref({})
  const currentIndex = ref(0)
  const mode = ref('practice') // 'practice' | 'exam'
  const shuffled = ref(false)
  const startTime = ref(null)
  const endTime = ref(null)
  const wrongQuestionIds = ref([])
  const currentNote = ref(null)
  const noteSaving = ref(false)
  const batchMode = ref(false)
  const selectedQuestionIds = ref([])
  // questionId → whether this question has a note (content length > 0)
  const questionNoteMap = ref({})

  const currentQuestion = computed(() => questions.value[currentIndex.value] || null)

  const totalQuestions = computed(() => questions.value.length)

  function isMultiCorrect(q, ans) {
    if (!Array.isArray(ans) || !Array.isArray(q.answer)) return false
    return JSON.stringify(ans) === JSON.stringify([...q.answer].sort())
  }

  const correctCount = computed(() => {
    return questions.value.filter(q => {
      const ans = answers.value[q.id]
      if (ans === undefined) return false
      if (q.type === 'single') return ans === q.answer
      if (q.type === 'multi') return isMultiCorrect(q, ans)
      if (q.type === 'fill') {
        return q.answer.every((a, i) => ans[i]?.trim().toLowerCase() === a.trim().toLowerCase())
      }
      if (q.type === 'essay') return ans && ans.trim().length > 0
      return false
    }).length
  })

  const wrongCount = computed(() => {
    return questions.value.filter(q => {
      const ans = answers.value[q.id]
      if (ans === undefined) return false
      if (q.type === 'single') return ans !== q.answer
      if (q.type === 'multi') return !isMultiCorrect(q, ans)
      if (q.type === 'fill') {
        return !q.answer.every((a, i) => ans[i]?.trim().toLowerCase() === a.trim().toLowerCase())
      }
      if (q.type === 'essay') return false // Essay not auto-graded as wrong
      return false
    }).length
  })

  const unansweredCount = computed(() => totalQuestions.value - correctCount.value - wrongCount.value)

  const currentScore = computed(() => {
    let score = 0
    for (const q of questions.value) {
      const ans = answers.value[q.id]
      if (ans === undefined) continue
      if (q.type === 'single' && ans === q.answer) {
        score += q.score || 2
      } else if (q.type === 'multi' && isMultiCorrect(q, ans)) {
        score += q.score || 2
      } else if (q.type === 'fill') {
        const allCorrect = q.answer.every((a, i) => ans[i]?.trim().toLowerCase() === a.trim().toLowerCase())
        if (allCorrect) score += q.score || 2
      } else if (q.type === 'essay') {
        // Essay questions give full score if answered (subjective)
        if (ans && ans.trim().length > 0) score += q.score || 5
      }
    }
    return score
  })

  const totalScore = computed(() => {
    return questions.value.reduce((sum, q) => sum + (q.score || 2), 0)
  })

  const finalScore = computed(() => {
    if (totalScore.value === 0) return 0
    return Math.round((currentScore.value / totalScore.value) * 100)
  })

  const accuracy = computed(() => {
    if (totalQuestions.value === 0) return 0
    return Math.round((correctCount.value / totalQuestions.value) * 100)
  })

  const duration = computed(() => {
    if (!startTime.value) return 0
    const end = endTime.value || Date.now()
    return Math.floor((end - startTime.value) / 1000)
  })

  const wrongQuestions = computed(() => {
    return questions.value.filter(q => wrongQuestionIds.value.includes(q.id))
  })

  /**
   * Start a quiz, optionally restoring from a saved session.
   * @param {Object} bank - bank object with questions array
   * @param {Object} options - { mode, shuffled, session }
   *   session: optional saved session data to restore
   */
  function startQuiz(bank, options = {}) {
    const session = options.session
    bankId.value = bank.id
    questions.value = [...bank.questions]

    if (session) {
      // Restore from saved session
      answers.value = { ...session.answers }
      currentIndex.value = session.currentIndex ?? 0
      mode.value = session.mode || 'practice'
      shuffled.value = !!session.shuffled
      startTime.value = session.startTime || Date.now()
      endTime.value = null
      wrongQuestionIds.value = [...(session.wrongIds || [])]

      // Restore question order if shuffled
      if (session.questionOrder && session.questionOrder.length > 0) {
        const ordered = []
        for (const id of session.questionOrder) {
          const q = questions.value.find(q => q.id === id)
          if (q) ordered.push(q)
        }
        // append any remaining questions not in the order list
        for (const q of questions.value) {
          if (!ordered.find(o => o.id === q.id)) ordered.push(q)
        }
        questions.value = ordered
      }
    } else {
      // Fresh start
      answers.value = {}
      currentIndex.value = 0
      mode.value = options.mode || 'practice'
      shuffled.value = options.shuffled || false
      startTime.value = Date.now()
      endTime.value = null
      wrongQuestionIds.value = []

      if (shuffled.value) {
        questions.value = [...questions.value].sort(() => Math.random() - 0.5)
      }
    }
  }

  /**
   * Load saved session for a bank. Returns null if none found.
   */
  async function loadQuizSession(bId) {
    if (!bId) return null
    try {
      return await getSession(bId)
    } catch (e) {
      console.error('加载答题进度失败:', e)
      return null
    }
  }

  /**
   * Persist current quiz state to server (session only, not history).
   * Called on every answer, navigation, and exit — only writes to quiz_sessions table
   * for progress recovery. History is written only on finishQuiz.
   */
  async function persistSession() {
    if (!bankId.value) return
    try {
      await saveSession({
        bankId: bankId.value,
        questionOrder: questions.value.map(q => q.id),
        answers: answers.value,
        currentIndex: currentIndex.value,
        mode: mode.value,
        shuffled: shuffled.value,
        startTime: startTime.value,
        wrongIds: wrongQuestionIds.value,
      })
    } catch (e) {
      console.error('保存答题进度失败:', e)
    }
  }

  /**
   * Delete saved session for current bank.
   */
  async function clearQuizSession() {
    if (!bankId.value) return
    try {
      await deleteSession(bankId.value)
    } catch (e) {
      console.error('删除答题进度失败:', e)
    }
  }

  function submitAnswer(answer) {
    const q = currentQuestion.value
    if (!q) return
    answers.value[q.id] = answer

    let isWrong = false
    if (q.type === 'single') {
      isWrong = answer !== q.answer
    } else if (q.type === 'multi') {
      isWrong = !isMultiCorrect(q, answer)
    } else if (q.type === 'fill') {
      // 填空题需要所有空都已填才能判分，否则视为未答不算错
      if (!Array.isArray(answer) || answer.some(a => !a || !a.trim())) {
        isWrong = false
      } else {
        isWrong = !q.answer.every((a, i) => answer[i]?.trim().toLowerCase() === a.trim().toLowerCase())
      }
    } else if (q.type === 'essay') {
      isWrong = false // Essay not auto-graded
    }

    const idx = wrongQuestionIds.value.indexOf(q.id)
    if (isWrong) {
      if (idx === -1) wrongQuestionIds.value.push(q.id)
    } else {
      // 用户后来改对了，从错题列表中移除
      if (idx !== -1) wrongQuestionIds.value.splice(idx, 1)
    }
  }

  function nextQuestion() {
    if (currentIndex.value < questions.value.length - 1) {
      currentIndex.value++
    }
  }

  function prevQuestion() {
    if (currentIndex.value > 0) {
      currentIndex.value--
    }
  }

  function jumpToQuestion(index) {
    if (index >= 0 && index < questions.value.length) {
      currentIndex.value = index
    }
  }

  function finishQuiz() {
    endTime.value = Date.now()
  }

  function resetQuiz() {
    answers.value = {}
    currentIndex.value = 0
    endTime.value = null
    startTime.value = Date.now()
    wrongQuestionIds.value = []
    if (shuffled.value) {
      questions.value = [...questions.value].sort(() => Math.random() - 0.5)
    }
  }

  function setMode(newMode) {
    mode.value = newMode
    if (newMode === 'exam') {
      shuffled.value = true
      questions.value = [...questions.value].sort(() => Math.random() - 0.5)
    } else {
      // 练习模式下保持当前顺序
    }
  }

  function toggleShuffle() {
    shuffled.value = !shuffled.value
    if (shuffled.value) {
      questions.value = [...questions.value].sort(() => Math.random() - 0.5)
    } else {
      // 恢复原始顺序需要重新加载题库
      // 这里由调用方处理
    }
  }

  function getQuestionStatus(questionId) {
    const ans = answers.value[questionId]
    if (ans === undefined) return 'unanswered'
    const q = questions.value.find(x => x.id === questionId)
    if (!q) return 'unanswered'
    if (q.type === 'single') return ans === q.answer ? 'correct' : 'wrong'
    if (q.type === 'multi') return isMultiCorrect(q, ans) ? 'correct' : 'wrong'
    if (q.type === 'fill') {
      const ok = q.answer.every((a, i) => ans[i]?.trim().toLowerCase() === a.trim().toLowerCase())
      return ok ? 'correct' : 'wrong'
    }
    if (q.type === 'essay') return ans && ans.trim().length > 0 ? 'correct' : 'unanswered'
    return 'unanswered'
  }

  async function loadCurrentNote() {
    const q = currentQuestion.value
    if (!q || !bankId.value) {
      currentNote.value = null
      return
    }
    currentNote.value = await getNote(bankId.value, q.id)
  }

  async function loadAllNotesForBank(bId) {
    if (!bId) return
    try {
      const notes = await loadNotesByBank(bId)
      const map = {}
      for (const n of notes) {
        if (n.questionId != null) {
          map[n.questionId] = !!(n.content && n.content.trim().length > 0)
        }
      }
      questionNoteMap.value = map
    } catch (e) {
      console.error('加载笔记失败:', e)
    }
  }

  function hasNote(questionId) {
    return questionNoteMap.value[questionId] === true
  }

  async function saveCurrentNote(content) {
    if (!bankId.value || !currentQuestion.value) return
    noteSaving.value = true
    try {
      const note = await saveNote(bankId.value, currentQuestion.value.id, content)
      currentNote.value = note
      // Sync questionNoteMap
      questionNoteMap.value[currentQuestion.value.id] = !!(content && content.trim().length > 0)
    } finally {
      noteSaving.value = false
    }
  }

  function toggleBatchMode() {
    batchMode.value = !batchMode.value
    if (!batchMode.value) {
      selectedQuestionIds.value = []
    }
  }

  function toggleQuestionSelection(questionId) {
    const idx = selectedQuestionIds.value.indexOf(questionId)
    if (idx > -1) {
      selectedQuestionIds.value.splice(idx, 1)
    } else {
      selectedQuestionIds.value.push(questionId)
    }
  }

  function selectAllQuestions() {
    if (selectedQuestionIds.value.length === questions.value.length) {
      selectedQuestionIds.value = []
    } else {
      selectedQuestionIds.value = questions.value.map(q => q.id)
    }
  }

  function removeSelectedQuestions() {
    const toRemove = new Set(selectedQuestionIds.value)
    questions.value = questions.value.filter(q => !toRemove.has(q.id))
    // 清除被删除题目的答案和错题记录
    toRemove.forEach(id => {
      delete answers.value[id]
      const wrongIdx = wrongQuestionIds.value.indexOf(id)
      if (wrongIdx > -1) wrongQuestionIds.value.splice(wrongIdx, 1)
    })
    selectedQuestionIds.value = []
    batchMode.value = false
    // 确保当前索引不超出范围
    if (currentIndex.value >= questions.value.length) {
      currentIndex.value = Math.max(0, questions.value.length - 1)
    }
  }

  return {
    bankId,
    questions,
    answers,
    currentIndex,
    mode,
    shuffled,
    startTime,
    endTime,
    wrongQuestionIds,
    currentNote,
    noteSaving,
    batchMode,
    selectedQuestionIds,
    questionNoteMap,
    currentQuestion,
    totalQuestions,
    correctCount,
    wrongCount,
    unansweredCount,
    currentScore,
    totalScore,
    finalScore,
    accuracy,
    duration,
    wrongQuestions,
    startQuiz,
    submitAnswer,
    nextQuestion,
    prevQuestion,
    jumpToQuestion,
    finishQuiz,
    resetQuiz,
    setMode,
    toggleShuffle,
    getQuestionStatus,
    loadCurrentNote,
    saveCurrentNote,
    loadAllNotesForBank,
    hasNote,
    loadQuizSession,
    persistSession,
    clearQuizSession,
    toggleBatchMode,
    toggleQuestionSelection,
    selectAllQuestions,
    removeSelectedQuestions,
  }
})
