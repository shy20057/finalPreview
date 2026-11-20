"""SQLite access layer.

Uses the stdlib ``sqlite3`` driver directly (no ORM) and points at the same
``server/data/quiz.db`` file the previous Express backend used, so existing
accounts, banks, history and notes survive the migration untouched.
"""

from __future__ import annotations

import json
import os
import pathlib
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator

SERVER_DIR = pathlib.Path(__file__).resolve().parent.parent
DATA_DIR = pathlib.Path(os.environ.get("QUIZ_DATA_DIR") or SERVER_DIR / "data")
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = os.environ.get("QUIZ_DB_PATH") or str(DATA_DIR / "quiz.db")

# One shared connection: SQLite serialises writes internally and WAL lets
# readers run while a write is in flight.
conn = sqlite3.connect(DB_PATH, check_same_thread=False, isolation_level=None)
conn.row_factory = sqlite3.Row
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA busy_timeout=5000")
conn.execute("PRAGMA foreign_keys=ON")


def now_iso() -> str:
    """ISO-8601 UTC timestamp, byte-identical in shape to JS ``toISOString()``."""
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


@contextmanager
def tx() -> Iterator[sqlite3.Connection]:
    """Explicit transaction (the connection is in autocommit mode)."""
    conn.execute("BEGIN IMMEDIATE")
    try:
        yield conn
    except Exception:
        conn.execute("ROLLBACK")
        raise
    conn.execute("COMMIT")


def rows(sql: str, params: Any = ()) -> list[dict]:
    return [dict(r) for r in conn.execute(sql, params).fetchall()]


def row(sql: str, params: Any = ()) -> dict | None:
    found = conn.execute(sql, params).fetchone()
    return dict(found) if found else None


def run(sql: str, params: Any = ()) -> int:
    """Execute a write and return ``lastrowid``."""
    return int(conn.execute(sql, params).lastrowid)


def dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def loads(value: Any, fallback: Any) -> Any:
    if value is None:
        return fallback
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return fallback


def use_database(path: str) -> None:
    """Point the module at a different database file (used by the tests)."""
    global conn, DB_PATH
    conn.close()
    DB_PATH = path
    conn = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA foreign_keys=ON")


# --------------------------------------------------------------------------
# Schema
# --------------------------------------------------------------------------

SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS banks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT,
      questions TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      userId INTEGER
    )
    """,
    """
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
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      userId INTEGER,
      submissionId TEXT,
      questionSnapshot TEXT
    )
    """,
    """
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
      userId INTEGER,
      UNIQUE(userId, bankId, questionId)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS note_tree (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      title TEXT NOT NULL DEFAULT '未命名',
      type TEXT DEFAULT 'note',
      content TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      userId INTEGER
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS ai_configs (
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
    """,
    """
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bankId INTEGER NOT NULL,
      questionId INTEGER NOT NULL,
      bankName TEXT,
      questionData TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      userId INTEGER,
      UNIQUE(userId, bankId, questionId)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS quiz_sessions (
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
      submitted_ids TEXT,
      submission_id TEXT,
      UNIQUE(userId, bank_id)
    )
    """,
    "CREATE UNIQUE INDEX IF NOT EXISTS history_submission_owner ON history(userId, submissionId) WHERE submissionId IS NOT NULL",
]


def _columns(table: str) -> set[str]:
    return {r["name"] for r in conn.execute(f"PRAGMA table_info({table})")}


def _migrate_legacy() -> None:
    """Port of ``server/userIsolation.js``.

    Databases created before per-account ownership used global UNIQUE
    constraints; rebuild those tables so each account has its own namespace.
    Legacy rows are preserved but never served to a user.
    """
    if conn.execute("PRAGMA user_version").fetchone()[0] >= 1:
        return
    if "userId" in _columns("notes"):
        # Already the modern shape (this app created it) — nothing to rebuild.
        conn.execute("PRAGMA user_version = 1")
        return

    conn.execute("BEGIN IMMEDIATE")
    try:
        for table in ("banks", "history", "notes", "note_tree", "favorites", "quiz_sessions"):
            if "userId" not in _columns(table):
                conn.execute(f"ALTER TABLE {table} ADD COLUMN userId INTEGER")

        note_columns = _columns("notes")
        for name, definition in (
            ("parent_id", "INTEGER"),
            ("title", "TEXT NOT NULL DEFAULT '未命名'"),
            ("type", "TEXT DEFAULT 'note'"),
            ("sort_order", "INTEGER DEFAULT 0"),
        ):
            if name not in note_columns:
                conn.execute(f"ALTER TABLE notes ADD COLUMN {name} {definition}")

        users = conn.execute("SELECT id FROM users").fetchall()
        owner = users[0]["id"] if len(users) == 1 else None
        if owner is not None:
            for table in ("banks", "history", "notes", "note_tree", "favorites", "quiz_sessions"):
                conn.execute(f"UPDATE {table} SET userId = ? WHERE userId IS NULL", (owner,))

        ai_has_owner = "userId" in _columns("ai_configs")
        ai_owner = owner if not ai_has_owner else "userId"

        conn.execute(
            """CREATE TABLE notes_isolated (
                 id INTEGER PRIMARY KEY AUTOINCREMENT, bankId INTEGER, questionId INTEGER,
                 parent_id INTEGER, title TEXT NOT NULL DEFAULT '未命名', content TEXT DEFAULT '',
                 type TEXT DEFAULT 'note', sort_order INTEGER DEFAULT 0,
                 createdAt TEXT DEFAULT CURRENT_TIMESTAMP, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
                 userId INTEGER, UNIQUE(userId, bankId, questionId))"""
        )
        conn.execute(
            """INSERT INTO notes_isolated SELECT id, bankId, questionId, parent_id, title, content,
                 type, sort_order, createdAt, updatedAt, userId FROM notes"""
        )
        conn.execute("DROP TABLE notes")
        conn.execute("ALTER TABLE notes_isolated RENAME TO notes")

        conn.execute(
            """CREATE TABLE favorites_isolated (
                 id INTEGER PRIMARY KEY AUTOINCREMENT, bankId INTEGER NOT NULL, questionId INTEGER NOT NULL,
                 bankName TEXT, questionData TEXT NOT NULL, createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                 userId INTEGER, UNIQUE(userId, bankId, questionId))"""
        )
        conn.execute(
            """INSERT INTO favorites_isolated SELECT id, bankId, questionId, bankName, questionData,
                 createdAt, userId FROM favorites"""
        )
        conn.execute("DROP TABLE favorites")
        conn.execute("ALTER TABLE favorites_isolated RENAME TO favorites")

        conn.execute(
            """CREATE TABLE quiz_sessions_isolated (
                 bank_id TEXT NOT NULL, question_order TEXT, answers TEXT, current_index INTEGER DEFAULT 0,
                 mode TEXT DEFAULT 'practice', shuffled INTEGER DEFAULT 0, start_time INTEGER, wrong_ids TEXT,
                 updated_at TEXT DEFAULT CURRENT_TIMESTAMP, userId INTEGER, UNIQUE(userId, bank_id))"""
        )
        conn.execute(
            """INSERT INTO quiz_sessions_isolated SELECT bank_id, question_order, answers, current_index, mode,
                 shuffled, start_time, wrong_ids, updated_at, userId FROM quiz_sessions"""
        )
        conn.execute("DROP TABLE quiz_sessions")
        conn.execute("ALTER TABLE quiz_sessions_isolated RENAME TO quiz_sessions")

        conn.execute(
            """CREATE TABLE ai_configs_isolated (
                 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, baseUrl TEXT NOT NULL DEFAULT '',
                 apiKey TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '', isDefault INTEGER NOT NULL DEFAULT 0,
                 createdAt TEXT DEFAULT CURRENT_TIMESTAMP, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
                 userId INTEGER, UNIQUE(userId, name))"""
        )
        conn.execute(
            f"""INSERT INTO ai_configs_isolated SELECT id, name, baseUrl, apiKey, model, isDefault,
                 createdAt, updatedAt, {ai_owner} FROM ai_configs"""
        )
        conn.execute("DROP TABLE ai_configs")
        conn.execute("ALTER TABLE ai_configs_isolated RENAME TO ai_configs")

        conn.execute("PRAGMA user_version = 1")
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise


def _migrate_mobile_compat() -> None:
    """Port of ``server/mobileCompatibility.js`` — idempotent column additions."""
    additions = {
        "history": [("submissionId", "TEXT"), ("questionSnapshot", "TEXT")],
        "quiz_sessions": [("submitted_ids", "TEXT"), ("submission_id", "TEXT")],
    }
    conn.execute("BEGIN IMMEDIATE")
    try:
        for table, columns in additions.items():
            existing = _columns(table)
            for name, definition in columns:
                if name not in existing:
                    conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")
        conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS history_submission_owner "
            "ON history(userId, submissionId) WHERE submissionId IS NOT NULL"
        )
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise


def init() -> None:
    for statement in SCHEMA:
        conn.execute(statement)
    _migrate_legacy()
    _migrate_mobile_compat()


# --------------------------------------------------------------------------
# History helpers (port of server/mobileCompatibility.js)
# --------------------------------------------------------------------------


def decode_history(record: dict) -> dict:
    snapshot = record.pop("questionSnapshot", None)
    return {
        **record,
        "answers": loads(record.get("answers"), {}),
        "wrongQuestionIds": loads(record.get("wrongQuestionIds"), []),
        "wrongQuestions": loads(record.get("wrongQuestions"), []),
        "questions": loads(snapshot, None) if snapshot else None,
    }


def save_history_record(user_id: int, data: dict) -> dict:
    submission_id = data.get("submissionId")
    if isinstance(submission_id, str) and len(submission_id) <= 160:
        submission_id = submission_id.strip() or None
    else:
        submission_id = None

    if submission_id:
        existing = row("SELECT * FROM history WHERE userId = ? AND submissionId = ?", (user_id, submission_id))
        if existing:
            return decode_history(existing)

    new_id = run(
        """INSERT INTO history (bankId, bankName, mode, score, correctCount, wrongCount, totalQuestions,
             duration, answers, wrongQuestionIds, wrongQuestions, userId, date, submissionId, questionSnapshot)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            data.get("bankId"),
            data.get("bankName") or "",
            data.get("mode") or "practice",
            data.get("score") or 0,
            data.get("correctCount") or 0,
            data.get("wrongCount") or 0,
            data.get("totalQuestions") or 0,
            data.get("duration") or 0,
            dumps(data.get("answers") or {}),
            dumps(data.get("wrongQuestionIds") or []),
            dumps(data.get("wrongQuestions") or []),
            user_id,
            now_iso(),
            submission_id,
            dumps(data["questions"]) if isinstance(data.get("questions"), list) else None,
        ),
    )
    return decode_history(row("SELECT * FROM history WHERE id = ? AND userId = ?", (new_id, user_id)) or {})


def delete_quiz_notes_by_ids(ids: Any, user_id: int) -> int:
    if not isinstance(ids, list) or not ids or any(not isinstance(i, int) or i <= 0 for i in ids):
        raise TypeError("note ids must be a non-empty array of positive integers")
    unique = list(dict.fromkeys(ids))
    placeholders = ",".join("?" * len(unique))
    with tx() as c:
        result = c.execute(
            f"DELETE FROM notes WHERE id IN ({placeholders}) AND userId = ?", (*unique, user_id)
        )
        return result.rowcount
