import express from 'express'
import cors from 'cors'
import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Initialize SQLite database
const dbPath = path.join(dataDir, 'quiz.db')
const db = new DatabaseSync(dbPath)

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subject TEXT,
    questions TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bankId INTEGER,
    bankName TEXT,
    mode TEXT,
    score INTEGER,
    correctCount INTEGER,
    wrongCount INTEGER,
    totalQuestions INTEGER,
    duration INTEGER,
    answers TEXT,
    wrongQuestionIds TEXT,
    wrongQuestions TEXT,
    date TEXT DEFAULT CURRENT_TIMESTAMP
  )
`)

// Migration: add wrongQuestions column if missing
try {
  db.exec('ALTER TABLE history ADD COLUMN wrongQuestions TEXT')
} catch (e) {
  // column may already exist, ignore
}

db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bankId INTEGER,
    questionId INTEGER,
    parent_id INTEGER,
    title TEXT NOT NULL DEFAULT '未命名',
    content TEXT DEFAULT '',
    type TEXT DEFAULT 'note',
    sort_order INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bankId, questionId)
  )
`)

// Migration: add sort_order column if missing (table existed before this column was added)
try {
  db.exec('ALTER TABLE notes ADD COLUMN sort_order INTEGER DEFAULT 0')
} catch (e) {
  // column may already exist, ignore
}

// Note tree table (hierarchical notes — separate from quiz notes)
db.exec(`
  CREATE TABLE IF NOT EXISTS note_tree (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER,
    title TEXT NOT NULL DEFAULT '未命名',
    type TEXT DEFAULT 'note',
    content TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`)

// AI provider configs table
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    baseUrl TEXT NOT NULL DEFAULT '',
    apiKey TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    isDefault INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`)

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// ===== BANKS =====

app.get('/api/banks', (req, res) => {
  const stmt = db.prepare('SELECT * FROM banks ORDER BY createdAt DESC')
  const rows = stmt.all()
  const banks = rows.map(r => ({
    ...r,
    questions: JSON.parse(r.questions),
  }))
  res.json(banks)
})

app.post('/api/banks', (req, res) => {
  const { name, subject, questions } = req.body
  const stmt = db.prepare('INSERT INTO banks (name, subject, questions) VALUES (?, ?, ?)')
  const result = stmt.run(name, subject || '', JSON.stringify(questions || []))
  res.json({ id: result.lastInsertRowid, name, subject, questions, createdAt: new Date().toISOString() })
})

app.delete('/api/banks/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM banks WHERE id = ?')
  stmt.run(req.params.id)
  res.json({ success: true })
})

// ===== HISTORY =====

app.get('/api/history', (req, res) => {
  const stmt = db.prepare('SELECT * FROM history ORDER BY date DESC')
  const rows = stmt.all()
  const records = rows.map(r => ({
    ...r,
    answers: r.answers ? JSON.parse(r.answers) : {},
    wrongQuestionIds: r.wrongQuestionIds ? JSON.parse(r.wrongQuestionIds) : [],
    wrongQuestions: r.wrongQuestions ? JSON.parse(r.wrongQuestions) : [],
  }))
  res.json(records)
})

app.post('/api/history', (req, res) => {
  const { bankId, bankName, mode, score, correctCount, wrongCount, totalQuestions, duration, answers, wrongQuestionIds, wrongQuestions } = req.body
  const stmt = db.prepare(`
    INSERT INTO history (bankId, bankName, mode, score, correctCount, wrongCount, totalQuestions, duration, answers, wrongQuestionIds, wrongQuestions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(
    bankId, bankName, mode, score, correctCount, wrongCount, totalQuestions, duration,
    JSON.stringify(answers || {}),
    JSON.stringify(wrongQuestionIds || []),
    JSON.stringify(wrongQuestions || [])
  )
  res.json({ id: result.lastInsertRowid, ...req.body, date: new Date().toISOString() })
})

app.delete('/api/history/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM history WHERE id = ?')
  stmt.run(req.params.id)
  res.json({ success: true })
})

app.delete('/api/history', (req, res) => {
  db.exec('DELETE FROM history')
  res.json({ success: true })
})

// ===== EXPORT / IMPORT =====

app.get('/api/export', (req, res) => {
  const banks = db.prepare('SELECT * FROM banks').all().map(r => ({ ...r, questions: JSON.parse(r.questions) }))
  const history = db.prepare('SELECT * FROM history').all().map(r => ({
    ...r,
    answers: r.answers ? JSON.parse(r.answers) : {},
    wrongQuestionIds: r.wrongQuestionIds ? JSON.parse(r.wrongQuestionIds) : [],
    wrongQuestions: r.wrongQuestions ? JSON.parse(r.wrongQuestions) : [],
  }))
  const notes = db.prepare('SELECT * FROM notes').all()
  const aiConfigs = db.prepare('SELECT * FROM ai_configs').all()
  res.json({ banks, history, notes, aiConfigs, exportedAt: new Date().toISOString() })
})

app.post('/api/import', (req, res) => {
  const { banks, history, notes, aiConfigs } = req.body
  if (banks && Array.isArray(banks)) {
    db.exec('DELETE FROM banks')
    const stmt = db.prepare('INSERT INTO banks (id, name, subject, questions, createdAt) VALUES (?, ?, ?, ?, ?)')
    for (const b of banks) {
      stmt.run(b.id, b.name, b.subject || '', JSON.stringify(b.questions || []), b.createdAt || new Date().toISOString())
    }
  }
  if (history && Array.isArray(history)) {
    db.exec('DELETE FROM history')
    const stmt = db.prepare(`
      INSERT INTO history (id, bankId, bankName, mode, score, correctCount, wrongCount, totalQuestions, duration, answers, wrongQuestionIds, wrongQuestions, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const h of history) {
      stmt.run(
        h.id, h.bankId, h.bankName, h.mode, h.score, h.correctCount, h.wrongCount,
        h.totalQuestions, h.duration,
        JSON.stringify(h.answers || {}),
        JSON.stringify(h.wrongQuestionIds || []),
        JSON.stringify(h.wrongQuestions || []),
        h.date
      )
    }
  }
  if (notes && Array.isArray(notes)) {
    db.exec('DELETE FROM notes')
    const stmt = db.prepare('INSERT INTO notes (id, bankId, questionId, content, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)')
    for (const n of notes) {
      stmt.run(n.id, n.bankId, n.questionId, n.content, n.createdAt, n.updatedAt)
    }
  }
  if (aiConfigs && Array.isArray(aiConfigs)) {
    db.exec('DELETE FROM ai_configs')
    const stmt = db.prepare(`
      INSERT INTO ai_configs (id, name, baseUrl, apiKey, model, isDefault, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const c of aiConfigs) {
      stmt.run(c.id, c.name, c.baseUrl || '', c.apiKey || '', c.model || '', c.isDefault || 0, c.createdAt || new Date().toISOString(), c.updatedAt || new Date().toISOString())
    }
  }
  res.json({ success: true })
})

// ===== QUESTION NOTES (per bankId + questionId) =====

// GET /api/notes?bankId=xxx
app.get('/api/notes', (req, res) => {
  const bankId = req.query.bankId
  let rows
  if (bankId !== undefined) {
    rows = db.prepare('SELECT * FROM notes WHERE bankId = ? ORDER BY id ASC').all(bankId)
  } else {
    rows = db.prepare('SELECT * FROM notes ORDER BY id ASC').all()
  }
  res.json(rows)
})

// GET /api/notes/quiz - 获取所有练习笔记，附带题库名和题目信息
app.get('/api/notes/quiz', (req, res) => {
  const rows = db.prepare(`
    SELECT n.id, n.bankId, n.questionId, n.content, n.createdAt, n.updatedAt,
           b.name AS bankName, b.questions AS bankQuestions
    FROM notes n
    LEFT JOIN banks b ON n.bankId = b.id
    WHERE n.bankId IS NOT NULL AND n.questionId IS NOT NULL
    ORDER BY n.updatedAt DESC
  `).all()
  const result = rows.map(r => {
    let question = null
    try {
      const qs = JSON.parse(r.bankQuestions || '[]')
      question = qs.find(q => q.id === r.questionId) || null
    } catch (e) { /* ignore */ }
    return {
      id: r.id,
      bankId: r.bankId,
      questionId: r.questionId,
      content: r.content,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      bankName: r.bankName || '未知题库',
      question,
    }
  })
  res.json(result)
})

// GET /api/notes/:bankId/:questionId
app.get('/api/notes/:bankId/:questionId', (req, res) => {
  const { bankId, questionId } = req.params
  const row = db.prepare(
    'SELECT * FROM notes WHERE bankId = ? AND questionId = ?'
  ).get(bankId, questionId)
  if (!row) return res.json(null)
  res.json(row)
})

// ===== NOTES TREE / CRUD (must be before static file serving) =====

// GET /api/notes/tree
app.get('/api/notes/tree', (req, res) => {
  const stmt = db.prepare(`
    SELECT id, parent_id, title, type, content, sort_order, createdAt, updatedAt
    FROM note_tree
    ORDER BY sort_order ASC, id ASC
  `)
  const rows = stmt.all()
  res.json(rows)
})

// POST /api/notes — tree notes (parent_id, title, type, content)
app.post('/api/notes', (req, res) => {
  const { parent_id, title, type, content } = req.body
  // If bankId is present, this is a quiz note — delegate to quiz notes handler
  if (req.body.bankId !== undefined || req.body.questionId !== undefined) {
    return next()
  }
  const now = new Date().toISOString()
  const maxOrder = db.prepare(
    'SELECT MAX(sort_order) as m FROM note_tree WHERE parent_id IS ?'
  ).get(parent_id ?? null)
  const sort_order = (maxOrder?.m ?? -1) + 1
  const stmt = db.prepare(`
    INSERT INTO note_tree (parent_id, title, type, content, sort_order, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(parent_id ?? null, title || '未命名', type || 'note', content || '', sort_order, now, now)
  res.json({ id: result.lastInsertRowid, parent_id, title: title || '未命名', type: type || 'note', content: content || '', sort_order, createdAt: now, updatedAt: now })
})

// POST /api/notes  body: { bankId, questionId, content }
app.post('/api/notes', (req, res) => {
  const { bankId, questionId, content } = req.body
  if (bankId === undefined || questionId === undefined) {
    return res.status(400).json({ error: 'bankId and questionId are required' })
  }
  const now = new Date().toISOString()
  const stmt = db.prepare(`
    INSERT INTO notes (bankId, questionId, content, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(bankId, questionId) DO UPDATE SET
      content = excluded.content,
      updatedAt = excluded.updatedAt
  `)
  stmt.run(bankId, questionId, content || '', now, now)
  const row = db.prepare(
    'SELECT * FROM notes WHERE bankId = ? AND questionId = ?'
  ).get(bankId, questionId)
  res.json(row)
})

// DELETE /api/notes/:bankId/:questionId
app.delete('/api/notes/:bankId/:questionId', (req, res) => {
  const { bankId, questionId } = req.params
  db.prepare('DELETE FROM notes WHERE bankId = ? AND questionId = ?')
    .run(bankId, questionId)
  res.json({ success: true })
})

// PUT /api/notes/:id
app.put('/api/notes/:id', (req, res) => {
  const { parent_id, title, content, sort_order } = req.body
  const now = new Date().toISOString()
  const fields = []
  const values = []
  if (title !== undefined)   { fields.push('title = ?');       values.push(title) }
  if (content !== undefined)  { fields.push('content = ?');     values.push(content) }
  if (parent_id !== undefined){ fields.push('parent_id = ?');   values.push(parent_id) }
  if (sort_order !== undefined){ fields.push('sort_order = ?'); values.push(sort_order) }
  fields.push('updatedAt = ?')
  values.push(now)
  values.push(req.params.id)
  db.prepare(`UPDATE note_tree SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  const row = db.prepare('SELECT * FROM note_tree WHERE id = ?').get(req.params.id)
  res.json(row)
})

// POST /api/notes/reorder — 批量更新同级排序
app.post('/api/notes/reorder', (req, res) => {
  const { orders } = req.body
  if (!Array.isArray(orders)) return res.status(400).json({ error: 'orders must be an array' })
  const now = new Date().toISOString()
  const update = db.prepare('UPDATE note_tree SET sort_order = ?, updatedAt = ? WHERE id = ?')
  for (const o of orders) {
    update.run(o.sort_order, now, o.id)
  }
  res.json({ success: true })
})

// DELETE /api/notes/:id（级联删除子孙）
app.delete('/api/notes/:id', (req, res) => {
  function collectIds(id) {
    const ids = [id]
    const children = db.prepare('SELECT id FROM note_tree WHERE parent_id = ?').all(id)
    for (const c of children) {
      ids.push(...collectIds(c.id))
    }
    return ids
  }
  const ids = collectIds(Number(req.params.id))
  const placeholders = ids.map(() => '?').join(',')
  db.prepare(`DELETE FROM note_tree WHERE id IN (${placeholders})`).run(...ids)
  res.json({ success: true, deletedCount: ids.length })
})

// GET /api/notes/export/:id
app.get('/api/notes/export/:id', (req, res) => {
  try {
    const note = db.prepare('SELECT * FROM note_tree WHERE id = ?').get(Number(req.params.id))
    if (!note) return res.status(404).json({ error: '笔记不存在' })
    const filename = `${note.title || '未命名'}.md`
    // 使用 RFC 5987 编码支持中文文件名
    const encoded = encodeURIComponent(filename)
    res.setHeader('Content-Disposition', `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`)
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    res.send(note.content || '')
  } catch (err) {
    console.error('导出失败:', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/notes/import
app.post('/api/notes/import', (req, res) => {
  const filename = req.body?.filename || '未命名'
  const content = req.body?.content || ''
  const now = new Date().toISOString()
  const result = db.prepare(`
    INSERT INTO note_tree (parent_id, title, type, content, sort_order, createdAt, updatedAt)
    VALUES (NULL, ?, 'note', ?, 0, ?, ?)
  `).run(filename, content, now, now)
  res.json({ id: result.lastInsertRowid, title: filename, type: 'note', content, createdAt: now })
})

// ===== AI CONFIGS =====

// GET /api/ai-configs — 获取所有厂商配置
app.get('/api/ai-configs', (req, res) => {
  const stmt = db.prepare('SELECT * FROM ai_configs ORDER BY id ASC')
  res.json(stmt.all())
})

// GET /api/ai-configs/:name — 获取单个厂商配置
app.get('/api/ai-configs/:name', (req, res) => {
  const row = db.prepare('SELECT * FROM ai_configs WHERE name = ?').get(req.params.name)
  if (!row) return res.status(404).json({ error: '配置不存在' })
  res.json(row)
})

// GET /api/ai-configs/default — 获取默认配置
app.get('/api/ai-configs/default/active', (req, res) => {
  const row = db.prepare('SELECT * FROM ai_configs WHERE isDefault = 1 LIMIT 1').get()
  res.json(row || null)
})

// POST /api/ai-configs — 创建或更新厂商配置
app.post('/api/ai-configs', (req, res) => {
  const { name, baseUrl, apiKey, model, isDefault } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  const now = new Date().toISOString()

  // 如果设置为默认，先清除其他厂商的默认标志
  if (isDefault) {
    db.prepare('UPDATE ai_configs SET isDefault = 0').run()
  }

  const stmt = db.prepare(`
    INSERT INTO ai_configs (name, baseUrl, apiKey, model, isDefault, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      baseUrl = excluded.baseUrl,
      apiKey = excluded.apiKey,
      model = excluded.model,
      isDefault = excluded.isDefault,
      updatedAt = excluded.updatedAt
  `)
  stmt.run(name, baseUrl || '', apiKey || '', model || '', isDefault ? 1 : 0, now, now)
  const row = db.prepare('SELECT * FROM ai_configs WHERE name = ?').get(name)
  res.json(row)
})

// PUT /api/ai-configs/:name — 更新厂商配置
app.put('/api/ai-configs/:name', (req, res) => {
  const { baseUrl, apiKey, model, isDefault } = req.body
  const now = new Date().toISOString()

  if (isDefault) {
    db.prepare('UPDATE ai_configs SET isDefault = 0').run()
  }

  const fields = []
  const values = []
  if (baseUrl !== undefined) { fields.push('baseUrl = ?'); values.push(baseUrl) }
  if (apiKey !== undefined) { fields.push('apiKey = ?'); values.push(apiKey) }
  if (model !== undefined) { fields.push('model = ?'); values.push(model) }
  if (isDefault !== undefined) { fields.push('isDefault = ?'); values.push(isDefault ? 1 : 0) }
  fields.push('updatedAt = ?')
  values.push(now)
  values.push(req.params.name)

  db.prepare(`UPDATE ai_configs SET ${fields.join(', ')} WHERE name = ?`).run(...values)
  const row = db.prepare('SELECT * FROM ai_configs WHERE name = ?').get(req.params.name)
  if (!row) return res.status(404).json({ error: '配置不存在' })
  res.json(row)
})

// DELETE /api/ai-configs/:name — 删除厂商配置
app.delete('/api/ai-configs/:name', (req, res) => {
  const stmt = db.prepare('DELETE FROM ai_configs WHERE name = ?')
  stmt.run(req.params.name)
  res.json({ success: true })
})

// ===== STATIC FILES =====
// Serve frontend build in production (must be last to not catch API routes)
const distPath = path.join(__dirname, 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Quiz server running on http://localhost:${PORT}`)
})
