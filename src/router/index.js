import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import BankListView from '../views/BankListView.vue'
import QuizView from '../views/QuizView.vue'
import ResultView from '../views/ResultView.vue'
import HistoryView from '../views/HistoryView.vue'
import WrongBookView from '../views/WrongBookView.vue'
import SettingsView from '../views/SettingsView.vue'
import ResourcesView from '../views/ResourcesView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/banks', name: 'banks', component: BankListView },
  { path: '/quiz/:bankId', name: 'quiz', component: QuizView, props: true },
  { path: '/result/:recordId', name: 'result', component: ResultView, props: true },
  { path: '/history', name: 'history', component: HistoryView },
  { path: '/wrongbook', name: 'wrongbook', component: WrongBookView },
  { path: '/resources', name: 'resources', component: ResourcesView },
  { path: '/settings', name: 'settings', component: SettingsView },
  {
    path: '/notes',
    name: 'notes',
    component: () => import('../views/NotesView.vue'),
  },
  {
    path: '/quiz-notes',
    name: 'quiz-notes',
    component: () => import('../views/QuizNotesView.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
