// Additive, backward-compatible fields for mobile retry safety and exam restoration.
// Called after account ownership migrations, before handling any request.
export function migrateMobileCompatibility(db) {
  const addMissing = (table, definitions) => {
    const columns = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name))
    for (const [name, definition] of definitions) {
      if (!columns.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`)
    }
  }
  db.exec('BEGIN IMMEDIATE')
  try {
    addMissing('history', [['submissionId', 'TEXT'], ['questionSnapshot', 'TEXT']])
    addMissing('quiz_sessions', [['submitted_ids', 'TEXT'], ['submission_id', 'TEXT']])
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS history_submission_owner ON history(userId, submissionId) WHERE submissionId IS NOT NULL')
    db.exec('COMMIT')
  } catch (error) { db.exec('ROLLBACK'); throw error }
}

export function decodeHistory(row) {
  const { questionSnapshot, ...record } = row
  return {
    ...record,
    answers: typeof row.answers === 'string' ? JSON.parse(row.answers || '{}') : row.answers || {},
    wrongQuestionIds: typeof row.wrongQuestionIds === 'string' ? JSON.parse(row.wrongQuestionIds || '[]') : row.wrongQuestionIds || [],
    wrongQuestions: typeof row.wrongQuestions === 'string' ? JSON.parse(row.wrongQuestions || '[]') : row.wrongQuestions || [],
    questions: questionSnapshot ? JSON.parse(questionSnapshot) : null,
  }
}

export function saveHistoryRecord(db, userId, data) {
  const submissionId = typeof data.submissionId === 'string' && data.submissionId.length <= 160 ? data.submissionId.trim() || null : null
  if (submissionId) {
    const existing = db.prepare('SELECT * FROM history WHERE userId = ? AND submissionId = ?').get(userId, submissionId)
    if (existing) return decodeHistory(existing)
  }
  const result = db.prepare(`
    INSERT INTO history (bankId, bankName, mode, score, correctCount, wrongCount, totalQuestions, duration, answers, wrongQuestionIds, wrongQuestions, userId, date, submissionId, questionSnapshot)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.bankId ?? null, data.bankName || '', data.mode || 'practice', data.score ?? 0,
    data.correctCount ?? 0, data.wrongCount ?? 0, data.totalQuestions ?? 0, data.duration ?? 0,
    JSON.stringify(data.answers || {}), JSON.stringify(data.wrongQuestionIds || []), JSON.stringify(data.wrongQuestions || []),
    userId, new Date().toISOString(), submissionId, Array.isArray(data.questions) ? JSON.stringify(data.questions) : null,
  )
  return decodeHistory(db.prepare('SELECT * FROM history WHERE id = ? AND userId = ?').get(result.lastInsertRowid, userId))
}
