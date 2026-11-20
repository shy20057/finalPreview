import test from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useAuthStore } from '../src/stores/auth.js'
import { useWrongBookStore } from '../src/stores/wrongBook.js'

test('wrong-book decisions stay with the active account', async () => {
  const values = new Map()
  const previousStorage = globalThis.localStorage
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
  try {
    setActivePinia(createPinia())
    const auth = useAuthStore()
    auth.user = { id: 1, username: 'alice' }
    const wrongBook = useWrongBookStore()
    await nextTick()
    wrongBook.markMastered('shared_7', true)
    assert.equal(wrongBook.masteredOverrides.has('shared_7'), true)

    auth.user = { id: 2, username: 'bob' }
    await nextTick()
    assert.equal(wrongBook.masteredOverrides.has('shared_7'), false)

    auth.user = { id: 1, username: 'alice' }
    await nextTick()
    assert.equal(wrongBook.masteredOverrides.has('shared_7'), true)
  } finally {
    globalThis.localStorage = previousStorage
  }
})
