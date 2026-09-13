import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import BankListView from '../views/BankListView.vue'
import QuizView from '../views/QuizView.vue'
import ResultView from '../views/ResultView.vue'
import HistoryView from '../views/HistoryView.vue'
import WrongBookView from '../views/WrongBookView.vue'
import FavoriteView from '../views/FavoriteView.vue'
import SettingsView from '../views/SettingsView.vue'
import ResourcesView from '../views/ResourcesView.vue'
import ProfileView from '../views/ProfileView.vue'
import { useAuthStore } from '../stores/auth.js'

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/AuthView.vue'), meta: { public: true } },
  { path: '/register', name: 'register', component: () => import('../views/AuthView.vue'), meta: { public: true } },
  { path: '/', name: 'home', component: HomeView },
  { path: '/banks', name: 'banks', component: BankListView },
  { path: '/quiz/:bankId', name: 'quiz', component: QuizView, props: true },
  { path: '/result/:recordId', name: 'result', component: ResultView, props: true },
  { path: '/history', name: 'history', component: HistoryView },
  { path: '/wrongbook', name: 'wrongbook', component: WrongBookView },
  { path: '/favorites', name: 'favorites', component: FavoriteView },
  { path: '/resources', name: 'resources', component: ResourcesView },
  { path: '/settings', name: 'settings', component: SettingsView },
  { path: '/profile', name: 'profile', component: ProfileView },
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

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.ready) {
    await auth.init()
  }
  if (!to.meta?.public && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta?.public && auth.isLoggedIn) {
    return { name: 'home' }
  }
})

export default router
