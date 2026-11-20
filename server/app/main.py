"""FastAPI backend for the exam/quiz system.

Replaces the previous Express server. The REST contract is unchanged, so the
web client (``src/``) and the mobile client (``mobile/``) keep working as-is.
"""

from __future__ import annotations

import os
import pathlib
import re
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import Body, Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from . import agent as agent_module
from . import db
from .auth import CurrentUser, create_token, current_user, hash_password, verify_password

SERVER_DIR = pathlib.Path(__file__).resolve().parent.parent
PROJECT_DIR = SERVER_DIR.parent
RESOURCES_DIR = PROJECT_DIR / "public" / "resources"
DIST_DIR = SERVER_DIR / "dist"
CHECKPOINT_PATH = os.environ.get("QUIZ_CHECKPOINT_PATH") or str(db.DATA_DIR / "agent-checkpoints.db")

MAX_BODY_BYTES = 10 * 1024 * 1024
TITLE_RE = re.compile(r"<title[^>]*>([^<]+)</title>", re.IGNORECASE)


def encode_uri_component(text: str) -> str:
    """Mirror JavaScript's ``encodeURIComponent``."""
    safe = "-_.!~*'()"
    return "".join(
        char if (char.isalnum() and char.isascii()) or char in safe
        else "".join(f"%{byte:02X}" for byte in char.encode("utf-8"))
        for char in text
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init()
    RESOURCES_DIR.mkdir(parents=True, exist_ok=True)
    async with AsyncSqliteSaver.from_conn_string(CHECKPOINT_PATH) as saver:
        await saver.setup()
        agent_module.set_checkpointer(saver)
        yield


app = FastAPI(title="Quiz Server", version="2.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """The clients read ``error`` out of the JSON body — keep that shape."""
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail}, headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=400, content={"error": "请求参数有误", "detail": str(exc.errors())})


@app.middleware("http")
async def body_limit_and_resource_headers(request: Request, call_next):
    length = request.headers.get("content-length")
    if length and length.isdigit() and int(length) > MAX_BODY_BYTES:
        return JSONResponse(status_code=413, content={"error": "请求体过大（上限 10MB）"})
    response = await call_next(request)
    if request.url.path.startswith("/resources"):
        response.headers["Cache-Control"] = "no-cache"
        response.headers["Content-Security-Policy"] = "sandbox allow-scripts allow-forms allow-popups"
    return response


# ==========================================================================
# AUTH
# ==========================================================================


@app.post("/api/auth/register")
async def register(body: dict = Body(...)):
    username = str(body.get("username") or "").strip()
    password = str(body.get("password") or "")
    if not username or not password:
        raise HTTPException(status_code=400, detail="用户名和密码不能为空")
    if len(username) < 2 or len(username) > 20:
        raise HTTPException(status_code=400, detail="用户名长度需 2-20 个字符")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="密码至少 6 位")
    if db.row("SELECT id FROM users WHERE username = ?", (username,)):
        raise HTTPException(status_code=409, detail="用户名已被注册")
    user_id = db.run(
        "INSERT INTO users (username, password) VALUES (?, ?)", (username, hash_password(password))
    )
    return {"token": create_token(user_id, username), "user": {"id": user_id, "username": username}}


@app.post("/api/auth/login")
async def login(body: dict = Body(...)):
    username = str(body.get("username") or "").strip()
    password = str(body.get("password") or "")
    if not username or not password:
        raise HTTPException(status_code=400, detail="用户名和密码不能为空")
    record = db.row("SELECT id, username, password FROM users WHERE username = ?", (username,))
    if not record or not verify_password(password, record["password"]):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    return {"token": create_token(record["id"], record["username"]), "user": {"id": record["id"], "username": record["username"]}}


@app.get("/api/auth/me")
async def me(user: CurrentUser = Depends(current_user)):
    return {"id": user.id, "username": user.username}


# ==========================================================================
# BANKS
# ==========================================================================


@app.get("/api/banks")
async def list_banks(user: CurrentUser = Depends(current_user)):
    records = db.rows("SELECT * FROM banks WHERE userId = ? ORDER BY createdAt DESC", (user.id,))
    return [{**record, "questions": db.loads(record["questions"], [])} for record in records]


@app.post("/api/banks")
async def create_bank(body: dict = Body(...), user: CurrentUser = Depends(current_user)):
    name = body.get("name")
    subject = body.get("subject") or ""
    questions = body.get("questions") or []
    bank_id = db.run(
        "INSERT INTO banks (name, subject, questions, userId) VALUES (?, ?, ?, ?)",
        (name, subject, db.dumps(questions), user.id),
    )
    return {"id": bank_id, "name": name, "subject": subject, "questions": questions, "createdAt": db.now_iso()}


@app.put("/api/banks/{bank_id}")
async def update_bank(bank_id: int, body: dict = Body(...), user: CurrentUser = Depends(current_user)):
    db.run(
        "UPDATE banks SET name = ?, subject = ? WHERE id = ? AND userId = ?",
        (body.get("name"), body.get("subject") or "", bank_id, user.id),
    )
    return {"success": True}


@app.delete("/api/banks/{bank_id}")
async def delete_bank(bank_id: int, user: CurrentUser = Depends(current_user)):
    db.run("DELETE FROM banks WHERE id = ? AND userId = ?", (bank_id, user.id))
    return {"success": True}


# ==========================================================================
# HISTORY
# ==========================================================================


@app.get("/api/history")
async def list_history(user: CurrentUser = Depends(current_user)):
    records = db.rows("SELECT * FROM history WHERE userId = ? ORDER BY date DESC", (user.id,))
    return [db.decode_history(record) for record in records]


@app.post("/api/history")
async def create_history(body: dict = Body(...), user: CurrentUser = Depends(current_user)):
    return db.save_history_record(user.id, body)


@app.put("/api/history/session")
async def save_history_session(body: dict = Body(...), user: CurrentUser = Depends(current_user)):
    if not body.get("bankId"):
        raise HTTPException(status_code=400, detail="bankId is required")
    now = db.now_iso()
    record_id = db.run(
        """INSERT INTO history (bankId, bankName, mode, score, correctCount, wrongCount, totalQuestions,
             duration, answers, wrongQuestionIds, wrongQuestions, date, userId)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            body.get("bankId"),
            body.get("bankName") or "",
            body.get("mode") or "practice",
            body.get("score") or 0,
            body.get("correctCount") or 0,
            body.get("wrongCount") or 0,
            body.get("totalQuestions") or 0,
            body.get("duration") or 0,
            db.dumps(body.get("answers") or {}),
            db.dumps(body.get("wrongQuestionIds") or []),
            db.dumps(body.get("wrongQuestions") or []),
            now,
            user.id,
        ),
    )
    return {"id": record_id, "date": now}


@app.delete("/api/history/{record_id}")
async def delete_history(record_id: int, user: CurrentUser = Depends(current_user)):
    db.run("DELETE FROM history WHERE id = ? AND userId = ?", (record_id, user.id))
    return {"success": True}


@app.delete("/api/history")
async def clear_history(user: CurrentUser = Depends(current_user)):
    db.run("DELETE FROM history WHERE userId = ?", (user.id,))
    return {"success": True}


# ==========================================================================
# FAVORITES
# ==========================================================================


@app.get("/api/favorites")
async def list_favorites(user: CurrentUser = Depends(current_user)):
    records = db.rows("SELECT * FROM favorites WHERE userId = ? ORDER BY createdAt DESC", (user.id,))
    return [{**record, "questionData": db.loads(record["questionData"], {})} for record in records]


@app.post("/api/favorites")
async def create_favorite(body: dict = Body(...), user: CurrentUser = Depends(current_user)):
    if body.get("bankId") is None or body.get("questionId") is None:
        raise HTTPException(status_code=400, detail="bankId and questionId are required")
    now = db.now_iso()
    question_data = body.get("questionData") or {}
    favorite_id = db.run(
        "INSERT INTO favorites (bankId, questionId, bankName, questionData, createdAt, userId) VALUES (?, ?, ?, ?, ?, ?)",
        (body["bankId"], body["questionId"], body.get("bankName") or "", db.dumps(question_data), now, user.id),
    )
    return {
        "id": favorite_id,
        "bankId": body["bankId"],
        "questionId": body["questionId"],
        "bankName": body.get("bankName") or "",
        "questionData": question_data,
        "createdAt": now,
    }


@app.get("/api/favorites/{bank_id}/{question_id}")
async def check_favorite(bank_id: int, question_id: int, user: CurrentUser = Depends(current_user)):
    record = db.row(
        "SELECT id FROM favorites WHERE bankId = ? AND questionId = ? AND userId = ?", (bank_id, question_id, user.id)
    )
    return {"favorited": bool(record), "id": record["id"] if record else None}


@app.delete("/api/favorites/{bank_id}/{question_id}")
async def delete_favorite(bank_id: int, question_id: int, user: CurrentUser = Depends(current_user)):
    db.run("DELETE FROM favorites WHERE bankId = ? AND questionId = ? AND userId = ?", (bank_id, question_id, user.id))
    return {"success": True}


# ==========================================================================
# EXPORT / IMPORT
# ==========================================================================


@app.get("/api/export")
async def export_all(user: CurrentUser = Depends(current_user)):
    banks = db.rows("SELECT * FROM banks WHERE userId = ?", (user.id,))
    history = db.rows("SELECT * FROM history WHERE userId = ?", (user.id,))
    return {
        "banks": [{**record, "questions": db.loads(record["questions"], [])} for record in banks],
        "history": [db.decode_history(record) for record in history],
        "notes": db.rows("SELECT * FROM notes WHERE userId = ?", (user.id,)),
        "noteTree": db.rows(
            "SELECT * FROM note_tree WHERE userId = ? ORDER BY sort_order ASC, id ASC", (user.id,)
        ),
        "aiConfigs": db.rows("SELECT * FROM ai_configs WHERE userId = ?", (user.id,)),
        "favorites": [
            {**record, "questionData": db.loads(record["questionData"], {})}
            for record in db.rows("SELECT * FROM favorites WHERE userId = ?", (user.id,))
        ],
        "exportedAt": db.now_iso(),
    }


@app.post("/api/import")
async def import_all(body: dict = Body(...), user: CurrentUser = Depends(current_user)):
    banks = body.get("banks")
    history = body.get("history")
    notes = body.get("notes")
    ai_configs = body.get("aiConfigs")
    favorites = body.get("favorites")

    imported_bank_ids: dict[str, int] = {}
    with db.tx() as conn:
        if isinstance(banks, list):
            conn.execute("DELETE FROM banks WHERE userId = ?", (user.id,))
            for bank in banks:
                new_id = conn.execute(
                    "INSERT INTO banks (name, subject, questions, createdAt, userId) VALUES (?, ?, ?, ?, ?)",
                    (
                        bank.get("name"),
                        bank.get("subject") or "",
                        db.dumps(bank.get("questions") or []),
                        bank.get("createdAt") or db.now_iso(),
                        user.id,
                    ),
                ).lastrowid
                imported_bank_ids[str(bank.get("id"))] = int(new_id)

        if isinstance(history, list):
            conn.execute("DELETE FROM history WHERE userId = ?", (user.id,))
            for record in history:
                submission_id = record.get("submissionId") if isinstance(record.get("submissionId"), str) else None
                questions = record.get("questions")
                conn.execute(
                    """INSERT INTO history (bankId, bankName, mode, score, correctCount, wrongCount, totalQuestions,
                         duration, answers, wrongQuestionIds, wrongQuestions, date, userId, submissionId, questionSnapshot)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        imported_bank_ids.get(str(record.get("bankId")), record.get("bankId")),
                        record.get("bankName"),
                        record.get("mode"),
                        record.get("score"),
                        record.get("correctCount"),
                        record.get("wrongCount"),
                        record.get("totalQuestions"),
                        record.get("duration"),
                        db.dumps(record.get("answers") or {}),
                        db.dumps(record.get("wrongQuestionIds") or []),
                        db.dumps(record.get("wrongQuestions") or []),
                        record.get("date"),
                        user.id,
                        submission_id,
                        db.dumps(questions) if isinstance(questions, list) else record.get("questionSnapshot"),
                    ),
                )

        if isinstance(notes, list):
            conn.execute("DELETE FROM notes WHERE userId = ?", (user.id,))
            for note in notes:
                conn.execute(
                    "INSERT INTO notes (bankId, questionId, content, createdAt, updatedAt, userId) VALUES (?, ?, ?, ?, ?, ?)",
                    (
                        imported_bank_ids.get(str(note.get("bankId")), note.get("bankId")),
                        note.get("questionId"),
                        note.get("content"),
                        note.get("createdAt"),
                        note.get("updatedAt"),
                        user.id,
                    ),
                )

        if isinstance(ai_configs, list):
            conn.execute("DELETE FROM ai_configs WHERE userId = ?", (user.id,))
            for config in ai_configs:
                conn.execute(
                    """INSERT INTO ai_configs (name, baseUrl, apiKey, model, isDefault, createdAt, updatedAt, userId)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        config.get("name"),
                        config.get("baseUrl") or "",
                        config.get("apiKey") or "",
                        config.get("model") or "",
                        1 if config.get("isDefault") else 0,
                        config.get("createdAt") or db.now_iso(),
                        config.get("updatedAt") or db.now_iso(),
                        user.id,
                    ),
                )

        if isinstance(favorites, list):
            conn.execute("DELETE FROM favorites WHERE userId = ?", (user.id,))
            for favorite in favorites:
                conn.execute(
                    "INSERT INTO favorites (bankId, questionId, bankName, questionData, createdAt, userId) VALUES (?, ?, ?, ?, ?, ?)",
                    (
                        favorite.get("bankId"),
                        favorite.get("questionId"),
                        favorite.get("bankName") or "",
                        db.dumps(favorite.get("questionData") or {}),
                        favorite.get("createdAt") or db.now_iso(),
                        user.id,
                    ),
                )
    return {"success": True}


# ==========================================================================
# NOTES — quiz notes (per bankId + questionId) and the note tree
# ==========================================================================


@app.post("/api/notes/batch-delete")
async def batch_delete_notes(body: dict = Body(...), user: CurrentUser = Depends(current_user)):
    try:
        deleted = db.delete_quiz_notes_by_ids(body.get("ids"), user.id)
    except TypeError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None
    return {"success": True, "deletedCount": deleted}


@app.post("/api/notes/reorder")
async def reorder_notes(body: dict = Body(...), user: CurrentUser = Depends(current_user)):
    orders = body.get("orders")
    if not isinstance(orders, list):
        raise HTTPException(status_code=400, detail="orders must be an array")
    now = db.now_iso()
    with db.tx() as conn:
        for order in orders:
            conn.execute(
                "UPDATE note_tree SET sort_order = ?, updatedAt = ? WHERE id = ? AND userId = ?",
                (order.get("sort_order"), now, order.get("id"), user.id),
            )
    return {"success": True}


@app.post("/api/notes/import")
async def import_note(body: dict = Body(...), user: CurrentUser = Depends(current_user)):
    filename = body.get("filename") or "未命名"
    content = body.get("content") or ""
    now = db.now_iso()
    note_id = db.run(
        """INSERT INTO note_tree (parent_id, title, type, content, sort_order, createdAt, updatedAt, userId)
           VALUES (NULL, ?, 'note', ?, 0, ?, ?, ?)""",
        (filename, content, now, now, user.id),
    )
    return {"id": note_id, "title": filename, "type": "note", "content": content, "createdAt": now}


@app.get("/api/notes/tree")
async def list_note_tree(user: CurrentUser = Depends(current_user)):
    return db.rows(
        """SELECT id, parent_id, title, type, content, sort_order, createdAt, updatedAt
           FROM note_tree WHERE userId = ? ORDER BY sort_order ASC, id ASC""",
        (user.id,),
    )


@app.get("/api/notes/quiz")
async def list_quiz_notes(user: CurrentUser = Depends(current_user)):
    records = db.rows(
        """SELECT n.id, n.bankId, n.questionId, n.content, n.createdAt, n.updatedAt,
                  b.name AS bankName, b.questions AS bankQuestions
           FROM notes n LEFT JOIN banks b ON n.bankId = b.id AND b.userId = n.userId
           WHERE n.bankId IS NOT NULL AND n.questionId IS NOT NULL AND n.userId = ?
           ORDER BY n.updatedAt DESC""",
        (user.id,),
    )
    result = []
    for record in records:
        questions = db.loads(record.get("bankQuestions"), [])
        question = next((q for q in questions if q.get("id") == record["questionId"]), None)
        result.append(
            {
                "id": record["id"],
                "bankId": record["bankId"],
                "questionId": record["questionId"],
                "content": record["content"],
                "createdAt": record["createdAt"],
                "updatedAt": record["updatedAt"],
                "bankName": record["bankName"] or "未知题库",
                "question": question,
            }
        )
    return result


@app.get("/api/notes/export/{note_id}")
async def export_note(note_id: int, user: CurrentUser = Depends(current_user)):
    note = db.row("SELECT * FROM note_tree WHERE id = ? AND userId = ?", (note_id, user.id))
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    filename = f"{note.get('title') or '未命名'}.md"
    encoded = encode_uri_component(filename)
    return Response(
        content=note.get("content") or "",
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{encoded}"; filename*=UTF-8\'\'{encoded}',
        },
    )


@app.get("/api/notes")
async def list_quiz_notes_by_bank(bankId: int | None = None, user: CurrentUser = Depends(current_user)):
    if bankId is not None:
        return db.rows(
            "SELECT * FROM notes WHERE bankId = ? AND userId = ? ORDER BY id ASC", (bankId, user.id)
        )
    return db.rows("SELECT * FROM notes WHERE userId = ? ORDER BY id ASC", (user.id,))


@app.get("/api/notes/{bank_id}/{question_id}")
async def get_quiz_note(bank_id: int, question_id: int, user: CurrentUser = Depends(current_user)):
    return db.row(
        "SELECT * FROM notes WHERE bankId = ? AND questionId = ? AND userId = ?", (bank_id, question_id, user.id)
    )


@app.post("/api/notes")
async def create_note(body: dict = Body(...), user: CurrentUser = Depends(current_user)):
    # Quiz note (bankId + questionId) and tree note (title/type/content) share this endpoint.
    if body.get("bankId") is not None or body.get("questionId") is not None:
        bank_id = body.get("bankId")
        question_id = body.get("questionId")
        if not isinstance(bank_id, int) or not isinstance(question_id, int):
            raise HTTPException(status_code=400, detail="bankId and questionId are required")
        now = db.now_iso()
        db.run(
            """INSERT INTO notes (bankId, questionId, content, createdAt, updatedAt, userId)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(userId, bankId, questionId) DO UPDATE SET
                 content = excluded.content, updatedAt = excluded.updatedAt""",
            (bank_id, question_id, body.get("content") or "", now, now, user.id),
        )
        return db.row(
            "SELECT * FROM notes WHERE bankId = ? AND questionId = ? AND userId = ?", (bank_id, question_id, user.id)
        )

    parent_id = body.get("parent_id")
    if parent_id is not None and not db.row(
        "SELECT id FROM note_tree WHERE id = ? AND userId = ? AND type = ?", (parent_id, user.id, "folder")
    ):
        raise HTTPException(status_code=400, detail="父文件夹不存在")
    now = db.now_iso()
    maximum = db.row(
        "SELECT MAX(sort_order) AS m FROM note_tree WHERE parent_id IS ? AND userId = ?", (parent_id, user.id)
    )
    sort_order = (maximum["m"] if maximum and maximum["m"] is not None else -1) + 1
    title = body.get("title") or "未命名"
    content = body.get("content") or ""
    note_type = body.get("type") or "note"
    note_id = db.run(
        """INSERT INTO note_tree (parent_id, title, type, content, sort_order, createdAt, updatedAt, userId)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (parent_id, title, note_type, content, sort_order, now, now, user.id),
    )
    return {
        "id": note_id,
        "parent_id": parent_id,
        "title": title,
        "type": note_type,
        "content": content,
        "sort_order": sort_order,
        "createdAt": now,
        "updatedAt": now,
    }


@app.put("/api/notes/{note_id}")
async def update_note(note_id: int, body: dict = Body(...), user: CurrentUser = Depends(current_user)):
    parent_id = body.get("parent_id")
    if parent_id is not None and not db.row(
        "SELECT id FROM note_tree WHERE id = ? AND userId = ? AND type = ?", (parent_id, user.id, "folder")
    ):
        raise HTTPException(status_code=400, detail="父文件夹不存在")
    assignments = []
    values: list[Any] = []
    for field, column in (("title", "title"), ("content", "content"), ("parent_id", "parent_id"), ("sort_order", "sort_order")):
        if field in body:
            assignments.append(f"{column} = ?")
            values.append(body[field])
    assignments.append("updatedAt = ?")
    values.append(db.now_iso())
    values.extend([note_id, user.id])
    db.run(f"UPDATE note_tree SET {', '.join(assignments)} WHERE id = ? AND userId = ?", values)
    return db.row("SELECT * FROM note_tree WHERE id = ? AND userId = ?", (note_id, user.id))


@app.delete("/api/notes/{bank_id}/{question_id}")
async def delete_quiz_note(bank_id: int, question_id: int, user: CurrentUser = Depends(current_user)):
    db.run("DELETE FROM notes WHERE bankId = ? AND questionId = ? AND userId = ?", (bank_id, question_id, user.id))
    return {"success": True}


@app.delete("/api/notes/{note_id}")
async def delete_note(note_id: int, user: CurrentUser = Depends(current_user)):
    pending = [note_id]
    while True:
        children = db.rows("SELECT id FROM note_tree WHERE parent_id = ? AND userId = ?", (pending[-1], user.id))
        if not children:
            break
        pending.extend(child["id"] for child in children)
    placeholders = ",".join("?" * len(pending))
    db.run(f"DELETE FROM note_tree WHERE id IN ({placeholders}) AND userId = ?", (*pending, user.id))
    return {"success": True, "deletedCount": len(pending)}


# ==========================================================================
# AI CONFIGS
# ==========================================================================


@app.get("/api/ai-configs")
async def list_ai_configs(user: CurrentUser = Depends(current_user)):
    return db.rows("SELECT * FROM ai_configs WHERE userId = ? ORDER BY id ASC", (user.id,))


@app.get("/api/ai-configs/default/active")
async def get_default_ai_config(user: CurrentUser = Depends(current_user)):
    return db.row("SELECT * FROM ai_configs WHERE isDefault = 1 AND userId = ? LIMIT 1", (user.id,))


@app.get("/api/ai-configs/{name}")
async def get_ai_config(name: str, user: CurrentUser = Depends(current_user)):
    config = db.row("SELECT * FROM ai_configs WHERE name = ? AND userId = ?", (name, user.id))
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")
    return config


@app.post("/api/ai-configs")
async def save_ai_config(body: dict = Body(...), user: CurrentUser = Depends(current_user)):
    name = body.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    now = db.now_iso()
    with db.tx() as conn:
        if body.get("isDefault"):
            conn.execute("UPDATE ai_configs SET isDefault = 0 WHERE userId = ?", (user.id,))
        conn.execute(
            """INSERT INTO ai_configs (name, baseUrl, apiKey, model, isDefault, createdAt, updatedAt, userId)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(userId, name) DO UPDATE SET
                 baseUrl = excluded.baseUrl, apiKey = excluded.apiKey, model = excluded.model,
                 isDefault = excluded.isDefault, updatedAt = excluded.updatedAt""",
            (
                name,
                body.get("baseUrl") or "",
                body.get("apiKey") or "",
                body.get("model") or "",
                1 if body.get("isDefault") else 0,
                now,
                now,
                user.id,
            ),
        )
    return db.row("SELECT * FROM ai_configs WHERE name = ? AND userId = ?", (name, user.id))


@app.put("/api/ai-configs/{name}")
async def update_ai_config(name: str, body: dict = Body(...), user: CurrentUser = Depends(current_user)):
    now = db.now_iso()
    assignments = []
    values: list[Any] = []
    for field, column in (
        ("baseUrl", "baseUrl"),
        ("apiKey", "apiKey"),
        ("model", "model"),
        ("isDefault", "isDefault"),
    ):
        if field in body:
            assignments.append(f"{column} = ?")
            values.append(1 if (field == "isDefault" and body[field]) else (0 if field == "isDefault" else body[field]))
    assignments.append("updatedAt = ?")
    values.append(now)
    values.extend([name, user.id])
    with db.tx() as conn:
        if body.get("isDefault"):
            conn.execute("UPDATE ai_configs SET isDefault = 0 WHERE userId = ?", (user.id,))
        conn.execute(f"UPDATE ai_configs SET {', '.join(assignments)} WHERE name = ? AND userId = ?", values)
    config = db.row("SELECT * FROM ai_configs WHERE name = ? AND userId = ?", (name, user.id))
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")
    return config


@app.delete("/api/ai-configs/{name}")
async def delete_ai_config(name: str, user: CurrentUser = Depends(current_user)):
    db.run("DELETE FROM ai_configs WHERE name = ? AND userId = ?", (name, user.id))
    return {"success": True}


# ==========================================================================
# QUIZ SESSIONS
# ==========================================================================


def _session_payload(record: dict) -> dict:
    return {
        "bankId": record["bank_id"],
        "questionOrder": db.loads(record.get("question_order"), []),
        "answers": db.loads(record.get("answers"), {}),
        "currentIndex": record.get("current_index") or 0,
        "mode": record.get("mode") or "practice",
        "shuffled": bool(record.get("shuffled")),
        "startTime": record.get("start_time"),
        "wrongIds": db.loads(record.get("wrong_ids"), []),
        "submitted": db.loads(record.get("submitted_ids"), None),
        "submissionId": record.get("submission_id") or None,
        "updatedAt": record.get("updated_at"),
    }


@app.get("/api/sessions/with-bank-info")
async def list_sessions_with_bank_info(user: CurrentUser = Depends(current_user)):
    records = db.rows(
        "SELECT * FROM quiz_sessions WHERE userId = ? ORDER BY updated_at DESC LIMIT 5", (user.id,)
    )
    result = []
    for record in records:
        bank = db.row("SELECT id, name, subject FROM banks WHERE id = ? AND userId = ?", (record["bank_id"], user.id))
        if not bank:
            continue
        payload = _session_payload(record)
        total = len(payload["questionOrder"])
        answered = len(payload["answers"])
        result.append(
            {
                **payload,
                "bankName": bank["name"],
                "subject": bank["subject"],
                "totalQuestions": total,
                "answeredCount": answered,
                "progressPercent": round(answered / total * 100) if total > 0 else 0,
            }
        )
    return result


@app.get("/api/sessions")
async def list_sessions(user: CurrentUser = Depends(current_user)):
    records = db.rows("SELECT * FROM quiz_sessions WHERE userId = ? ORDER BY updated_at DESC", (user.id,))
    return [_session_payload(record) for record in records]


@app.get("/api/sessions/{bank_id}")
async def get_session(bank_id: str, user: CurrentUser = Depends(current_user)):
    record = db.row("SELECT * FROM quiz_sessions WHERE bank_id = ? AND userId = ?", (bank_id, user.id))
    return _session_payload(record) if record else None


@app.put("/api/sessions")
async def save_session(body: dict = Body(...), user: CurrentUser = Depends(current_user)):
    bank_id = body.get("bankId")
    if not bank_id:
        raise HTTPException(status_code=400, detail="bankId is required")
    now = db.now_iso()
    submission_id = body.get("submissionId")
    db.run(
        """INSERT INTO quiz_sessions (bank_id, question_order, answers, current_index, mode, shuffled,
             start_time, wrong_ids, updated_at, userId, submitted_ids, submission_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(userId, bank_id) DO UPDATE SET
             question_order = excluded.question_order, answers = excluded.answers,
             current_index = excluded.current_index, mode = excluded.mode, shuffled = excluded.shuffled,
             start_time = excluded.start_time, wrong_ids = excluded.wrong_ids, updated_at = excluded.updated_at,
             submitted_ids = excluded.submitted_ids, submission_id = excluded.submission_id""",
        (
            str(bank_id),
            db.dumps(body.get("questionOrder") or []),
            db.dumps(body.get("answers") or {}),
            body.get("currentIndex") or 0,
            body.get("mode") or "practice",
            1 if body.get("shuffled") else 0,
            body.get("startTime") or int(datetime.now(timezone.utc).timestamp() * 1000),
            db.dumps(body.get("wrongIds") or []),
            now,
            user.id,
            db.dumps(body["submitted"]) if isinstance(body.get("submitted"), list) else None,
            submission_id[:160] if isinstance(submission_id, str) else None,
        ),
    )
    return {"success": True, "updatedAt": now}


@app.delete("/api/sessions/{bank_id}")
async def delete_session(bank_id: str, user: CurrentUser = Depends(current_user)):
    db.run("DELETE FROM quiz_sessions WHERE bank_id = ? AND userId = ?", (bank_id, user.id))
    return {"success": True}


# ==========================================================================
# RESOURCES (user-managed HTML files, served from public/resources)
# ==========================================================================


def _resource_entry(path: pathlib.Path) -> dict:
    stat = path.stat()
    title = ""
    try:
        match = TITLE_RE.search(path.read_text(encoding="utf-8", errors="ignore"))
        if match and match.group(1):
            title = match.group(1).strip()
    except OSError:
        pass
    fallback = path.stem
    return {
        "file": path.name,
        "name": fallback,
        "title": title or fallback,
        "size": stat.st_size,
        "mtime": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
    }


@app.get("/api/resources")
async def list_resources(user: CurrentUser = Depends(current_user)):
    try:
        entries = sorted(
            (_resource_entry(path) for path in RESOURCES_DIR.iterdir() if path.is_file() and path.name.lower().endswith(".html")),
            key=lambda item: item["mtime"],
            reverse=True,
        )
        return {"files": entries}
    except OSError as error:
        raise HTTPException(status_code=500, detail=f"Failed to list resources: {error}") from None


@app.post("/api/resources")
async def upload_resource(body: dict = Body(...), user: CurrentUser = Depends(current_user)):
    filename = body.get("filename")
    content = body.get("content")
    if not filename or not content:
        raise HTTPException(status_code=400, detail="filename and content are required")
    safe_name = re.sub(r"[^a-zA-Z0-9_\-.]", "_", str(filename))
    if not safe_name.lower().endswith(".html"):
        raise HTTPException(status_code=400, detail="Filename must end with .html")
    if "/" in safe_name or "\\" in safe_name or safe_name in (".", ".."):
        raise HTTPException(status_code=400, detail="Invalid filename")
    if len(content) > MAX_BODY_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    target = RESOURCES_DIR / safe_name
    target.write_text(content, encoding="utf-8")
    return _resource_entry(target)


@app.delete("/api/resources/{filename}")
async def delete_resource(filename: str, user: CurrentUser = Depends(current_user)):
    safe_name = pathlib.Path(filename).name
    if not safe_name.lower().endswith(".html"):
        raise HTTPException(status_code=400, detail="Filename must end with .html")
    target = RESOURCES_DIR / safe_name
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    target.unlink()
    return {"ok": True, "file": safe_name}


# ==========================================================================
# AGENT (LangChain + LangGraph + DeepAgents, human-in-the-loop)
# ==========================================================================

app.include_router(agent_module.router)


# ==========================================================================
# STATIC FILES — mounted last so it never shadows an API route
# ==========================================================================

if RESOURCES_DIR.exists():
    app.mount("/resources", StaticFiles(directory=RESOURCES_DIR), name="resources")

if DIST_DIR.exists():
    if (DIST_DIR / "assets").exists():
        app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def spa(full_path: str, request: Request):
        if request.url.path.startswith("/api"):
            return JSONResponse(status_code=404, content={"error": "Not Found"})
        return FileResponse(DIST_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT") or 3000))
