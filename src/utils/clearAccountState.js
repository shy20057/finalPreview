import { useAppStore } from '../stores/app.js'
import { useBankStore } from '../stores/bank.js'
import { useFavoriteStore } from '../stores/favorite.js'
import { useHistoryStore } from '../stores/history.js'
import { useNoteStore } from '../stores/note.js'
import { useQuizStore } from '../stores/quiz.js'

export function clearAccountState() {
  const banks = useBankStore()
  banks.userBanks = []
  banks.currentBank = null

  useHistoryStore().records = []

  const favorites = useFavoriteStore()
  favorites.favorites = []
  favorites.loaded = false

  const notes = useNoteStore()
  notes.nodes = []
  notes.currentNoteId = null

  const quiz = useQuizStore()
  quiz.bankId = null
  quiz.questions = []
  quiz.answers = {}
  quiz.wrongQuestionIds = []
  quiz.currentNote = null
  quiz.questionNoteMap = {}

  const app = useAppStore()
  app.aiConfig = { baseUrl: '', apiKey: '', model: '', name: '' }
  app.allAiConfigs = []
  app.aiConfigLoaded = false
}
