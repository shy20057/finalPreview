import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'
import { DatabaseSync } from 'node:sqlite'
import { migrateUserIsolation } from '../server/userIsolation.js'
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

test('legacy rows are preserved and assigned only when ownership is unambiguous', () => {
  const db = new DatabaseSync(':memory:')
  db.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT);
    INSERT INTO users VALUES (1, 'alice');
    CREATE TABLE banks (id INTEGER PRIMARY KEY, name TEXT, userId INTEGER);
    CREATE TABLE history (id INTEGER PRIMARY KEY, userId INTEGER);
    CREATE TABLE notes (id INTEGER PRIMARY KEY, bankId INTEGER, questionId INTEGER, content TEXT, createdAt TEXT, updatedAt TEXT, UNIQUE(bankId, questionId));
    INSERT INTO notes VALUES (1, 42, 7, 'legacy note', '2025-01-01', '2025-01-01');
    CREATE TABLE note_tree (id INTEGER PRIMARY KEY, userId INTEGER);
    CREATE TABLE favorites (id INTEGER PRIMARY KEY, bankId INTEGER NOT NULL, questionId INTEGER NOT NULL, bankName TEXT, questionData TEXT NOT NULL, createdAt TEXT, UNIQUE(bankId, questionId));
    INSERT INTO favorites VALUES (1, 42, 7, 'bank', '{}', '2025-01-01');
    CREATE TABLE quiz_sessions (bank_id TEXT PRIMARY KEY, question_order TEXT, answers TEXT, current_index INTEGER, mode TEXT, shuffled INTEGER, start_time INTEGER, wrong_ids TEXT, updated_at TEXT);
    INSERT INTO quiz_sessions VALUES ('42', '[]', '{}', 0, 'practice', 0, 1, '[]', '2025-01-01');
    CREATE TABLE ai_configs (id INTEGER PRIMARY KEY, name TEXT UNIQUE, baseUrl TEXT, apiKey TEXT, model TEXT, isDefault INTEGER, createdAt TEXT, updatedAt TEXT);
    INSERT INTO ai_configs VALUES (1, 'openai', '', 'legacy-key', '', 1, '2025-01-01', '2025-01-01');
  `)
  migrateUserIsolation(db)
  migrateUserIsolation(db)
  assert.equal(db.prepare('SELECT userId FROM notes WHERE id = 1').get().userId, 1)
  assert.equal(db.prepare('SELECT userId FROM favorites WHERE id = 1').get().userId, 1)
  assert.equal(db.prepare('SELECT userId FROM quiz_sessions WHERE bank_id = ?').get('42').userId, 1)
  assert.equal(db.prepare('SELECT userId FROM ai_configs WHERE id = 1').get().userId, 1)
  assert.equal(db.prepare('SELECT content FROM notes WHERE id = 1').get().content, 'legacy note')
  db.close()
})

async function freePort() {
  const server = createServer()
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise(resolve => server.close(resolve))
  return port
}

test('account data is isolated while resource cards remain shared', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'quiz-user-isolation-'))
  const port = await freePort()
  const child = spawn(process.execPath, ['server/server.js'], {
    cwd: join(import.meta.dirname, '..'),
    env: { ...process.env, PORT: String(port), QUIZ_DB_PATH: join(directory, 'quiz.db'), JWT_SECRET: 'test-only-user-isolation-secret' },
    stdio: 'ignore',
  })
  t.after(async () => {
    if (child.exitCode == null) {
      const exited = new Promise(resolve => child.once('exit', resolve))
      child.kill()
      await exited
    }
    await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  })

  const base = `http://127.0.0.1:${port}`
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    if (child.exitCode != null) break
    try {
      const response = await fetch(`${base}/api/resources`)
      if (response.status === 401) { ready = true; break }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  assert.ok(ready, 'test server should start')

  async function api(path, token, method = 'GET', body) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const raw = await response.text()
    let data
    try { data = JSON.parse(raw) } catch { throw new Error(`${method} ${path} returned ${response.status}: ${raw.slice(0, 120)}`) }
    return { status: response.status, data }
  }

  const alice = (await api('/api/auth/register', null, 'POST', { username: 'alice', password: 'password1' })).data.token
  const bob = (await api('/api/auth/register', null, 'POST', { username: 'bob', password: 'password2' })).data.token
  assert.ok(alice && bob)
  assert.equal((await api('/api/ai-configs', null)).status, 401)
  assert.equal((await api('/api/resources', null)).status, 401)
  assert.equal((await api('/api/resources', null, 'POST', { filename: 'blocked.html', content: '<h1>blocked</h1>' })).status, 401)
  assert.equal((await api('/api/resources/blocked.html', null, 'DELETE')).status, 401)
  assert.equal((await api('/api/resources', alice)).status, 200)
  assert.equal((await api('/api/resources', bob)).status, 200)
  const resourcePage = await fetch(`${base}/resources/disk-scheduling.html`)
  assert.equal(resourcePage.status, 200)
  assert.match(resourcePage.headers.get('content-security-policy'), /sandbox allow-scripts/)
  assert.doesNotMatch(resourcePage.headers.get('content-security-policy'), /allow-same-origin/)

  const aliceBank = (await api('/api/banks', alice, 'POST', { name: 'Alice bank', questions: [] })).data
  const bobBank = (await api('/api/banks', bob, 'POST', { name: 'Bob bank', questions: [] })).data
  assert.notEqual(aliceBank.id, bobBank.id)
  assert.deepEqual((await api('/api/banks', alice)).data.map(bank => bank.name), ['Alice bank'])
  assert.deepEqual((await api('/api/banks', bob)).data.map(bank => bank.name), ['Bob bank'])
  await api(`/api/banks/${aliceBank.id}`, bob, 'DELETE')
  assert.equal((await api('/api/banks', alice)).data.length, 1)

  const aliceRecord = (await api('/api/history', alice, 'POST', {
    bankId: aliceBank.id, bankName: 'Alice bank', mode: 'practice', score: 80,
    correctCount: 1, wrongCount: 0, totalQuestions: 1, duration: 10,
  })).data
  assert.equal((await api('/api/history', bob)).data.length, 0)
  await api(`/api/history/${aliceRecord.id}`, bob, 'DELETE')
  assert.equal((await api('/api/history', alice)).data.length, 1)

  await api('/api/notes', alice, 'POST', { bankId: 42, questionId: 7, content: 'Alice note' })
  await api('/api/notes', bob, 'POST', { bankId: 42, questionId: 7, content: 'Bob note' })
  assert.equal((await api('/api/notes/42/7', alice)).data.content, 'Alice note')
  assert.equal((await api('/api/notes/42/7', bob)).data.content, 'Bob note')

  await api('/api/favorites', alice, 'POST', { bankId: 42, questionId: 7, questionData: { question: 'Alice' } })
  await api('/api/favorites', bob, 'POST', { bankId: 42, questionId: 7, questionData: { question: 'Bob' } })
  assert.equal((await api('/api/favorites', alice)).data[0].questionData.question, 'Alice')
  assert.equal((await api('/api/favorites', bob)).data[0].questionData.question, 'Bob')

  await api('/api/sessions', alice, 'PUT', { bankId: 'shared-bank', answers: { 1: 'A' } })
  await api('/api/sessions', bob, 'PUT', { bankId: 'shared-bank', answers: { 1: 'B' } })
  assert.equal((await api('/api/sessions/shared-bank', alice)).data.answers['1'], 'A')
  assert.equal((await api('/api/sessions/shared-bank', bob)).data.answers['1'], 'B')

  await api('/api/ai-configs', alice, 'POST', { name: 'openai', apiKey: 'alice-key', isDefault: true })
  await api('/api/ai-configs', bob, 'POST', { name: 'openai', apiKey: 'bob-key', isDefault: true })
  assert.equal((await api('/api/ai-configs/default/active', alice)).data.apiKey, 'alice-key')
  assert.equal((await api('/api/ai-configs/default/active', bob)).data.apiKey, 'bob-key')
  assert.equal((await api('/api/export', bob)).data.aiConfigs[0].apiKey, 'bob-key')

  const tree = (await api('/api/notes', alice, 'POST', { title: 'Alice folder', type: 'folder' })).data
  assert.equal((await api('/api/notes/tree', bob)).data.length, 0)
  assert.equal((await api('/api/notes', bob, 'POST', { parent_id: tree.id, title: 'Wrong parent' })).status, 400)
  const privateNoteExport = await fetch(`${base}/api/notes/export/${tree.id}`, { headers: { Authorization: `Bearer ${bob}` } })
  assert.equal(privateNoteExport.status, 404)

  const exported = (await api('/api/export', alice)).data
  assert.equal((await api('/api/import', bob, 'POST', exported)).status, 200)
  assert.equal((await api('/api/ai-configs/default/active', alice)).data.apiKey, 'alice-key')
  assert.equal((await api('/api/ai-configs/default/active', bob)).data.apiKey, 'alice-key')
  assert.deepEqual((await api('/api/banks', alice)).data.map(bank => bank.name), ['Alice bank'])
})
