import { demoBanks } from './demoSeed.js'
import { demoPassword, demoToken, demoUsername } from './demoMode.js'

const STORAGE_KEY = 'finalprep-ui-demo-v1'
const clone = value => JSON.parse(JSON.stringify(value))
const now = () => new Date().toISOString()
const same = (a, b) => String(a) === String(b)

function initialData() {
  const banks = demoBanks.map((bank, index) => ({ ...clone(bank), id: 101 + index, createdAt: now() }))
  const first = banks[0]
  const question = first.questions[0]
  return {
    nextId: 1000,
    banks,
    history: [{
      id: 901, bankId: first.id, bankName: first.name, mode: 'practice', score: 60,
      correctCount: 3, wrongCount: 2, totalQuestions: 5, duration: 420,
      answers: {}, wrongQuestionIds: [question.id], wrongQuestions: [question],
      date: new Date(Date.now() - 86400000).toISOString(),
    }],
    notes: [{
      id: 902, bankId: first.id, questionId: question.id,
      content: '演示笔记：短作业优先调度可能导致长作业饥饿。',
      createdAt: now(), updatedAt: now(),
    }],
    noteTree: [{
      id: 903, parent_id: null, title: '复习计划', type: 'note',
      content: '# 复习计划\n\n这是前端演示数据。你可以编辑笔记，数据会保存在当前浏览器。',
      sort_order: 0, createdAt: now(), updatedAt: now(),
    }],
    favorites: [{
      id: 904, bankId: first.id, questionId: question.id,
      bankName: first.name, questionData: question, createdAt: now(),
    }],
    sessions: [],
  }
}

function readData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (Array.isArray(data.banks) && Array.isArray(data.history)) return data
    }
  } catch { /* Reset damaged demo data. */ }
  const data = initialData()
  writeData(data)
  return data
}

function writeData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }
function nextId(data) { return ++data.nextId }
function done(data, result) { writeData(data); return clone(result) }
function success() { return { success: true } }
function unsupported() { throw new Error('前端演示版不支持此操作') }

export async function demoApiRequest(url, options = {}, token = '') {
  const method = (options.method || 'GET').toUpperCase()
  const body = options.body ? JSON.parse(options.body) : {}
  const parsed = new URL(url, 'https://demo.local')
  const path = parsed.pathname
  const parts = path.split('/').filter(Boolean)

  if (path === '/api/auth/login' && method === 'POST') {
    if (body.username !== demoUsername || body.password !== demoPassword) throw new Error('用户名或密码错误')
    return { token: demoToken, user: { id: 'demo', username: demoUsername } }
  }
  if (path === '/api/auth/register') throw new Error('演示站点不支持注册')
  if (token !== demoToken) throw new Error('请先登录演示账号')
  if (path === '/api/auth/me') return { id: 'demo', username: demoUsername }

  const data = readData()
  if (path === '/api/banks') {
    if (method === 'GET') return clone(data.banks)
    if (method === 'POST') {
      const bank = { ...body, id: nextId(data), createdAt: now() }
      data.banks.unshift(bank)
      return done(data, bank)
    }
  }
  if (parts[1] === 'banks' && parts.length === 3) {
    const bank = data.banks.find(item => same(item.id, parts[2]))
    if (method === 'DELETE') {
      data.banks = data.banks.filter(item => !same(item.id, parts[2]))
      return done(data, success())
    }
    if (method === 'PUT') {
      if (!bank) throw new Error('题库不存在')
      Object.assign(bank, { name: body.name, subject: body.subject || '' })
      return done(data, success())
    }
  }

  if (path === '/api/history') {
    if (method === 'GET') return clone(data.history.sort((a, b) => b.date.localeCompare(a.date)))
    if (method === 'DELETE') { data.history = []; return done(data, success()) }
    if (method === 'POST') {
      const record = { ...body, id: nextId(data), date: now() }
      data.history.unshift(record)
      return done(data, record)
    }
  }
  if (path === '/api/history/session' && method === 'PUT') {
    const record = { ...body, id: nextId(data), date: now() }
    data.history.unshift(record)
    writeData(data)
    return { id: record.id, date: record.date }
  }
  if (parts[1] === 'history' && parts.length === 3 && method === 'DELETE') {
    data.history = data.history.filter(item => !same(item.id, parts[2]))
    return done(data, success())
  }

  if (path === '/api/notes/quiz' && method === 'GET') {
    return clone(data.notes.map(note => {
      const bank = data.banks.find(item => same(item.id, note.bankId))
      return { ...note, bankName: bank?.name || '未知题库',
        question: bank?.questions.find(item => same(item.id, note.questionId)) || null }
    }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
  }
  if (path === '/api/notes/tree' && method === 'GET') return clone(data.noteTree.sort((a, b) => a.sort_order - b.sort_order))
  if (path === '/api/notes' && method === 'GET') {
    const bankId = parsed.searchParams.get('bankId')
    return clone(data.notes.filter(note => bankId === null || same(note.bankId, bankId)))
  }
  if (path === '/api/notes' && method === 'POST') {
    if (body.bankId !== undefined) {
      let note = data.notes.find(item => same(item.bankId, body.bankId) && same(item.questionId, body.questionId))
      if (!note) {
        note = { id: nextId(data), bankId: body.bankId, questionId: body.questionId, createdAt: now() }
        data.notes.push(note)
      }
      note.content = body.content || ''
      note.updatedAt = now()
      return done(data, note)
    }
    const siblings = data.noteTree.filter(item => same(item.parent_id, body.parent_id ?? null))
    const note = { id: nextId(data), parent_id: body.parent_id ?? null, title: body.title || '未命名',
      type: body.type || 'note', content: body.content || '', sort_order: siblings.length,
      createdAt: now(), updatedAt: now() }
    data.noteTree.push(note)
    return done(data, note)
  }
  if (path === '/api/notes/batch-delete' && method === 'POST') {
    const ids = new Set((body.ids || []).map(String))
    const before = data.notes.length
    data.notes = data.notes.filter(item => !ids.has(String(item.id)))
    return done(data, { success: true, deletedCount: before - data.notes.length })
  }
  if (path === '/api/notes/reorder' && method === 'POST') {
    for (const order of body.orders || []) {
      const note = data.noteTree.find(item => same(item.id, order.id))
      if (note) { note.sort_order = order.sort_order; note.updatedAt = now() }
    }
    return done(data, success())
  }
  if (parts[1] === 'notes' && parts.length === 4) {
    const note = data.notes.find(item => same(item.bankId, parts[2]) && same(item.questionId, parts[3]))
    if (method === 'GET') return clone(note || null)
    if (method === 'DELETE') {
      data.notes = data.notes.filter(item => item !== note)
      return done(data, success())
    }
  }
  if (parts[1] === 'notes' && parts.length === 3) {
    const note = data.noteTree.find(item => same(item.id, parts[2]))
    if (method === 'PUT') {
      if (!note) throw new Error('笔记不存在')
      Object.assign(note, body, { updatedAt: now() })
      return done(data, note)
    }
    if (method === 'DELETE') {
      const ids = new Set([String(parts[2])])
      let changed = true
      while (changed) {
        changed = false
        for (const item of data.noteTree) {
          if (ids.has(String(item.parent_id)) && !ids.has(String(item.id))) {
            ids.add(String(item.id)); changed = true
          }
        }
      }
      data.noteTree = data.noteTree.filter(item => !ids.has(String(item.id)))
      return done(data, { success: true, deletedCount: ids.size })
    }
  }

  if (path === '/api/favorites') {
    if (method === 'GET') return clone(data.favorites)
    if (method === 'POST') {
      const existing = data.favorites.find(item => same(item.bankId, body.bankId) && same(item.questionId, body.questionId))
      if (existing) return clone(existing)
      const favorite = { ...body, id: nextId(data), createdAt: now() }
      data.favorites.unshift(favorite)
      return done(data, favorite)
    }
  }
  if (parts[1] === 'favorites' && parts.length === 4) {
    const favorite = data.favorites.find(item => same(item.bankId, parts[2]) && same(item.questionId, parts[3]))
    if (method === 'GET') return { favorited: !!favorite, id: favorite?.id || null }
    if (method === 'DELETE') {
      data.favorites = data.favorites.filter(item => item !== favorite)
      return done(data, success())
    }
  }

  if (path === '/api/sessions/with-bank-info' && method === 'GET') {
    return clone(data.sessions.map(session => {
      const bank = data.banks.find(item => same(item.id, session.bankId))
      const totalQuestions = session.questionOrder?.length || 0
      const answeredCount = Object.keys(session.answers || {}).length
      return { ...session, bankName: bank?.name || '', subject: bank?.subject || '', totalQuestions,
        answeredCount, progressPercent: totalQuestions ? Math.round(answeredCount / totalQuestions * 100) : 0 }
    }))
  }
  if (path === '/api/sessions') {
    if (method === 'GET') return clone(data.sessions)
    if (method === 'PUT') {
      if (!body.bankId) throw new Error('bankId is required')
      const session = { ...body, updatedAt: now() }
      data.sessions = data.sessions.filter(item => !same(item.bankId, body.bankId))
      data.sessions.unshift(session)
      writeData(data)
      return { success: true, updatedAt: session.updatedAt }
    }
  }
  if (parts[1] === 'sessions' && parts.length === 3) {
    const session = data.sessions.find(item => same(item.bankId, parts[2]))
    if (method === 'GET') return clone(session || null)
    if (method === 'DELETE') {
      data.sessions = data.sessions.filter(item => item !== session)
      return done(data, success())
    }
  }

  if (path === '/api/ai-configs' && method === 'GET') return []
  if (path === '/api/ai-configs/default/active' && method === 'GET') return null
  if (path.startsWith('/api/ai-configs')) unsupported()

  if (path === '/api/resources' && method === 'GET') {
    const titles = {
      'tcp-congestion.html': 'TCP 拥塞控制', 'memory-management.html': '内存管理',
      'ip-fragmentation.html': 'IP 分片', 'disk-scheduling.html': '磁盘调度',
      'arp-protocol.html': 'ARP 协议',
    }
    return { files: Object.entries(titles).map(([file, title]) => ({
      file, name: file.slice(0, -5), title, size: 0, mtime: now(),
    })) }
  }
  if (path.startsWith('/api/resources')) unsupported()

  if (path === '/api/export' && method === 'GET') {
    return clone({ banks: data.banks, history: data.history, notes: data.notes,
      favorites: data.favorites, exportedAt: now() })
  }
  if (path === '/api/import' && method === 'POST') {
    for (const key of ['banks', 'history', 'notes', 'favorites']) {
      if (Array.isArray(body[key])) data[key] = body[key]
    }
    writeData(data)
    return { success: true }
  }
  throw new Error(`演示模式未支持的操作：${method} ${path}`)
}

export async function demoExportNote(id) {
  const note = readData().noteTree.find(item => same(item.id, id))
  if (!note) throw new Error('笔记不存在')
  return { blob: new Blob([note.content || ''], { type: 'text/markdown;charset=utf-8' }),
    filename: `${note.title || '未命名'}.md` }
}

export async function demoImportNote(file) {
  const data = readData()
  const title = file.name.replace(/\.md$/i, '')
  const content = await file.text()
  const note = { id: nextId(data), parent_id: null, title, type: 'note', content,
    sort_order: data.noteTree.filter(item => item.parent_id === null).length,
    createdAt: now(), updatedAt: now() }
  data.noteTree.push(note)
  return done(data, note)
}
