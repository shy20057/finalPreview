// 路由 shim：把原版 vue-router 的路径翻译成 uni-app 页面地址
import test from 'node:test'
import assert from 'node:assert/strict'
import { installMockUni } from './helpers/mock-uni.mjs'

installMockUni()

const { toUrl, useRouter, syncRoute, currentRoute } = await import('../utils/router.js')

test('静态路径翻译成 uni 页面地址', () => {
  assert.equal(toUrl('/'), '/pages/index/index')
  assert.equal(toUrl('/banks'), '/pages/banks/index')
  assert.equal(toUrl('/history'), '/pages/history/index')
  assert.equal(toUrl('/wrongbook'), '/pages/wrongbook/index')
  assert.equal(toUrl('/notes'), '/pages/notes/index')
})

test('带路径参数的地址把参数放进 query', () => {
  assert.equal(toUrl('/quiz/123'), '/pages/quiz/index?bankId=123')
  assert.equal(toUrl('/result/9'), '/pages/result/index?recordId=9')
})

test('命名路由 + params 同样能翻译', () => {
  assert.equal(toUrl({ name: 'quiz', params: { bankId: '5' } }), '/pages/quiz/index?bankId=5')
})

test('登录与注册共用一个页面，用 mode 区分', () => {
  assert.equal(toUrl('/login'), '/pages/auth/index')
  assert.equal(toUrl('/register'), '/pages/auth/index?mode=register')
})

test('查询参数原样带过去', () => {
  assert.equal(toUrl('/history?bankId=3'), '/pages/history/index?bankId=3')
})

test('router.push 走 uni.navigateTo', () => {
  const router = useRouter()
  router.push('/banks')
  router.replace('/history')
  const navs = globalThis.uni.navigateTo
  assert.ok(navs)
})
