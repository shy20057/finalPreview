// Rebuild legacy global uniqueness constraints as account-scoped constraints.
// Existing rows with an unknown owner are preserved, but never served to users.
export function migrateUserIsolation(db) {
  if (db.prepare('PRAGMA user_version').get().user_version >= 1) return

  db.exec('BEGIN IMMEDIATE')
  try {
    for (const table of ['banks', 'history', 'notes', 'note_tree', 'favorites', 'quiz_sessions']) {
      const columns = db.prepare(`PRAGMA table_info(${table})`).all()
      if (!columns.some(column => column.name === 'userId')) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN userId INTEGER`)
      }
    }
    const noteColumns = new Set(db.prepare('PRAGMA table_info(notes)').all().map(column => column.name))
    for (const [name, definition] of [
      ['parent_id', 'INTEGER'],
      ['title', "TEXT NOT NULL DEFAULT '未命名'"],
      ['type', "TEXT DEFAULT 'note'"],
      ['sort_order', 'INTEGER DEFAULT 0'],
    ]) {
      if (!noteColumns.has(name)) db.exec(`ALTER TABLE notes ADD COLUMN ${name} ${definition}`)
    }

    const users = db.prepare('SELECT id FROM users').all()
    if (users.length === 1) {
      for (const table of ['banks', 'history', 'notes', 'note_tree', 'favorites', 'quiz_sessions']) {
        db.prepare(`UPDATE ${table} SET userId = ? WHERE userId IS NULL`).run(users[0].id)
      }
    }

    db.exec(`
      CREATE TABLE notes_isolated (
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
        userId INTEGER,
        UNIQUE(userId, bankId, questionId)
      );
      INSERT INTO notes_isolated (id, bankId, questionId, parent_id, title, content, type, sort_order, createdAt, updatedAt, userId)
      SELECT id, bankId, questionId, parent_id, title, content, type, sort_order, createdAt, updatedAt, userId FROM notes;
      DROP TABLE notes;
      ALTER TABLE notes_isolated RENAME TO notes;

      CREATE TABLE favorites_isolated (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bankId INTEGER NOT NULL,
        questionId INTEGER NOT NULL,
        bankName TEXT,
        questionData TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        userId INTEGER,
        UNIQUE(userId, bankId, questionId)
      );
      INSERT INTO favorites_isolated (id, bankId, questionId, bankName, questionData, createdAt, userId)
      SELECT id, bankId, questionId, bankName, questionData, createdAt, userId FROM favorites;
      DROP TABLE favorites;
      ALTER TABLE favorites_isolated RENAME TO favorites;

      CREATE TABLE quiz_sessions_isolated (
        bank_id TEXT NOT NULL,
        question_order TEXT,
        answers TEXT,
        current_index INTEGER DEFAULT 0,
        mode TEXT DEFAULT 'practice',
        shuffled INTEGER DEFAULT 0,
        start_time INTEGER,
        wrong_ids TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        userId INTEGER,
        UNIQUE(userId, bank_id)
      );
      INSERT INTO quiz_sessions_isolated (bank_id, question_order, answers, current_index, mode, shuffled, start_time, wrong_ids, updated_at, userId)
      SELECT bank_id, question_order, answers, current_index, mode, shuffled, start_time, wrong_ids, updated_at, userId FROM quiz_sessions;
      DROP TABLE quiz_sessions;
      ALTER TABLE quiz_sessions_isolated RENAME TO quiz_sessions;
    `)

    const aiHasOwner = db.prepare('PRAGMA table_info(ai_configs)').all().some(column => column.name === 'userId')
    db.exec(`
      CREATE TABLE ai_configs_isolated (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        baseUrl TEXT NOT NULL DEFAULT '',
        apiKey TEXT NOT NULL DEFAULT '',
        model TEXT NOT NULL DEFAULT '',
        isDefault INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        userId INTEGER,
        UNIQUE(userId, name)
      )
    `)
    db.exec(`
      INSERT INTO ai_configs_isolated (id, name, baseUrl, apiKey, model, isDefault, createdAt, updatedAt, userId)
      SELECT id, name, baseUrl, apiKey, model, isDefault, createdAt, updatedAt,
             ${aiHasOwner ? 'userId' : users.length === 1 ? users[0].id : 'NULL'}
      FROM ai_configs;
      DROP TABLE ai_configs;
      ALTER TABLE ai_configs_isolated RENAME TO ai_configs;
    `)

    db.exec('PRAGMA user_version = 1')
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
