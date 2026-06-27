import Dexie from 'dexie'

class QuizDatabase extends Dexie {
  constructor() {
    super('QuizDatabase')
    this.version(2).stores({
      banks: '++id, name, createdAt',
      history: '++id, bankId, date',
      notes: '++id, [bankId+questionId], bankId, questionId, updatedAt',
    })
    this.banks = this.table('banks')
    this.history = this.table('history')
    this.notes = this.table('notes')
  }
}

const db = new QuizDatabase()

let migrated = false

async function migrateFromLocalStorage() {
  if (migrated) return
  migrated = true

  const bankData = localStorage.getItem('quiz_banks')
  const historyData = localStorage.getItem('quiz_history')

  if (bankData) {
    try {
      const banks = JSON.parse(bankData)
      if (Array.isArray(banks) && banks.length > 0) {
        const existing = await db.banks.count()
        if (existing === 0) {
          await db.banks.bulkAdd(banks)
        }
      }
    } catch {
      // ignore
    }
  }

  if (historyData) {
    try {
      const records = JSON.parse(historyData)
      if (Array.isArray(records) && records.length > 0) {
        const existing = await db.history.count()
        if (existing === 0) {
          await db.history.bulkAdd(records)
        }
      }
    } catch {
      // ignore
    }
  }
}

// Ensure migration runs before any DB access
const migrationPromise = migrateFromLocalStorage()

export async function loadBanks() {
  await migrationPromise
  return db.banks.toArray()
}

export async function saveBanks(banks) {
  await migrationPromise
  await db.banks.clear()
  if (banks.length > 0) {
    await db.banks.bulkAdd(banks)
  }
}

export async function addBank(bank) {
  await migrationPromise
  const newBank = {
    ...bank,
    createdAt: new Date().toISOString(),
  }
  const id = await db.banks.add(newBank)
  return { ...newBank, id }
}

export async function deleteBank(bankId) {
  await migrationPromise
  await db.banks.delete(bankId)
  return loadBanks()
}

export async function getBank(bankId) {
  await migrationPromise
  return db.banks.get(bankId) || null
}

export async function bankExists(name) {
  await migrationPromise
  const count = await db.banks.where('name').equals(name).count()
  return count > 0
}

export async function loadHistory() {
  await migrationPromise
  return db.history.toArray()
}

export async function saveHistory(records) {
  await migrationPromise
  await db.history.clear()
  if (records.length > 0) {
    await db.history.bulkAdd(records)
  }
}

export async function addHistoryRecord(record) {
  await migrationPromise
  const id = await db.history.add(record)
  return { ...record, id }
}

export async function deleteHistoryRecord(recordId) {
  await migrationPromise
  await db.history.delete(recordId)
  return loadHistory()
}

export async function clearHistory() {
  await migrationPromise
  await db.history.clear()
}

// Notes
export async function getNote(bankId, questionId) {
  await migrationPromise
  const note = await db.notes.where({ bankId, questionId }).first()
  return note || null
}

export async function saveNote(bankId, questionId, content) {
  await migrationPromise
  const existing = await db.notes.where({ bankId, questionId }).first()
  const now = new Date().toISOString()
  if (existing) {
    await db.notes.update(existing.id, { content, updatedAt: now })
    return { ...existing, content, updatedAt: now }
  } else {
    const id = await db.notes.add({ bankId, questionId, content, createdAt: now, updatedAt: now })
    return { id, bankId, questionId, content, createdAt: now, updatedAt: now }
  }
}

export async function deleteNote(bankId, questionId) {
  await migrationPromise
  const existing = await db.notes.where({ bankId, questionId }).first()
  if (existing) {
    await db.notes.delete(existing.id)
  }
}

export async function loadNotesByBank(bankId) {
  await migrationPromise
  return db.notes.where('bankId').equals(bankId).toArray()
}

export async function exportAll() {
  await migrationPromise
  const banks = await db.banks.toArray()
  const history = await db.history.toArray()
  const notes = await db.notes.toArray()
  return { banks, history, notes, exportedAt: new Date().toISOString() }
}

export async function importAll(data) {
  await migrationPromise
  if (data.banks && Array.isArray(data.banks)) {
    await db.banks.clear()
    if (data.banks.length > 0) {
      await db.banks.bulkAdd(data.banks)
    }
  }
  if (data.history && Array.isArray(data.history)) {
    await db.history.clear()
    if (data.history.length > 0) {
      await db.history.bulkAdd(data.history)
    }
  }
  if (data.notes && Array.isArray(data.notes)) {
    await db.notes.clear()
    if (data.notes.length > 0) {
      await db.notes.bulkAdd(data.notes)
    }
  }
}
