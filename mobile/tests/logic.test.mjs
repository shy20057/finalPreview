// 题库解析与校验（纯逻辑，不启动后端、不启动设备）
import test from 'node:test'
import assert from 'node:assert/strict'
import { validateBank, getBankSummary } from '../utils/validator.js'
import { parseMdBank } from '../utils/parser.js'

const single = { id: 1, type: 'single', question: 'q', options: [{ label: 'A', text: 'a' }, { label: 'B', text: 'b' }], answer: 'A', score: 2 }

test('合法题库通过校验', () => {
  const res = validateBank({ name: 'B', questions: [single] })
  assert.equal(res.valid, true)
  assert.deepEqual(res.errors, [])
  assert.equal(res.data.questions.length, 1)
})

test('缺少 name 或 questions 会被拦下', () => {
  assert.equal(validateBank({ questions: [single] }).valid, false)
  assert.equal(validateBank({ name: 'B' }).valid, false)
  assert.equal(validateBank(null).valid, false)
})

test('单选题选项不足 2 个、答案不是字母都会报错', () => {
  const res = validateBank({
    name: 'B',
    questions: [{ ...single, options: [{ label: 'A', text: 'a' }] }],
  })
  assert.equal(res.valid, false)
  assert.match(res.errors.join('\n'), /options 至少需要 2 个选项/)
})

test('多选题答案必须至少两个，填空题答案长度要与 blanks 一致', () => {
  const multi = validateBank({ name: 'B', questions: [{ id: 1, type: 'multi', question: 'q', options: [
    { label: 'A', text: 'a' }, { label: 'B', text: 'b' }, { label: 'C', text: 'c' },
  ], answer: ['A'] }] })
  assert.equal(multi.valid, false)

  const fill = validateBank({ name: 'B', questions: [{ id: 1, type: 'fill', question: 'q', blanks: 2, answer: ['x'] }] })
  assert.equal(fill.valid, false)
  assert.match(fill.errors.join('\n'), /blanks/)
})

test('统计摘要按题型分类并累加总分', () => {
  const summary = getBankSummary({
    name: 'B',
    subject: '操作系统',
    questions: [single, { ...single, id: 2, type: 'essay', answer: 'ref', score: 5 }],
  })
  assert.equal(summary.totalQuestions, 2)
  assert.equal(summary.singleCount, 1)
  assert.equal(summary.essayCount, 1)
  assert.equal(summary.totalScore, 7)
  assert.equal(summary.subject, '操作系统')
})

test('Markdown 里的 json 代码块能被解析出来，数值 0 的 id 保留', () => {
  const text = '```json\n' + JSON.stringify({ name: 'B', questions: [{ id: 0, type: 'essay', question: 'q', answer: 'ref' }] }) + '\n```'
  const res = parseMdBank(text)
  assert.equal(res.success, true)
  assert.equal(res.data.questions[0].id, 0)
})

test('没有代码块或 JSON 非法时给出错误', () => {
  assert.equal(parseMdBank('没有代码块').success, false)
  assert.match(parseMdBank('```json\n{坏掉的\n```').error, /JSON 解析失败/)
})
