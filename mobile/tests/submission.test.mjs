// 后端接口层（uni.request 的替身，不启动真实后端/设备/数据库）
import test from 'node:test'
import assert from 'node:assert/strict'
import { installMockUni } from './helpers/mock-uni.mjs'

const mock = installMockUni()

// 让 mock 支持自定义响应
mock.requests.length = 0
globalThis.uni.request = (opts) => {
  mock.requests.push(opts)
  const handler = globalThis.__nextResponse
  if (handler) {
    globalThis.__nextResponse = null
    const r = typeof handler === 'function' ? handler(opts) : handler
    if (r === 'fail') { opts.fail({ errMsg: 'request:fail' }); return }
    opts.success(r)
    return
  }
  opts.success({ statusCode: 200, data: { success: true } })
}

const { login, setToken, getToken, loadHistory, addHistoryRecord } = await import('../utils/api.js')

test('登录成功后把 token 存进 uni storage', async () => {
  globalThis.__nextResponse = { statusCode: 200, data: { token: 'abc123', user: { id: 1 } } }
  const res = await login('demo', 'demo123456')
  assert.equal(res.token, 'abc123')
  assert.equal(getToken(), 'abc123')
  assert.equal(mock.storage.get('quiz-token'), 'abc123')
})

test('请求自动带上 Bearer 头', async () => {
  setToken('abc123')
  await loadHistory()
  const req = mock.requests[mock.requests.length - 1]
  assert.equal(req.header.Authorization, 'Bearer abc123')
  assert.equal(req.header['Content-Type'], 'application/json')
})

test('401 清掉 token 并广播登录过期事件', async () => {
  let expired = false
  globalThis.uni.$on('quiz-auth-expired', () => { expired = true })
  globalThis.__nextResponse = { statusCode: 401, data: { error: 'unauthorized' } }
  await assert.rejects(loadHistory(), /登录已过期/)
  assert.equal(getToken(), '')
  assert.equal(expired, true)
})

test('非 2xx 把后端的 error 字段抛出来', async () => {
  globalThis.__nextResponse = { statusCode: 500, data: { error: '服务器炸了' } }
  await assert.rejects(loadHistory(), /服务器炸了/)
})

test('网络失败时抛的是可读的错误信息', async () => {
  globalThis.__nextResponse = 'fail'
  await assert.rejects(loadHistory(), /网络请求失败/)
})

test('提交历史记录时 body 被解析成对象发出', async () => {
  const record = { bankId: 3, score: 88, answers: { 1: 'A' } }
  globalThis.__nextResponse = { statusCode: 200, data: { id: 7 } }
  const res = await addHistoryRecord(record)
  assert.equal(res.id, 7)
  const req = mock.requests[mock.requests.length - 1]
  assert.equal(req.method, 'POST')
  assert.deepEqual(req.data, record)
})
