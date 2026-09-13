import assert from 'node:assert/strict'
import test from 'node:test'
import { demoApiRequest } from '../src/utils/demoApi.js'
import { demoToken } from '../src/utils/demoMode.js'

const values = new Map()
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
}

const request = (path, method = 'GET', body, token = demoToken) =>
  demoApiRequest(path, { method, body: body && JSON.stringify(body) }, token)

test('demo login works without a server and rejects incorrect credentials', async () => {
  await assert.rejects(request('/api/auth/login', 'POST', { username: 'demo', password: 'wrong' }, ''), /用户名或密码错误/)
  const session = await request('/api/auth/login', 'POST', { username: 'demo', password: 'demo123456' }, '')
  assert.equal(session.token, demoToken)
  assert.equal((await request('/api/auth/me')).username, 'demo')
  await assert.rejects(request('/api/banks', 'GET', undefined, ''), /请先登录/)
})

test('demo data supports the main UI flows and persists locally', async () => {
  const banks = await request('/api/banks')
  assert.ok(banks.length >= 2)
  assert.ok((await request('/api/history')).length)
  assert.ok((await request('/api/notes/quiz')).length)
  assert.ok((await request('/api/notes/tree')).length)
  assert.ok((await request('/api/favorites')).length)
  assert.ok((await request('/api/resources')).files.length)
  const bank = banks[0]
  const note = await request('/api/notes', 'POST', { bankId: bank.id, questionId: 2, content: '新的演示笔记' })
  assert.equal((await request(`/api/notes/${bank.id}/2`)).content, note.content)
  assert.equal((await request('/api/notes?bankId=' + bank.id)).length, 2)
  const session = { bankId: bank.id, questionOrder: [1, 2], answers: { 1: 'A' } }
  await request('/api/sessions', 'PUT', session)
  assert.equal((await request('/api/sessions/with-bank-info'))[0].progressPercent, 50)
  assert.ok(values.size)
})
