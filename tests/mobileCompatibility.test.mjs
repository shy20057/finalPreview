// In-memory fixtures never open the real quiz.db. Run with the user's approval.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { migrateMobileCompatibility, saveHistoryRecord } from '../server/mobileCompatibility.js'

function fixture() {
  const db = new DatabaseSync(':memory:')
  db.exec(`CREATE TABLE history (
    id INTEGER PRIMARY KEY AUTOINCREMENT, bankId INTEGER, bankName TEXT, mode TEXT,
    score INTEGER, correctCount INTEGER, wrongCount INTEGER, totalQuestions INTEGER,
    duration INTEGER, answers TEXT, wrongQuestionIds TEXT, wrongQuestions TEXT,
    userId INTEGER, date TEXT
  ); CREATE TABLE quiz_sessions (bank_id TEXT, userId INTEGER)`)
  migrateMobileCompatibility(db)
  return db
}

test('additive mobile migration can run twice and keeps legacy rows', () => {
  const db = fixture()
  try {
    db.prepare('INSERT INTO history (bankName, userId) VALUES (?, ?)').run('legacy', 1)
    migrateMobileCompatibility(db)
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM history').get().n, 1)
    assert.ok(db.prepare('PRAGMA table_info(quiz_sessions)').all().some(c => c.name === 'submitted_ids'))
  } finally { db.close() }
})

test('retrying a submission returns its original history and snapshot', () => {
  const db = fixture()
  try {
    const data = { bankId: 8, bankName: 'bank', submissionId: 'mobile-retry', score: 100, questions: [{ id: 1, question: 'original' }], answers: { 1: 'A' } }
    const first = saveHistoryRecord(db, 1, data)
    const retry = saveHistoryRecord(db, 1, { ...data, score: 0, questions: [] })
    assert.equal(retry.id, first.id)
    assert.equal(retry.score, 100)
    assert.equal(retry.questions[0].question, 'original')
    assert.deepEqual(retry.answers, { 1: 'A' })
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM history').get().n, 1)
  } finally { db.close() }
})

test('submission identifiers are scoped to accounts, legacy requests remain insertable', () => {
  const db = fixture()
  try {
    const first = saveHistoryRecord(db, 1, { submissionId: 'same' })
    const other = saveHistoryRecord(db, 2, { submissionId: 'same' })
    assert.notEqual(first.id, other.id)
    saveHistoryRecord(db, 1, {})
    saveHistoryRecord(db, 1, {})
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM history').get().n, 4)
  } finally { db.close() }
})
