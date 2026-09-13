import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const DEBUG_PORT = 9333

async function waitForDebugger() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)
      if (response.ok) return response.json()
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error('Edge debugging endpoint did not become ready')
}

function createCdpClient(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl)
  let nextId = 0
  const pending = new Map()

  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (!message.id || !pending.has(message.id)) return
    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) reject(new Error(message.error.message))
    else resolve(message.result)
  })

  return {
    ready: new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true })
      socket.addEventListener('error', reject, { once: true })
    }),
    send(method, params = {}) {
      const id = ++nextId
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject })
        socket.send(JSON.stringify({ id, method, params }))
      })
    },
    close() {
      socket.close()
    },
  }
}

test('desktop quiz keeps visible space between question navigation and content', async t => {
  const profileDir = await mkdtemp(join(tmpdir(), 'quiz-layout-edge-'))
  const edge = spawn(EDGE_PATH, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--no-first-run',
    '--remote-allow-origins=*',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ], { stdio: 'ignore' })

  const pages = await waitForDebugger()
  const page = pages.find(item => item.type === 'page')
  assert.ok(page, 'a debuggable Edge page should exist')

  const cdp = createCdpClient(page.webSocketDebuggerUrl)
  await cdp.ready
  t.after(async () => {
    try {
      await cdp.send('Browser.close')
    } catch {}
    cdp.close()
    edge.kill()
    await new Promise(resolve => setTimeout(resolve, 500))
    await rm(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
  })

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1453,
    height: 709,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/#/quiz/10' })

  let layout
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const nav = document.querySelector('.quiz-sidebar')?.getBoundingClientRect()
        const content = document.querySelector('.quiz-content')?.getBoundingClientRect()
        if (!nav || !content || content.width === 0) return null
        return { navRight: nav.right, contentLeft: content.left }
      })()`,
      returnByValue: true,
    })
    layout = result.result.value
    if (layout) break
    await new Promise(resolve => setTimeout(resolve, 250))
  }

  assert.ok(layout, 'quiz desktop layout should render')
  assert.ok(
    layout.contentLeft - layout.navRight >= 16,
    `expected at least 16px between navigation and content, got ${layout.contentLeft - layout.navRight}px`,
  )
})
