// 测验 store 的判分与统计逻辑（与网页版 src/stores/quiz.js 行为一致）
import test from 'node:test'
import assert from 'node:assert/strict'
import { installMockUni } from './helpers/mock-uni.mjs'

installMockUni()

const { createPinia, setActivePinia } = await import('pinia')
const { useQuizStore } = await import('../stores/quiz.js')

setActivePinia(createPinia())

const BANK = {
  id: 9,
  name: '测试题库',
  questions: [
    { id: 1, type: 'single', question: '单选', options: [{ label: 'A', text: 'a' }], answer: 'A', score: 2 },
    { id: 2, type: 'multi', question: '多选', options: [{ label: 'A', text: 'a' }], answer: ['A', 'C'], score: 2 },
    { id: 3, type: 'fill', question: '填空', blanks: 2, answer: ['TCP', 'IP'], score: 2 },
  ],
}

test('单选/多选/填空都答对时统计全对', () => {
  const quiz = useQuizStore()
  quiz.startQuiz(BANK, { mode: 'practice' })

  quiz.submitAnswer('A')
  quiz.nextQuestion()
  quiz.submitAnswer(['C', 'A'])          // 多选顺序无关
  quiz.nextQuestion()
  quiz.submitAnswer([' tcp ', 'ip'])     // 填空忽略大小写与空格

  assert.equal(quiz.correctCount, 3)
  assert.equal(quiz.wrongCount, 0)
  assert.equal(quiz.unansweredCount, 0)
  assert.equal(quiz.currentScore, 6)
  assert.equal(quiz.totalScore, 6)
  assert.equal(quiz.finalScore, 100)
  assert.equal(quiz.accuracy, 100)
  assert.deepEqual(quiz.wrongQuestionIds, [])
})

test('答错的题目进入错题列表，改对后移除', () => {
  const quiz = useQuizStore()
  quiz.startQuiz(BANK, { mode: 'practice' })

  quiz.submitAnswer('B')
  assert.equal(quiz.wrongCount, 1)
  assert.deepEqual(quiz.wrongQuestionIds, [1])

  quiz.submitAnswer('A')
  assert.equal(quiz.wrongCount, 0)
  assert.deepEqual(quiz.wrongQuestionIds, [])
})

test('填空没填满算未答，不算错', () => {
  const quiz = useQuizStore()
  quiz.startQuiz(BANK, { mode: 'practice' })
  quiz.jumpToQuestion(2)

  quiz.submitAnswer(['TCP', ''])
  assert.equal(quiz.correctCount, 0)
  assert.equal(quiz.wrongCount, 0)
  assert.equal(quiz.unansweredCount, 3)
})

test('未作答的题目按总分计入 accuracy 分母', () => {
  const quiz = useQuizStore()
  quiz.startQuiz(BANK, { mode: 'practice' })
  quiz.submitAnswer('A')

  assert.equal(quiz.correctCount, 1)
  assert.equal(quiz.unansweredCount, 2)
  assert.equal(quiz.accuracy, 33)   // 1/3
  assert.equal(quiz.finalScore, 33)  // 2/6
})
