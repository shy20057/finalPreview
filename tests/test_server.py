"""Server tests for the FastAPI backend.

Python port of the three test files that used to exercise the Express server
(``mobileCompatibility``, ``quiz-notes-batch`` and ``user-isolation``).

Run with:  python -m unittest discover -s tests -p "test_*.py"
"""

import os
import pathlib
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "server"))

_TMP = pathlib.Path(tempfile.mkdtemp(prefix="quiz-server-test-"))
os.environ["QUIZ_DB_PATH"] = str(_TMP / "quiz.db")
os.environ["QUIZ_CHECKPOINT_PATH"] = str(_TMP / "checkpoints.db")
os.environ["JWT_SECRET"] = "test-only-secret"

from fastapi.testclient import TestClient  # noqa: E402
from langchain_core.language_models.chat_models import BaseChatModel  # noqa: E402
from langchain_core.messages import AIMessage  # noqa: E402
from langchain_core.outputs import ChatGeneration, ChatResult  # noqa: E402

from app import agent as agent_module  # noqa: E402
from app import db  # noqa: E402
from app.main import app  # noqa: E402

LEGACY_SCHEMA = """
CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT);
INSERT INTO users VALUES (1, 'alice');
CREATE TABLE banks (id INTEGER PRIMARY KEY, name TEXT, userId INTEGER);
CREATE TABLE history (id INTEGER PRIMARY KEY, userId INTEGER);
CREATE TABLE notes (id INTEGER PRIMARY KEY, bankId INTEGER, questionId INTEGER, content TEXT,
  createdAt TEXT, updatedAt TEXT, UNIQUE(bankId, questionId));
INSERT INTO notes VALUES (1, 42, 7, 'legacy note', '2025-01-01', '2025-01-01');
CREATE TABLE note_tree (id INTEGER PRIMARY KEY, userId INTEGER);
CREATE TABLE favorites (id INTEGER PRIMARY KEY, bankId INTEGER NOT NULL, questionId INTEGER NOT NULL,
  bankName TEXT, questionData TEXT NOT NULL, createdAt TEXT, UNIQUE(bankId, questionId));
INSERT INTO favorites VALUES (1, 42, 7, 'bank', '{}', '2025-01-01');
CREATE TABLE quiz_sessions (bank_id TEXT PRIMARY KEY, question_order TEXT, answers TEXT,
  current_index INTEGER, mode TEXT, shuffled INTEGER, start_time INTEGER, wrong_ids TEXT, updated_at TEXT);
INSERT INTO quiz_sessions VALUES ('42', '[]', '{}', 0, 'practice', 0, 1, '[]', '2025-01-01');
CREATE TABLE ai_configs (id INTEGER PRIMARY KEY, name TEXT UNIQUE, baseUrl TEXT, apiKey TEXT,
  model TEXT, isDefault INTEGER, createdAt TEXT, updatedAt TEXT);
INSERT INTO ai_configs VALUES (1, 'openai', '', 'legacy-key', '', 1, '2025-01-01', '2025-01-01');
"""


class LegacyMigrationTest(unittest.TestCase):
    """Port of the ``migrateUserIsolation`` unit test."""

    def setUp(self):
        db.use_database(":memory:")
        db.conn.executescript(LEGACY_SCHEMA)

    def test_legacy_rows_are_preserved_and_assigned_only_when_unambiguous(self):
        db._migrate_legacy()
        db._migrate_legacy()
        self.assertEqual(db.row("SELECT userId FROM notes WHERE id = 1")["userId"], 1)
        self.assertEqual(db.row("SELECT userId FROM favorites WHERE id = 1")["userId"], 1)
        self.assertEqual(db.row("SELECT userId FROM quiz_sessions WHERE bank_id = ?", ("42",))["userId"], 1)
        self.assertEqual(db.row("SELECT userId FROM ai_configs WHERE id = 1")["userId"], 1)
        self.assertEqual(db.row("SELECT content FROM notes WHERE id = 1")["content"], "legacy note")

    def test_fresh_database_is_not_rebuilt(self):
        db.use_database(":memory:")
        db.init()
        self.assertEqual(db.conn.execute("PRAGMA user_version").fetchone()[0], 1)
        self.assertIn("userId", {c["name"] for c in db.conn.execute("PRAGMA table_info(notes)")})


class MobileCompatibilityTest(unittest.TestCase):
    """Port of ``tests/mobileCompatibility.test.mjs``."""

    def setUp(self):
        db.use_database(":memory:")
        db.conn.executescript(
            """
            CREATE TABLE history (id INTEGER PRIMARY KEY AUTOINCREMENT, bankId INTEGER, bankName TEXT,
              mode TEXT, score INTEGER, correctCount INTEGER, wrongCount INTEGER, totalQuestions INTEGER,
              duration INTEGER, answers TEXT, wrongQuestionIds TEXT, wrongQuestions TEXT, userId INTEGER, date TEXT);
            CREATE TABLE quiz_sessions (bank_id TEXT, userId INTEGER);
            """
        )
        db._migrate_mobile_compat()

    def test_additive_migration_can_run_twice_and_keeps_legacy_rows(self):
        db.run("INSERT INTO history (bankName, userId) VALUES (?, ?)", ("legacy", 1))
        db._migrate_mobile_compat()
        self.assertEqual(db.row("SELECT COUNT(*) AS n FROM history")["n"], 1)
        columns = {c["name"] for c in db.conn.execute("PRAGMA table_info(quiz_sessions)")}
        self.assertIn("submitted_ids", columns)

    def test_retrying_a_submission_returns_its_original_history_and_snapshot(self):
        data = {
            "bankId": 8,
            "bankName": "bank",
            "submissionId": "mobile-retry",
            "score": 100,
            "questions": [{"id": 1, "question": "original"}],
            "answers": {1: "A"},
        }
        first = db.save_history_record(1, data)
        retry = db.save_history_record(1, {**data, "score": 0, "questions": []})
        self.assertEqual(retry["id"], first["id"])
        self.assertEqual(retry["score"], 100)
        self.assertEqual(retry["questions"][0]["question"], "original")
        self.assertEqual(retry["answers"], {"1": "A"})
        self.assertEqual(db.row("SELECT COUNT(*) AS n FROM history")["n"], 1)

    def test_submission_identifiers_are_scoped_to_accounts(self):
        first = db.save_history_record(1, {"submissionId": "same"})
        other = db.save_history_record(2, {"submissionId": "same"})
        self.assertNotEqual(first["id"], other["id"])
        db.save_history_record(1, {})
        db.save_history_record(1, {})
        self.assertEqual(db.row("SELECT COUNT(*) AS n FROM history")["n"], 4)


class QuizNotesBatchTest(unittest.TestCase):
    """Port of the server half of ``tests/quiz-notes-batch.test.mjs``."""

    def setUp(self):
        db.use_database(":memory:")
        db.conn.executescript(
            "CREATE TABLE notes (id INTEGER PRIMARY KEY, content TEXT, userId INTEGER);"
            "INSERT INTO notes VALUES (1, 'one', 1), (2, 'two', 1), (3, 'three', 1);"
        )

    def test_batch_deletion_removes_the_requested_quiz_notes_in_one_operation(self):
        deleted = db.delete_quiz_notes_by_ids([1, 3], 1)
        remaining = [r["id"] for r in db.rows("SELECT id FROM notes ORDER BY id")]
        self.assertEqual(deleted, 2)
        self.assertEqual(remaining, [2])

    def test_invalid_batch_ids_are_rejected_before_any_note_is_deleted(self):
        with self.assertRaisesRegex(TypeError, "positive integers"):
            db.delete_quiz_notes_by_ids([1, "invalid"], 1)
        self.assertEqual(db.row("SELECT COUNT(*) AS count FROM notes")["count"], 3)


class HttpApiTest(unittest.TestCase):
    """Port of the end-to-end isolation test that used to spawn ``server/server.js``."""

    def setUp(self):
        db.use_database(str(_TMP / "http.db"))
        db.init()

    def test_account_data_is_isolated_while_resource_cards_remain_shared(self):
        with TestClient(app) as client:
            def api(path, token=None, method="GET", body=None):
                headers = {}
                if token:
                    headers["Authorization"] = f"Bearer {token}"
                kwargs = {"headers": headers}
                if body is not None:
                    kwargs["json"] = body
                response = client.request(method, path, **kwargs)
                return response.status_code, response.json()

            alice = api("/api/auth/register", method="POST", body={"username": "alice", "password": "password1"})[1]["token"]
            bob = api("/api/auth/register", method="POST", body={"username": "bob", "password": "password2"})[1]["token"]
            self.assertTrue(alice and bob)

            self.assertEqual(api("/api/ai-configs")[0], 401)
            self.assertEqual(api("/api/resources")[0], 401)
            self.assertEqual(api("/api/resources", method="POST", body={"filename": "blocked.html", "content": "x"})[0], 401)
            self.assertEqual(api("/api/resources/blocked.html", method="DELETE")[0], 401)
            self.assertEqual(api("/api/resources", alice)[0], 200)
            self.assertEqual(api("/api/resources", bob)[0], 200)

            resource_page = client.get("/resources/disk-scheduling.html")
            self.assertEqual(resource_page.status_code, 200)
            self.assertIn("sandbox allow-scripts", resource_page.headers["content-security-policy"])
            self.assertNotIn("allow-same-origin", resource_page.headers["content-security-policy"])

            alice_bank = api("/api/banks", alice, "POST", {"name": "Alice bank", "questions": []})[1]
            bob_bank = api("/api/banks", bob, "POST", {"name": "Bob bank", "questions": []})[1]
            self.assertNotEqual(alice_bank["id"], bob_bank["id"])
            self.assertEqual([b["name"] for b in api("/api/banks", alice)[1]], ["Alice bank"])
            self.assertEqual([b["name"] for b in api("/api/banks", bob)[1]], ["Bob bank"])
            api(f"/api/banks/{alice_bank['id']}", bob, "DELETE")
            self.assertEqual(len(api("/api/banks", alice)[1]), 1)

            alice_record = api(
                "/api/history",
                alice,
                "POST",
                {
                    "bankId": alice_bank["id"],
                    "bankName": "Alice bank",
                    "mode": "practice",
                    "score": 80,
                    "correctCount": 1,
                    "wrongCount": 0,
                    "totalQuestions": 1,
                    "duration": 10,
                },
            )[1]
            self.assertEqual(len(api("/api/history", bob)[1]), 0)
            api(f"/api/history/{alice_record['id']}", bob, "DELETE")
            self.assertEqual(len(api("/api/history", alice)[1]), 1)

            api("/api/notes", alice, "POST", {"bankId": 42, "questionId": 7, "content": "Alice note"})
            api("/api/notes", bob, "POST", {"bankId": 42, "questionId": 7, "content": "Bob note"})
            self.assertEqual(api("/api/notes/42/7", alice)[1]["content"], "Alice note")
            self.assertEqual(api("/api/notes/42/7", bob)[1]["content"], "Bob note")

            api("/api/favorites", alice, "POST", {"bankId": 42, "questionId": 7, "questionData": {"question": "Alice"}})
            api("/api/favorites", bob, "POST", {"bankId": 42, "questionId": 7, "questionData": {"question": "Bob"}})
            self.assertEqual(api("/api/favorites", alice)[1][0]["questionData"]["question"], "Alice")
            self.assertEqual(api("/api/favorites", bob)[1][0]["questionData"]["question"], "Bob")

            api("/api/sessions", alice, "PUT", {"bankId": "shared-bank", "answers": {1: "A"}})
            api("/api/sessions", bob, "PUT", {"bankId": "shared-bank", "answers": {1: "B"}})
            self.assertEqual(api("/api/sessions/shared-bank", alice)[1]["answers"]["1"], "A")
            self.assertEqual(api("/api/sessions/shared-bank", bob)[1]["answers"]["1"], "B")

            api("/api/ai-configs", alice, "POST", {"name": "openai", "apiKey": "alice-key", "isDefault": True})
            api("/api/ai-configs", bob, "POST", {"name": "openai", "apiKey": "bob-key", "isDefault": True})
            self.assertEqual(api("/api/ai-configs/default/active", alice)[1]["apiKey"], "alice-key")
            self.assertEqual(api("/api/ai-configs/default/active", bob)[1]["apiKey"], "bob-key")
            self.assertEqual(api("/api/export", bob)[1]["aiConfigs"][0]["apiKey"], "bob-key")

            tree = api("/api/notes", alice, "POST", {"title": "Alice folder", "type": "folder"})[1]
            self.assertEqual(len(api("/api/notes/tree", bob)[1]), 0)
            self.assertEqual(api("/api/notes", bob, "POST", {"parent_id": tree["id"], "title": "Wrong parent"})[0], 400)
            private_export = client.get(f"/api/notes/export/{tree['id']}", headers={"Authorization": f"Bearer {bob}"})
            self.assertEqual(private_export.status_code, 404)

            exported = api("/api/export", alice)[1]
            self.assertEqual(api("/api/import", bob, "POST", exported)[0], 200)
            self.assertEqual(api("/api/ai-configs/default/active", alice)[1]["apiKey"], "alice-key")
            self.assertEqual(api("/api/ai-configs/default/active", bob)[1]["apiKey"], "alice-key")
            self.assertEqual([b["name"] for b in api("/api/banks", alice)[1]], ["Alice bank"])


class FakeToolCallingModel(BaseChatModel):
    """Emits one tool call, then a plain answer — no network involved."""

    calls: list = []
    done: bool = False

    @property
    def _llm_type(self) -> str:
        return "fake"

    def bind_tools(self, tools, **kwargs):
        return self

    def _generate(self, messages, stop=None, run_manager=None, **kwargs) -> ChatResult:
        if not self.done:
            call = self.calls.pop(0)
            message = AIMessage(
                content="",
                tool_calls=[{"name": call["name"], "args": call["args"], "id": call.get("id", "call_1")}],
            )
            self.done = True
        else:
            message = AIMessage(content="已经写好了。")
        return ChatResult(generations=[ChatGeneration(message=message)])


class AgentHitlTest(unittest.TestCase):
    """A write tool must wait for the human, then run once approved."""

    def setUp(self):
        db.use_database(str(_TMP / "agent.db"))
        db.init()
        self._original_build_model = agent_module.build_model

    def tearDown(self):
        agent_module.build_model = self._original_build_model

    def _client(self, model):
        agent_module.build_model = lambda config: model
        client = TestClient(app)
        client.__enter__()
        self.addCleanup(client.__exit__, None, None, None)
        token = client.post(
            "/api/auth/register", json={"username": "agent_user", "password": "password1"}
        ).json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        client.post(
            "/api/ai-configs",
            json={"name": "openai", "apiKey": "key", "model": "model", "isDefault": True},
            headers=headers,
        )
        return client, headers

    def test_write_tool_waits_for_approval_and_then_runs(self):
        model = FakeToolCallingModel(
            calls=[{"name": "create_note", "args": {"title": "自动笔记", "content": "内容"}}]
        )
        client, headers = self._client(model)

        chat = client.post("/api/agent/chat", json={"message": "帮我建个笔记"}, headers=headers)
        self.assertEqual(chat.status_code, 200)
        body = chat.json()
        self.assertEqual(body["status"], "awaiting_approval")
        self.assertEqual(len(body["pending"]), 1)
        self.assertEqual(body["pending"][0]["name"], "create_note")
        self.assertEqual(body["pending"][0]["args"]["title"], "自动笔记")

        # Nothing is written before the human approves.
        self.assertEqual(client.get("/api/notes/tree", headers=headers).json(), [])

        # A reload must not lose the approval card.
        history = client.get(f"/api/agent/history?threadId={body['threadId']}", headers=headers)
        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.json()["status"], "awaiting_approval")
        self.assertEqual(len(history.json()["pending"]), 1)

        resume = client.post(
            "/api/agent/resume",
            json={"threadId": body["threadId"], "decisions": [{"type": "approve"}]},
            headers=headers,
        )
        self.assertEqual(resume.status_code, 200)
        self.assertEqual(resume.json()["status"], "done")

        notes = client.get("/api/notes/tree", headers=headers).json()
        self.assertEqual(len(notes), 1)
        self.assertEqual(notes[0]["title"], "自动笔记")

    def test_rejecting_a_write_never_touches_the_data(self):
        model = FakeToolCallingModel(
            calls=[{"name": "create_note", "args": {"title": "不该出现的笔记", "content": "内容"}}]
        )
        client, headers = self._client(model)

        chat = client.post("/api/agent/chat", json={"message": "建个笔记"}, headers=headers)
        thread_id = chat.json()["threadId"]

        resume = client.post(
            "/api/agent/resume",
            json={
                "threadId": thread_id,
                "decisions": [{"type": "reject", "message": "不要建"}],
            },
            headers=headers,
        )
        self.assertEqual(resume.status_code, 200)
        self.assertEqual(resume.json()["status"], "done")
        self.assertEqual(client.get("/api/notes/tree", headers=headers).json(), [])

    def test_a_decision_count_mismatch_is_rejected(self):
        model = FakeToolCallingModel(
            calls=[{"name": "create_note", "args": {"title": "笔记", "content": "内容"}}]
        )
        client, headers = self._client(model)

        chat = client.post("/api/agent/chat", json={"message": "建个笔记"}, headers=headers)
        thread_id = chat.json()["threadId"]
        resume = client.post(
            "/api/agent/resume",
            json={
                "threadId": thread_id,
                "decisions": [
                    {"type": "approve"},
                    {"type": "approve"},
                ],
            },
            headers=headers,
        )
        self.assertEqual(resume.status_code, 400)


if __name__ == "__main__":
    unittest.main()
