import express from 'express'
import cors from 'cors'
import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { deleteQuizNotesByIds } from './quizNotes.js'
import { migrateUserIsolation } from './userIsolation.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000
const JWT_EXPIRES = '7d'

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}
const secretPath = path.join(dataDir, 'auth-secret')
if (!process.env.JWT_SECRET && !fs.existsSync(secretPath)) {
  try {
    fs.writeFileSync(secretPath, randomBytes(48).toString('hex'), { flag: 'wx', mode: 0o600 })
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
  }
}
const JWT_SECRET = process.env.JWT_SECRET || fs.readFileSync(secretPath, 'utf8').trim()

// Initialize SQLite database
const dbPath = process.env.QUIZ_DB_PATH || path.join(dataDir, 'quiz.db')
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

// Favorites table
db.exec(`
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bankId INTEGER NOT NULL,
    questionId INTEGER NOT NULL,
    bankName TEXT,
    questionData TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bankId, questionId)
  )
`)

// Quiz sessions table (in-progress quiz state)
db.exec(`
  CREATE TABLE IF NOT EXISTS quiz_sessions (
    bank_id TEXT PRIMARY KEY,
    question_order TEXT,
    answers TEXT,
    current_index INTEGER DEFAULT 0,
    mode TEXT DEFAULT 'practice',
    shuffled INTEGER DEFAULT 0,
    start_time INTEGER,
    wrong_ids TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`)

// Users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`)

// Add ownership and account-scoped constraints to older databases.
migrateUserIsolation(db)

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// ===== AUTH MIDDLEWARE =====
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: '未登录或登录已过期' })
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.userId = decoded.userId
    req.username = decoded.username
    next()
  } catch (e) {
    return res.status(401).json({ error: '登录已过期，请重新登录' })
  }
}

// ===== AUTH API =====

// 注册
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' })
  }
  if (username.length < 2 || username.length > 20) {
    return res.status(400).json({ error: '用户名长度需 2-20 个字符' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少 6 位' })
  }
  // 检查用户名是否已存在
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existing) {
    return res.status(409).json({ error: '用户名已被注册' })
  }
  const hashed = bcrypt.hashSync(password, 10)
  const info = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashed)
  const token = jwt.sign({ userId: info.lastInsertRowid, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES })
  res.json({ token, user: { id: info.lastInsertRowid, username } })
})

// 登录
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' })
  }
  const row = db.prepare('SELECT id, username, password FROM users WHERE username = ?').get(username)
  if (!row) {
    return res.status(401).json({ error: '用户名或密码错误' })
  }
  if (!bcrypt.compareSync(password, row.password)) {
    return res.status(401).json({ error: '用户名或密码错误' })
  }
  const token = jwt.sign({ userId: row.id, username: row.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES })
  res.json({ token, user: { id: row.id, username: row.username } })
})

// 验证 token 有效性
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ id: req.userId, username: req.username })
})

// ===== BANKS =====

app.get('/api/banks', authMiddleware, (req, res) => {
  const stmt = db.prepare('SELECT * FROM banks WHERE userId = ? ORDER BY createdAt DESC')
  const rows = stmt.all(req.userId)
  const banks = rows.map(r => ({
    ...r,
    questions: JSON.parse(r.questions),
  }))
  res.json(banks)
})

app.post('/api/banks', authMiddleware, (req, res) => {
  const { name, subject, questions } = req.body
  const stmt = db.prepare('INSERT INTO banks (name, subject, questions, userId) VALUES (?, ?, ?, ?)')
  const result = stmt.run(name, subject || '', JSON.stringify(questions || []), req.userId)
  res.json({ id: result.lastInsertRowid, name, subject, questions, createdAt: new Date().toISOString() })
})

app.delete('/api/banks/:id', authMiddleware, (req, res) => {
  const stmt = db.prepare('DELETE FROM banks WHERE id = ? AND userId = ?')
  stmt.run(req.params.id, req.userId)
  res.json({ success: true })
})

app.put('/api/banks/:id', authMiddleware, (req, res) => {
  const { name, subject } = req.body
  const stmt = db.prepare('UPDATE banks SET name = ?, subject = ? WHERE id = ? AND userId = ?')
  stmt.run(name, subject || '', req.params.id, req.userId)
  res.json({ success: true })
})

// ===== HISTORY =====

app.get('/api/history', authMiddleware, (req, res) => {
  const stmt = db.prepare('SELECT * FROM history WHERE userId = ? ORDER BY date DESC')
  const rows = stmt.all(req.userId)
  const records = rows.map(r => ({
    ...r,
    answers: r.answers ? JSON.parse(r.answers) : {},
    wrongQuestionIds: r.wrongQuestionIds ? JSON.parse(r.wrongQuestionIds) : [],
    wrongQuestions: r.wrongQuestions ? JSON.parse(r.wrongQuestions) : [],
  }))
  res.json(records)
})

app.post('/api/history', authMiddleware, (req, res) => {
  const { bankId, bankName, mode, score, correctCount, wrongCount, totalQuestions, duration, answers, wrongQuestionIds, wrongQuestions } = req.body
  const stmt = db.prepare(`
    INSERT INTO history (bankId, bankName, mode, score, correctCount, wrongCount, totalQuestions, duration, answers, wrongQuestionIds, wrongQuestions, userId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(
    bankId, bankName, mode, score, correctCount, wrongCount, totalQuestions, duration,
    JSON.stringify(answers || {}),
    JSON.stringify(wrongQuestionIds || []),
    JSON.stringify(wrongQuestions || []),
    req.userId
  )
  res.json({ id: result.lastInsertRowid, ...req.body, date: new Date().toISOString() })
})

app.delete('/api/history/:id', authMiddleware, (req, res) => {
  const stmt = db.prepare('DELETE FROM history WHERE id = ? AND userId = ?')
  stmt.run(req.params.id, req.userId)
  res.json({ success: true })
})

app.delete('/api/history', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM history WHERE userId = ?').run(req.userId)
  res.json({ success: true })
})

// PUT /api/history/session — 退出时保存练习记录（每次新增一条，不覆盖）
app.put('/api/history/session', authMiddleware, (req, res) => {
  const { bankId, bankName, mode, score, correctCount, wrongCount, totalQuestions, duration, answers, wrongQuestionIds, wrongQuestions } = req.body
  if (!bankId) return res.status(400).json({ error: 'bankId is required' })
  const now = new Date().toISOString()

  const stmt = db.prepare(`
    INSERT INTO history (bankId, bankName, mode, score, correctCount, wrongCount, totalQuestions, duration, answers, wrongQuestionIds, wrongQuestions, date, userId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(
    bankId, bankName || '', mode || 'practice', score ?? 0, correctCount ?? 0, wrongCount ?? 0,
    totalQuestions ?? 0, duration ?? 0,
    JSON.stringify(answers || {}),
    JSON.stringify(wrongQuestionIds || []),
    JSON.stringify(wrongQuestions || []),
    now,
    req.userId
  )
  res.json({ id: result.lastInsertRowid, date: now })
})

// ===== FAVORITES =====

app.get('/api/favorites', authMiddleware, (req, res) => {
  const stmt = db.prepare('SELECT * FROM favorites WHERE userId = ? ORDER BY createdAt DESC')
  const rows = stmt.all(req.userId)
  const favorites = rows.map(r => ({
    ...r,
    questionData: JSON.parse(r.questionData),
  }))
  res.json(favorites)
})

app.post('/api/favorites', authMiddleware, (req, res) => {
  const { bankId, questionId, bankName, questionData } = req.body
  if (bankId === undefined || questionId === undefined) {
    return res.status(400).json({ error: 'bankId and questionId are required' })
  }
  const now = new Date().toISOString()
  const stmt = db.prepare(`
    INSERT INTO favorites (bankId, questionId, bankName, questionData, createdAt, userId)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(bankId, questionId, bankName || '', JSON.stringify(questionData || {}), now, req.userId)
  res.json({ id: result.lastInsertRowid, bankId, questionId, bankName, questionData, createdAt: now })
})

app.delete('/api/favorites/:bankId/:questionId', authMiddleware, (req, res) => {
  const { bankId, questionId } = req.params
  db.prepare('DELETE FROM favorites WHERE bankId = ? AND questionId = ? AND userId = ?')
    .run(bankId, questionId, req.userId)
  res.json({ success: true })
})

app.get('/api/favorites/:bankId/:questionId', authMiddleware, (req, res) => {
  const { bankId, questionId } = req.params
  const row = db.prepare(
    'SELECT id FROM favorites WHERE bankId = ? AND questionId = ? AND userId = ?'
  ).get(bankId, questionId, req.userId)
  if (!row) return res.json({ favorited: false, id: null })
  res.json({ favorited: true, id: row.id })
})

// ===== EXPORT / IMPORT =====

app.get('/api/export', authMiddleware, (req, res) => {
  const banks = db.prepare('SELECT * FROM banks WHERE userId = ?').all(req.userId).map(r => ({ ...r, questions: JSON.parse(r.questions) }))
  const history = db.prepare('SELECT * FROM history WHERE userId = ?').all(req.userId).map(r => ({
    ...r,
    answers: r.answers ? JSON.parse(r.answers) : {},
    wrongQuestionIds: r.wrongQuestionIds ? JSON.parse(r.wrongQuestionIds) : [],
    wrongQuestions: r.wrongQuestions ? JSON.parse(r.wrongQuestions) : [],
  }))
  const notes = db.prepare('SELECT * FROM notes WHERE userId = ?').all(req.userId)
  const aiConfigs = db.prepare('SELECT * FROM ai_configs WHERE userId = ?').all(req.userId)
  const favorites = db.prepare('SELECT * FROM favorites WHERE userId = ?').all(req.userId).map(r => ({ ...r, questionData: JSON.parse(r.questionData) }))
  res.json({ banks, history, notes, aiConfigs, favorites, exportedAt: new Date().toISOString() })
})

app.post('/api/import', authMiddleware, (req, res) => {
  const { banks, history, notes, aiConfigs, favorites } = req.body
  if (banks && Array.isArray(banks)) {
    db.prepare('DELETE FROM banks WHERE userId = ?').run(req.userId)
    const stmt = db.prepare('INSERT INTO banks (name, subject, questions, createdAt, userId) VALUES (?, ?, ?, ?, ?)')
    const bankIds = new Map()
    for (const b of banks) {
      const result = stmt.run(b.name, b.subject || '', JSON.stringify(b.questions || []), b.createdAt || new Date().toISOString(), req.userId)
      bankIds.set(String(b.id), Number(result.lastInsertRowid))
    }
    req.importedBankIds = bankIds
  }
  if (history && Array.isArray(history)) {
    db.prepare('DELETE FROM history WHERE userId = ?').run(req.userId)
    const stmt = db.prepare(`
      INSERT INTO history (bankId, bankName, mode, score, correctCount, wrongCount, totalQuestions, duration, answers, wrongQuestionIds, wrongQuestions, date, userId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const h of history) {
      stmt.run(
        req.importedBankIds?.get(String(h.bankId)) ?? h.bankId, h.bankName, h.mode, h.score, h.correctCount, h.wrongCount,
        h.totalQuestions, h.duration,
        JSON.stringify(h.answers || {}),
        JSON.stringify(h.wrongQuestionIds || []),
        JSON.stringify(h.wrongQuestions || []),
        h.date,
        req.userId
      )
    }
  }
  if (notes && Array.isArray(notes)) {
    db.prepare('DELETE FROM notes WHERE userId = ?').run(req.userId)
    const stmt = db.prepare('INSERT INTO notes (bankId, questionId, content, createdAt, updatedAt, userId) VALUES (?, ?, ?, ?, ?, ?)')
    for (const n of notes) {
      stmt.run(req.importedBankIds?.get(String(n.bankId)) ?? n.bankId, n.questionId, n.content, n.createdAt, n.updatedAt, req.userId)
    }
  }
  if (aiConfigs && Array.isArray(aiConfigs)) {
    db.prepare('DELETE FROM ai_configs WHERE userId = ?').run(req.userId)
    const stmt = db.prepare(`
      INSERT INTO ai_configs (name, baseUrl, apiKey, model, isDefault, createdAt, updatedAt, userId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const c of aiConfigs) {
      stmt.run(c.name, c.baseUrl || '', c.apiKey || '', c.model || '', c.isDefault || 0, c.createdAt || new Date().toISOString(), c.updatedAt || new Date().toISOString(), req.userId)
    }
  }
  if (favorites && Array.isArray(favorites)) {
    db.prepare('DELETE FROM favorites WHERE userId = ?').run(req.userId)
    const stmt = db.prepare(`
      INSERT INTO favorites (bankId, questionId, bankName, questionData, createdAt, userId)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    for (const f of favorites) {
      stmt.run(req.importedBankIds?.get(String(f.bankId)) ?? f.bankId, f.questionId, f.bankName || '', JSON.stringify(f.questionData || {}), f.createdAt || new Date().toISOString(), req.userId)
    }
  }
  res.json({ success: true })
})

// ===== QUESTION NOTES (per bankId + questionId) =====

// POST /api/notes/batch-delete
app.post('/api/notes/batch-delete', authMiddleware, (req, res) => {
  try {
    const deletedCount = deleteQuizNotesByIds(db, req.body?.ids, req.userId)
    res.json({ success: true, deletedCount })
  } catch (error) {
    if (error instanceof TypeError) {
      return res.status(400).json({ error: error.message })
    }
    console.error('批量删除练习笔记失败:', error)
    res.status(500).json({ error: '批量删除练习笔记失败' })
  }
})

// GET /api/notes?bankId=xxx
app.get('/api/notes', authMiddleware, (req, res) => {
  const bankId = req.query.bankId ? Number(req.query.bankId) : undefined
  let rows
  if (bankId !== undefined) {
    rows = db.prepare('SELECT * FROM notes WHERE bankId = ? AND userId = ? ORDER BY id ASC').all(bankId, req.userId)
  } else {
    rows = db.prepare('SELECT * FROM notes WHERE userId = ? ORDER BY id ASC').all(req.userId)
  }
  res.json(rows)
})

// GET /api/notes/quiz - 获取所有练习笔记，附带题库名和题目信息
app.get('/api/notes/quiz', authMiddleware, (req, res) => {
  const rows = db.prepare(`
    SELECT n.id, n.bankId, n.questionId, n.content, n.createdAt, n.updatedAt,
           b.name AS bankName, b.questions AS bankQuestions
    FROM notes n
    LEFT JOIN banks b ON n.bankId = b.id AND b.userId = n.userId
    WHERE n.bankId IS NOT NULL AND n.questionId IS NOT NULL AND n.userId = ?
    ORDER BY n.updatedAt DESC
  `).all(req.userId)
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
app.get('/api/notes/:bankId/:questionId', authMiddleware, (req, res, next) => {
  const bankId = Number(req.params.bankId)
  const questionId = Number(req.params.questionId)
  if (!Number.isSafeInteger(bankId) || !Number.isSafeInteger(questionId)) return next()
  console.log('[GET /api/notes] bankId=', bankId, 'questionId=', questionId, 'types:', typeof bankId, typeof questionId)
  const row = db.prepare(
    'SELECT * FROM notes WHERE bankId = ? AND questionId = ? AND userId = ?'
  ).get(bankId, questionId, req.userId)
  console.log('[GET /api/notes] row:', row ? { content: row.content?.substring(0, 50), contentHasNewline: row.content?.includes('\n') } : null)
  if (!row) return res.json(null)
  res.json(row)
})

// ===== NOTES TREE / CRUD (must be before static file serving) =====

// GET /api/notes/tree
app.get('/api/notes/tree', authMiddleware, (req, res) => {
  const stmt = db.prepare(`
    SELECT id, parent_id, title, type, content, sort_order, createdAt, updatedAt
    FROM note_tree
    WHERE userId = ?
    ORDER BY sort_order ASC, id ASC
  `)
  const rows = stmt.all(req.userId)
  res.json(rows)
})

// POST /api/notes — tree notes (parent_id, title, type, content)
app.post('/api/notes', authMiddleware, (req, res, next) => {
  const { parent_id, title, type, content } = req.body
  // If bankId is present, this is a quiz note — delegate to quiz notes handler
  if (req.body.bankId !== undefined || req.body.questionId !== undefined) {
    return next()
  }
  if (parent_id != null && !db.prepare('SELECT id FROM note_tree WHERE id = ? AND userId = ? AND type = ?').get(parent_id, req.userId, 'folder')) {
    return res.status(400).json({ error: '父文件夹不存在' })
  }
  const now = new Date().toISOString()
  const maxOrder = db.prepare(
    'SELECT MAX(sort_order) as m FROM note_tree WHERE parent_id IS ? AND userId = ?'
  ).get(parent_id ?? null, req.userId)
  const sort_order = (maxOrder?.m ?? -1) + 1
  const stmt = db.prepare(`
    INSERT INTO note_tree (parent_id, title, type, content, sort_order, createdAt, updatedAt, userId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(parent_id ?? null, title || '未命名', type || 'note', content || '', sort_order, now, now, req.userId)
  res.json({ id: result.lastInsertRowid, parent_id, title: title || '未命名', type: type || 'note', content: content || '', sort_order, createdAt: now, updatedAt: now })
})

// POST /api/notes  body: { bankId, questionId, content }
app.post('/api/notes', authMiddleware, (req, res) => {
  const bankId = Number(req.body.bankId)
  const questionId = Number(req.body.questionId)
  const { content } = req.body
  if (isNaN(bankId) || isNaN(questionId)) {
    return res.status(400).json({ error: 'bankId and questionId are required' })
  }
  const now = new Date().toISOString()
  console.log('[POST /api/notes] saving bankId=', bankId, 'questionId=', questionId, 'content length=', (content || '').length, 'has newline:', (content || '').includes('\n'))
  const stmt = db.prepare(`
    INSERT INTO notes (bankId, questionId, content, createdAt, updatedAt, userId)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(userId, bankId, questionId) DO UPDATE SET
      content = excluded.content,
      updatedAt = excluded.updatedAt
  `)
  stmt.run(bankId, questionId, content || '', now, now, req.userId)
  const row = db.prepare(
    'SELECT * FROM notes WHERE bankId = ? AND questionId = ? AND userId = ?'
  ).get(bankId, questionId, req.userId)
  console.log('[POST /api/notes] saved, row content has newline:', row?.content?.includes('\n'))
  res.json(row)
})

// DELETE /api/notes/:bankId/:questionId
app.delete('/api/notes/:bankId/:questionId', authMiddleware, (req, res) => {
  const bankId = Number(req.params.bankId)
  const questionId = Number(req.params.questionId)
  db.prepare('DELETE FROM notes WHERE bankId = ? AND questionId = ? AND userId = ?')
    .run(bankId, questionId, req.userId)
  res.json({ success: true })
})

// PUT /api/notes/:id
app.put('/api/notes/:id', authMiddleware, (req, res) => {
  const { parent_id, title, content, sort_order } = req.body
  if (parent_id != null && !db.prepare('SELECT id FROM note_tree WHERE id = ? AND userId = ? AND type = ?').get(parent_id, req.userId, 'folder')) {
    return res.status(400).json({ error: '父文件夹不存在' })
  }
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
  values.push(req.userId)
  db.prepare(`UPDATE note_tree SET ${fields.join(', ')} WHERE id = ? AND userId = ?`).run(...values)
  const row = db.prepare('SELECT * FROM note_tree WHERE id = ? AND userId = ?').get(req.params.id, req.userId)
  res.json(row)
})

// POST /api/notes/reorder — 批量更新同级排序
app.post('/api/notes/reorder', authMiddleware, (req, res) => {
  const { orders } = req.body
  if (!Array.isArray(orders)) return res.status(400).json({ error: 'orders must be an array' })
  const now = new Date().toISOString()
  const update = db.prepare('UPDATE note_tree SET sort_order = ?, updatedAt = ? WHERE id = ? AND userId = ?')
  for (const o of orders) {
    update.run(o.sort_order, now, o.id, req.userId)
  }
  res.json({ success: true })
})

// DELETE /api/notes/:id（级联删除子孙）
app.delete('/api/notes/:id', authMiddleware, (req, res) => {
  function collectIds(id) {
    const ids = [id]
    const children = db.prepare('SELECT id FROM note_tree WHERE parent_id = ? AND userId = ?').all(id, req.userId)
    for (const c of children) {
      ids.push(...collectIds(c.id))
    }
    return ids
  }
  const ids = collectIds(Number(req.params.id))
  const placeholders = ids.map(() => '?').join(',')
  db.prepare(`DELETE FROM note_tree WHERE id IN (${placeholders}) AND userId = ?`).run(...ids, req.userId)
  res.json({ success: true, deletedCount: ids.length })
})

// GET /api/notes/export/:id
app.get('/api/notes/export/:id', authMiddleware, (req, res) => {
  try {
    const note = db.prepare('SELECT * FROM note_tree WHERE id = ? AND userId = ?').get(Number(req.params.id), req.userId)
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
app.post('/api/notes/import', authMiddleware, (req, res) => {
  const filename = req.body?.filename || '未命名'
  const content = req.body?.content || ''
  const now = new Date().toISOString()
  const result = db.prepare(`
    INSERT INTO note_tree (parent_id, title, type, content, sort_order, createdAt, updatedAt, userId)
    VALUES (NULL, ?, 'note', ?, 0, ?, ?, ?)
  `).run(filename, content, now, now, req.userId)
  res.json({ id: result.lastInsertRowid, title: filename, type: 'note', content, createdAt: now })
})

// ===== AI CONFIGS =====

// GET /api/ai-configs — 获取所有厂商配置
app.get('/api/ai-configs', authMiddleware, (req, res) => {
  const stmt = db.prepare('SELECT * FROM ai_configs WHERE userId = ? ORDER BY id ASC')
  res.json(stmt.all(req.userId))
})

// GET /api/ai-configs/:name — 获取单个厂商配置
app.get('/api/ai-configs/:name', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM ai_configs WHERE name = ? AND userId = ?').get(req.params.name, req.userId)
  if (!row) return res.status(404).json({ error: '配置不存在' })
  res.json(row)
})

// GET /api/ai-configs/default — 获取默认配置
app.get('/api/ai-configs/default/active', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM ai_configs WHERE isDefault = 1 AND userId = ? LIMIT 1').get(req.userId)
  res.json(row || null)
})

// POST /api/ai-configs — 创建或更新厂商配置
app.post('/api/ai-configs', authMiddleware, (req, res) => {
  const { name, baseUrl, apiKey, model, isDefault } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  const now = new Date().toISOString()

  // 如果设置为默认，先清除其他厂商的默认标志
  if (isDefault) {
    db.prepare('UPDATE ai_configs SET isDefault = 0 WHERE userId = ?').run(req.userId)
  }

  const stmt = db.prepare(`
    INSERT INTO ai_configs (name, baseUrl, apiKey, model, isDefault, createdAt, updatedAt, userId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(userId, name) DO UPDATE SET
      baseUrl = excluded.baseUrl,
      apiKey = excluded.apiKey,
      model = excluded.model,
      isDefault = excluded.isDefault,
      updatedAt = excluded.updatedAt
  `)
  stmt.run(name, baseUrl || '', apiKey || '', model || '', isDefault ? 1 : 0, now, now, req.userId)
  const row = db.prepare('SELECT * FROM ai_configs WHERE name = ? AND userId = ?').get(name, req.userId)
  res.json(row)
})

// PUT /api/ai-configs/:name — 更新厂商配置
app.put('/api/ai-configs/:name', authMiddleware, (req, res) => {
  const { baseUrl, apiKey, model, isDefault } = req.body
  const now = new Date().toISOString()

  if (isDefault) {
    db.prepare('UPDATE ai_configs SET isDefault = 0 WHERE userId = ?').run(req.userId)
  }

  const fields = []
  const values = []
  if (baseUrl !== undefined) { fields.push('baseUrl = ?'); values.push(baseUrl) }
  if (apiKey !== undefined) { fields.push('apiKey = ?'); values.push(apiKey) }
  if (model !== undefined) { fields.push('model = ?'); values.push(model) }
  if (isDefault !== undefined) { fields.push('isDefault = ?'); values.push(isDefault ? 1 : 0) }
  fields.push('updatedAt = ?')
  values.push(now)
  values.push(req.params.name, req.userId)

  db.prepare(`UPDATE ai_configs SET ${fields.join(', ')} WHERE name = ? AND userId = ?`).run(...values)
  const row = db.prepare('SELECT * FROM ai_configs WHERE name = ? AND userId = ?').get(req.params.name, req.userId)
  if (!row) return res.status(404).json({ error: '配置不存在' })
  res.json(row)
})

// DELETE /api/ai-configs/:name — 删除厂商配置
app.delete('/api/ai-configs/:name', authMiddleware, (req, res) => {
  const stmt = db.prepare('DELETE FROM ai_configs WHERE name = ? AND userId = ?')
  stmt.run(req.params.name, req.userId)
  res.json({ success: true })
})

// ===== QUIZ SESSIONS =====

// GET /api/sessions/with-bank-info - list sessions with bank names (for home recent practice)
app.get('/api/sessions/with-bank-info', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM quiz_sessions WHERE userId = ? ORDER BY updated_at DESC LIMIT 5').all(req.userId)
  const result = []
  for (const row of rows) {
    const bank = db.prepare('SELECT id, name, subject FROM banks WHERE id = ? AND userId = ?').get(row.bank_id, req.userId)
    if (bank) {
      const totalQuestions = row.question_order ? JSON.parse(row.question_order).length : 0
      const answeredCount = row.answers ? Object.keys(JSON.parse(row.answers)).length : 0
      result.push({
        bankId: row.bank_id,
        bankName: bank.name,
        subject: bank.subject,
        questionOrder: row.question_order ? JSON.parse(row.question_order) : [],
        answers: row.answers ? JSON.parse(row.answers) : {},
        currentIndex: row.current_index,
        mode: row.mode,
        shuffled: !!row.shuffled,
        startTime: row.start_time,
        wrongIds: row.wrong_ids ? JSON.parse(row.wrong_ids) : [],
        updatedAt: row.updated_at,
        totalQuestions,
        answeredCount,
        progressPercent: totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0,
      })
    }
  }
  res.json(result)
})

// GET /api/sessions - list all in-progress sessions
app.get('/api/sessions', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM quiz_sessions WHERE userId = ? ORDER BY updated_at DESC').all(req.userId)
  res.json(rows.map(row => ({
    bankId: row.bank_id,
    questionOrder: row.question_order ? JSON.parse(row.question_order) : [],
    answers: row.answers ? JSON.parse(row.answers) : {},
    currentIndex: row.current_index,
    mode: row.mode,
    shuffled: !!row.shuffled,
    startTime: row.start_time,
    wrongIds: row.wrong_ids ? JSON.parse(row.wrong_ids) : [],
    updatedAt: row.updated_at,
  })))
})

// GET /api/sessions/:bankId - get in-progress session for a bank
app.get('/api/sessions/:bankId', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM quiz_sessions WHERE bank_id = ? AND userId = ?').get(req.params.bankId, req.userId)
  if (!row) return res.json(null)
  res.json({
    bankId: row.bank_id,
    questionOrder: row.question_order ? JSON.parse(row.question_order) : [],
    answers: row.answers ? JSON.parse(row.answers) : {},
    currentIndex: row.current_index,
    mode: row.mode,
    shuffled: !!row.shuffled,
    startTime: row.start_time,
    wrongIds: row.wrong_ids ? JSON.parse(row.wrong_ids) : [],
    updatedAt: row.updated_at,
  })
})

// PUT /api/sessions - upsert session
app.put('/api/sessions', authMiddleware, (req, res) => {
  const { bankId, questionOrder, answers, currentIndex, mode, shuffled, startTime, wrongIds } = req.body
  if (!bankId) return res.status(400).json({ error: 'bankId is required' })
  const now = new Date().toISOString()
  const stmt = db.prepare(`
    INSERT INTO quiz_sessions (bank_id, question_order, answers, current_index, mode, shuffled, start_time, wrong_ids, updated_at, userId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(userId, bank_id) DO UPDATE SET
      question_order = excluded.question_order,
      answers = excluded.answers,
      current_index = excluded.current_index,
      mode = excluded.mode,
      shuffled = excluded.shuffled,
      start_time = excluded.start_time,
      wrong_ids = excluded.wrong_ids,
      updated_at = excluded.updated_at
  `)
  stmt.run(
    String(bankId),
    JSON.stringify(questionOrder || []),
    JSON.stringify(answers || {}),
    currentIndex ?? 0,
    mode || 'practice',
    shuffled ? 1 : 0,
    startTime || Date.now(),
    JSON.stringify(wrongIds || []),
    now,
    req.userId
  )
  res.json({ success: true, updatedAt: now })
})

// DELETE /api/sessions/:bankId - delete session (on quiz finish or start fresh)
app.delete('/api/sessions/:bankId', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM quiz_sessions WHERE bank_id = ? AND userId = ?').run(req.params.bankId, req.userId)
  res.json({ success: true })
})

// ===== RESOURCES (HTML files managed by user) =====
// 资源目录固定为项目根的 public/resources/，dev 时由 vite 静态服务，
// prod 时由下方 mount 的 express.static 服务。上传 / 删除 / 列表都操作此目录。
const resourcesDir = path.join(__dirname, '..', 'public', 'resources')
if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir, { recursive: true })
}

// Shared HTML may contain scripts. Keep it interactive but give it an opaque origin.
app.use('/resources', express.static(resourcesDir, {
  fallthrough: true,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Content-Security-Policy', 'sandbox allow-scripts allow-forms allow-popups')
  },
}))

// 列出所有 .html 资源
app.get('/api/resources', authMiddleware, (req, res) => {
  try {
    const entries = fs.readdirSync(resourcesDir)
    const files = entries
      .filter(f => f.toLowerCase().endsWith('.html'))
      .map(f => {
        const stat = fs.statSync(path.join(resourcesDir, f))
        // 解析 HTML <title> 标签作为中文标题
        let title = ''
        try {
          const content = fs.readFileSync(path.join(resourcesDir, f), 'utf8')
          const m = content.match(/<title[^>]*>([^<]+)<\/title>/i)
          if (m && m[1]) title = m[1].trim()
        } catch { /* ignore */ }
        return {
          file: f,
          name: f.replace(/\.html$/i, ''),
          title: title || f.replace(/\.html$/i, ''),
          size: stat.size,
          mtime: stat.mtime.toISOString(),
        }
      })
      .sort((a, b) => b.mtime.localeCompare(a.mtime))
    res.json({ files })
  } catch (e) {
    res.status(500).json({ error: 'Failed to list resources', detail: String(e) })
  }
})

// 上传 HTML 资源
app.post('/api/resources', authMiddleware, (req, res) => {
  try {
    const { filename, content } = req.body
    if (!filename || !content) {
      return res.status(400).json({ error: 'filename and content are required' })
    }
    // 安全过滤：只允许 a-z 0-9 - _ . 字符，必须 .html 结尾，无路径分隔符
    const safeName = String(filename).replace(/[^a-zA-Z0-9_\-.]/g, '_')
    if (!safeName.toLowerCase().endsWith('.html')) {
      return res.status(400).json({ error: 'Filename must end with .html' })
    }
    if (safeName.includes('/') || safeName.includes('\\') || safeName === '.' || safeName === '..') {
      return res.status(400).json({ error: 'Invalid filename' })
    }
    // 大小限制 10MB
    if (content.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large (max 10MB)' })
    }
    const filePath = path.join(resourcesDir, safeName)
    fs.writeFileSync(filePath, content, 'utf8')
    const stat = fs.statSync(filePath)
    // 解析 <title> 作为中文标题
    let title = ''
    const m = content.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (m && m[1]) title = m[1].trim()
    res.json({
      file: safeName,
      name: safeName.replace(/\.html$/i, ''),
      title: title || safeName.replace(/\.html$/i, ''),
      size: stat.size,
      mtime: stat.mtime.toISOString(),
    })
  } catch (e) {
    res.status(500).json({ error: 'Failed to upload resource', detail: String(e) })
  }
})

// 删除（硬删除）HTML 资源
app.delete('/api/resources/:filename', authMiddleware, (req, res) => {
  try {
    const safeName = path.basename(req.params.filename)
    if (!safeName.toLowerCase().endsWith('.html')) {
      return res.status(400).json({ error: 'Filename must end with .html' })
    }
    const filePath = path.join(resourcesDir, safeName)
    // 防止路径穿越
    if (!filePath.startsWith(resourcesDir)) {
      return res.status(400).json({ error: 'Invalid filename' })
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' })
    }
    fs.unlinkSync(filePath)
    res.json({ ok: true, file: safeName })
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete resource', detail: String(e) })
  }
})

// Serve frontend build after all API routes.
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
