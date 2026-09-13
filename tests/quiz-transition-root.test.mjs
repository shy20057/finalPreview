import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parse, compileTemplate } from '@vue/compiler-sfc'

test('QuizView compiles to a single element root for RouterView transitions', async () => {
  const filename = new URL('../src/views/QuizView.vue', import.meta.url)
  const source = await readFile(filename, 'utf8')
  const { descriptor } = parse(source, { filename: filename.pathname })
  const result = compileTemplate({
    source: descriptor.template.content,
    filename: filename.pathname,
    id: 'quiz-view',
  })

  assert.deepEqual(result.errors, [])
  assert.match(
    result.code,
    /return \(_openBlock\(\), _createElementBlock\("div", _hoisted_1,/,
    'QuizView must compile with a div root because App animates it inside Transition',
  )
})
