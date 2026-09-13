import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'

let selectionModule
let databaseModule
try {
  selectionModule = await import('../src/utils/noteSelection.js')
  databaseModule = await import('../server/quizNotes.js')
} catch {}

test('selecting all visible notes preserves selections outside the current filter', () => {
  assert.equal(typeof selectionModule?.toggleVisibleSelection, 'function')
  const selected = new Set([99])

  const next = selectionModule.toggleVisibleSelection(selected, [1, 2])

  assert.deepEqual([...next].sort((a, b) => a - b), [1, 2, 99])
})

test('toggling fully selected visible notes clears only the visible selection', () => {
  assert.equal(typeof selectionModule?.toggleVisibleSelection, 'function')
  const selected = new Set([1, 2, 99])

  const next = selectionModule.toggleVisibleSelection(selected, [1, 2])

  assert.deepEqual([...next], [99])
})

test('batch deletion removes the requested quiz notes in one operation', () => {
  assert.equal(typeof databaseModule?.deleteQuizNotesByIds, 'function')
  const db = new DatabaseSync(':memory:')
  db.exec('CREATE TABLE notes (id INTEGER PRIMARY KEY, content TEXT)')
  db.exec("INSERT INTO notes VALUES (1, 'one'), (2, 'two'), (3, 'three')")

  const deletedCount = databaseModule.deleteQuizNotesByIds(db, [1, 3])
  const remaining = db.prepare('SELECT id FROM notes ORDER BY id').all().map(row => row.id)

  assert.equal(deletedCount, 2)
  assert.deepEqual(remaining, [2])
})

test('invalid batch ids are rejected before any note is deleted', () => {
  assert.equal(typeof databaseModule?.deleteQuizNotesByIds, 'function')
  const db = new DatabaseSync(':memory:')
  db.exec('CREATE TABLE notes (id INTEGER PRIMARY KEY, content TEXT)')
  db.exec("INSERT INTO notes VALUES (1, 'one'), (2, 'two')")

  assert.throws(
    () => databaseModule.deleteQuizNotesByIds(db, [1, 'invalid']),
    /positive integers/,
  )
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM notes').get().count, 2)
})
