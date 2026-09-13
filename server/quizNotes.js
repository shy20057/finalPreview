export function deleteQuizNotesByIds(db, ids, userId) {
  if (!Array.isArray(ids) || ids.length === 0 || ids.some(id => !Number.isInteger(id) || id <= 0)) {
    throw new TypeError('note ids must be a non-empty array of positive integers')
  }

  const uniqueIds = [...new Set(ids)]
  const placeholders = uniqueIds.map(() => '?').join(',')

  db.exec('BEGIN IMMEDIATE')
  try {
    const result = userId === undefined
      ? db.prepare(`DELETE FROM notes WHERE id IN (${placeholders})`).run(...uniqueIds)
      : db.prepare(`DELETE FROM notes WHERE id IN (${placeholders}) AND userId = ?`).run(...uniqueIds, userId)
    db.exec('COMMIT')
    return Number(result.changes)
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
