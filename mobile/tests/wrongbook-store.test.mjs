// 错题本 store：聚合、筛选、已掌握/已移除的持久化（uni storage 替代 localStorage）
import test from 'node:test'
import assert from 'node:assert/strict'
import { installMockUni } from './helpers/mock-uni.mjs'

const mock = installMockUni()

const { createPinia, setActivePinia } = await import('pinia')
const { nextTick } = await import('vue')
const { useWrongBookStore } = await import('../stores/wrongBook.js')
const { useAuthStore } = await import('../stores/auth.js')
const { useHistoryStore } = await import('../stores/history.js')
const { accountStorageKey } = await import('../utils/accountScope.js')

function bootStore({ preserveStorage = false } = {}) {
  if (!preserveStorage) mock.storage.clear()
  setActivePinia(createPinia())
  const auth = useAuthStore()
  const history = useHistoryStore()
  auth.user = { id: 7, username: 'tester' }
  history.records = [
    {
      id: 1,
      bankId: 3,
      bankName: '操作系统',
      date: '2026-10-30T00:00:00.000Z',
      mode: 'practice',
      wrongQuestions: [
        { id: 1, type: 'single', question: '单选错题', answer: 'A', score: 2, userAnswer: 'B' },
        { id: 2, type: 'multi', question: '多选错题', answer: ['A'], score: 2, userAnswer: ['B'] },
      ],
    },
  ]
  const store = useWrongBookStore()
  return { store, auth, history }
}

test('错题按 bankId+题目id 聚合，错题数与未掌握数正确', async () => {
  const { store } = bootStore()
  await nextTick()

  assert.equal(store.entries.length, 2)
  assert.equal(store.counts.total, 2)
  assert.equal(store.counts.unmastered, 2)
  assert.equal(store.counts.byType.single, 1)
  assert.equal(store.counts.byType.multi, 1)
})

test('标记已掌握后写进 uni storage，重新加载后仍然生效', async () => {
  const { store } = bootStore()
  await nextTick()

  store.markMastered('3_1', true)
  assert.equal(store.counts.mastered, 1)
  assert.equal(store.counts.unmastered, 1)

  const raw = mock.storage.get(accountStorageKey('wrongbook_mastered_overrides', 7))
  assert.deepEqual(JSON.parse(raw), ['3_1'])

  // 模拟重新登录：新建 pinia 后应从 storage 恢复
  const { store: reloaded } = bootStore({ preserveStorage: true })
  await nextTick()
  assert.equal(reloaded.counts.mastered, 1)
})

test('移除错题后写入 removed_keys，且不再出现在列表里', async () => {
  const { store } = bootStore()
  await nextTick()

  store.removeEntry('3_2')
  assert.equal(store.entries.length, 1)
  const raw = mock.storage.get(accountStorageKey('wrongbook_removed_keys', 7))
  assert.deepEqual(JSON.parse(raw), ['3_2'])
})

test('按题型筛选只留下选中的类型', async () => {
  const { store } = bootStore()
  await nextTick()

  store.selectedTypes = ['single']
  assert.equal(store.filteredEntries.length, 1)
  assert.equal(store.filteredEntries[0].type, 'single')
})
