import test from 'node:test'
import assert from 'node:assert/strict'

let selectionModule
try {
  selectionModule = await import('../src/utils/noteSelection.js')
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
