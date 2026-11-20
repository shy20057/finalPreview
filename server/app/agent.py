"""Study-coach agent built on LangChain tools + DeepAgents (LangGraph).

Human-in-the-loop: every tool that mutates the user's data is registered in
``interrupt_on``, so LangGraph pauses the run and asks the caller to approve,
edit or reject the call before it executes. Reads never interrupt.

State lives in a SQLite checkpoint, so a paused run survives a server restart
and the browser can close and come back to it.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException
from langchain.tools import ToolRuntime, tool
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph
from langgraph.types import Command
from pydantic import BaseModel

from deepagents import create_deep_agent
from deepagents.graph import DeepAgentState

from . import db
from .auth import CurrentUser, current_user

router = APIRouter()

#: Tools that write to the user's data — each one needs explicit human approval.
GATED_TOOLS = ("create_note", "save_quiz_note", "add_favorite", "delete_note")

DECISION_TYPES = ("approve", "reject", "edit", "respond")

_checkpointer: Any = None

#: Compiled graphs are reusable — LangGraph keeps the run state in the
#: checkpointer, keyed by thread id. Rebuilding one per request would also
#: rebuild the httpx client behind ChatOpenAI and leak its sockets.
_AGENT_CACHE: dict[tuple, Any] = {}
_AGENT_CACHE_MAX = 32

# Reuse DeepAgents' exact message reducer for both full snapshots and deltas.
# Building the state schema creates no model and does not invoke the agent.
_HISTORY_MESSAGES_CHANNEL = StateGraph(DeepAgentState).channels["messages"]


def set_checkpointer(saver: Any) -> None:
    global _checkpointer
    _checkpointer = saver
    _AGENT_CACHE.clear()  # the cached graphs hold the old checkpointer


class AgentContext(BaseModel):
    """Runtime context handed to every tool (keeps the user's id out of the LLM's hands)."""

    user_id: int


# --------------------------------------------------------------------------
# Read-only tools
# --------------------------------------------------------------------------


@tool
def list_banks(runtime: ToolRuntime) -> str:
    """列出用户的全部题库：题库名、科目、题目数量。"""
    records = db.rows(
        "SELECT id, name, subject, questions FROM banks WHERE userId = ? ORDER BY createdAt DESC",
        (runtime.context.user_id,),
    )
    result = [
        {
            "id": record["id"],
            "name": record["name"],
            "subject": record["subject"] or "",
            "questionCount": len(db.loads(record["questions"], [])),
        }
        for record in records
    ]
    return json.dumps(result, ensure_ascii=False)


@tool
def get_bank_questions(runtime: ToolRuntime, bank_id: int, keyword: str = "", limit: int = 20) -> str:
    """读取某个题库里的题目。给了 keyword 就只返回题干包含该关键词的题目。"""
    record = db.row("SELECT id, name, questions FROM banks WHERE id = ? AND userId = ?", (bank_id, runtime.context.user_id))
    if not record:
        return json.dumps({"error": "题库不存在或不属于当前用户"}, ensure_ascii=False)
    questions = db.loads(record["questions"], [])
    if keyword:
        questions = [q for q in questions if keyword in str(q.get("question", ""))]
    return json.dumps(
        {"bankId": record["id"], "bankName": record["name"], "questions": questions[: max(1, limit)]},
        ensure_ascii=False,
    )


@tool
def list_wrong_questions(runtime: ToolRuntime, limit: int = 20) -> str:
    """列出用户在练习/考试中做错的题目（按最近出现顺序去重）。"""
    records = db.rows(
        "SELECT bankId, bankName, date, wrongQuestions FROM history WHERE userId = ? ORDER BY date DESC",
        (runtime.context.user_id,),
    )
    seen: set[Any] = set()
    wrong: list[dict] = []
    for record in records:
        for question in db.loads(record["wrongQuestions"], []):
            key = (record["bankId"], question.get("id"))
            if key in seen:
                continue
            seen.add(key)
            wrong.append(
                {
                    "bankId": record["bankId"],
                    "bankName": record["bankName"],
                    "lastWrongAt": record["date"],
                    "question": question,
                }
            )
            if len(wrong) >= max(1, limit):
                return json.dumps(wrong, ensure_ascii=False)
    return json.dumps(wrong, ensure_ascii=False)


@tool
def search_notes(runtime: ToolRuntime, keyword: str = "", limit: int = 20) -> str:
    """搜索用户写的笔记（笔记树里的笔记 + 挂在题目上的练习笔记）。"""
    user_id = runtime.context.user_id
    tree = db.rows(
        "SELECT id, parent_id, title, content, type FROM note_tree WHERE userId = ? ORDER BY sort_order ASC, id ASC",
        (user_id,),
    )
    quiz = db.rows(
        """SELECT n.id, n.bankId, n.questionId, n.content, b.name AS bankName
           FROM notes n LEFT JOIN banks b ON n.bankId = b.id AND b.userId = n.userId
           WHERE n.userId = ? AND n.questionId IS NOT NULL""",
        (user_id,),
    )

    def matches(*fields: Any) -> bool:
        return not keyword or any(keyword in str(field or "") for field in fields)

    results = [
        {"kind": "note", "id": item["id"], "title": item["title"], "content": item["content"], "type": item["type"]}
        for item in tree
        if matches(item["title"], item["content"])
    ]
    results += [
        {
            "kind": "quizNote",
            "id": item["id"],
            "title": f"{item['bankName'] or '题目'} #{item['questionId']}",
            "content": item["content"],
            "bankId": item["bankId"],
            "questionId": item["questionId"],
        }
        for item in quiz
        if matches(item["content"], item["bankName"])
    ]
    return json.dumps(results[: max(1, limit)], ensure_ascii=False)


# --------------------------------------------------------------------------
# Write tools — every one of these interrupts for human approval
# --------------------------------------------------------------------------


@tool
def create_note(runtime: ToolRuntime, title: str, content: str) -> str:
    """在用户的笔记树里新建一条笔记（需要用户确认后才会真正写入）。"""
    now = db.now_iso()
    note_id = db.run(
        """INSERT INTO note_tree (parent_id, title, type, content, sort_order, createdAt, updatedAt, userId)
           VALUES (NULL, ?, 'note', ?, 0, ?, ?, ?)""",
        (title or "未命名", content or "", now, now, runtime.context.user_id),
    )
    return json.dumps({"ok": True, "noteId": note_id, "title": title or "未命名"}, ensure_ascii=False)


@tool
def save_quiz_note(runtime: ToolRuntime, bank_id: int, question_id: int, content: str) -> str:
    """把一条笔记保存到某道题上（bank_id + question_id，需要用户确认后才会真正写入）。"""
    now = db.now_iso()
    db.run(
        """INSERT INTO notes (bankId, questionId, content, createdAt, updatedAt, userId)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(userId, bankId, questionId) DO UPDATE SET
             content = excluded.content, updatedAt = excluded.updatedAt""",
        (bank_id, question_id, content or "", now, now, runtime.context.user_id),
    )
    return json.dumps({"ok": True, "bankId": bank_id, "questionId": question_id}, ensure_ascii=False)


@tool
def add_favorite(runtime: ToolRuntime, bank_id: int, question_id: int) -> str:
    """把某道题加入用户的收藏夹（需要用户确认后才会真正写入）。"""
    user_id = runtime.context.user_id
    bank = db.row("SELECT id, name, questions FROM banks WHERE id = ? AND userId = ?", (bank_id, user_id))
    if not bank:
        return json.dumps({"error": "题库不存在或不属于当前用户"}, ensure_ascii=False)
    question = next((q for q in db.loads(bank["questions"], []) if q.get("id") == question_id), None)
    if not question:
        return json.dumps({"error": "题库里没有这道题"}, ensure_ascii=False)
    existing = db.row(
        "SELECT id FROM favorites WHERE userId = ? AND bankId = ? AND questionId = ?", (user_id, bank_id, question_id)
    )
    if existing:
        return json.dumps({"ok": True, "favoriteId": existing["id"], "alreadyExists": True}, ensure_ascii=False)
    now = db.now_iso()
    favorite_id = db.run(
        "INSERT INTO favorites (bankId, questionId, bankName, questionData, createdAt, userId) VALUES (?, ?, ?, ?, ?, ?)",
        (bank_id, question_id, bank["name"], db.dumps(question), now, user_id),
    )
    return json.dumps({"ok": True, "favoriteId": favorite_id}, ensure_ascii=False)


@tool
def delete_note(runtime: ToolRuntime, note_id: int) -> str:
    """删除笔记树里的一条笔记（连同它的子文件夹，需要用户确认后才会真正执行）。"""
    user_id = runtime.context.user_id
    note = db.row("SELECT id, title FROM note_tree WHERE id = ? AND userId = ?", (note_id, user_id))
    if not note:
        return json.dumps({"error": "笔记不存在"}, ensure_ascii=False)

    pending = [note_id]
    while True:
        children = db.rows(
            "SELECT id FROM note_tree WHERE parent_id = ? AND userId = ?", (pending[-1], user_id)
        )
        if not children:
            break
        pending.extend(child["id"] for child in children)
    placeholders = ",".join("?" * len(pending))
    db.run(f"DELETE FROM note_tree WHERE id IN ({placeholders}) AND userId = ?", (*pending, user_id))
    return json.dumps({"ok": True, "deletedCount": len(pending), "title": note["title"]}, ensure_ascii=False)


READ_TOOLS = [list_banks, get_bank_questions, list_wrong_questions, search_notes]
WRITE_TOOLS = [create_note, save_quiz_note, add_favorite, delete_note]
ALL_TOOLS = READ_TOOLS + WRITE_TOOLS


# --------------------------------------------------------------------------
# Agent wiring
# --------------------------------------------------------------------------

SYSTEM_PROMPT = """你是「期末复习题库系统」里的学习教练 Agent，服务于正在备考的大学生。

工作方式：
1. 只通过工具访问用户数据。工具返回什么就基于什么作答，绝不编造题目、答案或用户数据。
2. 先用只读工具（list_banks / list_wrong_questions / search_notes / get_bank_questions）搞清楚用户的情况，再给建议。
3. 讲解题目时用中文，按「核心考点 → 答案解析 → 选项分析 → 易错点 → 记忆技巧」组织；不要复述题干原文。
4. 用户要你新建/保存笔记、收藏题目、删除笔记时，必须调用对应工具（create_note / save_quiz_note /
   add_favorite / delete_note），不要只用文字说"已完成"。写工具会中断等待用户点头，这是正常流程，不是失败；
   参数要填完整、可直接执行，调用前先用一句话说明你打算做什么、为什么做。
5. 用户拒绝之后不要重复同一个调用，改问用户下一步想做什么。
6. 回答简洁、结构清晰，用 Markdown。"""

ANALYST_SUBAGENT = {
    "name": "题目讲解专家",
    "description": "深入拆解某一道具体题目：核心考点、逐项分析选项、辨析易错选项、给出记忆技巧。需要把一道题讲透时调用。",
    "system_prompt": """你是题目讲解专家。拿到一道题后：
1. 先说这道题真正考的知识点是什么。
2. 逐项分析每个选项为什么对、为什么错。
3. 点出最容易被选错的地方以及错因。
4. 给一句能记住的总结。
用中文，Markdown，不要复述题干。""",
    "tools": [get_bank_questions, search_notes],
}


def build_model(config: dict) -> ChatOpenAI:
    base = (config.get("baseUrl") or "").strip().rstrip("/")
    # MiniMax's native route is /v1/text/chatcompletion_v2; ChatOpenAI appends
    # /chat/completions itself, so strip the native suffix and use the
    # OpenAI-compatible route instead.
    for suffix in ("/text/chatcompletion_v2", "/chat/completions"):
        if base.endswith(suffix):
            base = base[: -len(suffix)]
            break
    return ChatOpenAI(
        model=config["model"],
        api_key=config["apiKey"],
        base_url=base or None,
        temperature=0.7,
        # httpx2's brotli decoder is broken against the installed Brotli build
        # ("process() takes no keyword arguments"), and providers answer with
        # brotli by default. Asking for gzip keeps the response decodable.
        default_headers={"Accept-Encoding": "gzip"},
    )


def build_agent(model: ChatOpenAI):
    return create_deep_agent(
        model=model,
        tools=ALL_TOOLS,
        system_prompt=SYSTEM_PROMPT,
        subagents=[ANALYST_SUBAGENT],
        interrupt_on={name: True for name in GATED_TOOLS},
        checkpointer=_checkpointer,
        context_schema=AgentContext,
    )


def _require_config(user_id: int) -> dict:
    config = db.row("SELECT * FROM ai_configs WHERE isDefault = 1 AND userId = ? LIMIT 1", (user_id,))
    if not config:
        config = db.row("SELECT * FROM ai_configs WHERE userId = ? ORDER BY id ASC LIMIT 1", (user_id,))
    if not config:
        raise HTTPException(status_code=400, detail="尚未配置 AI 厂商，请先到「设置」里添加并设为默认")
    if not (config.get("apiKey") or "").strip() or not (config.get("model") or "").strip():
        raise HTTPException(status_code=400, detail="AI 配置不完整，请到「设置」里补全 API Key 和模型名")
    return dict(config)


def get_agent(user_id: int):
    config = _require_config(user_id)
    key = (
        user_id,
        config.get("baseUrl") or "",
        config.get("model") or "",
        config.get("apiKey") or "",
        id(_checkpointer),
    )
    agent = _AGENT_CACHE.get(key)
    if agent is None:
        if len(_AGENT_CACHE) >= _AGENT_CACHE_MAX:
            _AGENT_CACHE.pop(next(iter(_AGENT_CACHE)))
        agent = build_agent(build_model(config))
        _AGENT_CACHE[key] = agent
    return agent


def _graph_config(user: CurrentUser, thread_id: str) -> dict:
    # Namespacing by user id means one account can never resume another's thread.
    return {"configurable": {"thread_id": f"u{user.id}:{thread_id}"}}


def serialize_messages(messages: Any) -> list[dict]:
    roles = {"human": "user", "ai": "assistant", "tool": "tool", "system": "system"}
    result = []
    for message in messages or []:
        content = getattr(message, "content", "")
        if not isinstance(content, str):
            content = json.dumps(content, ensure_ascii=False)
        entry = {
            "id": str(getattr(message, "id", "") or ""),
            "role": roles.get(getattr(message, "type", ""), "assistant"),
            "content": content,
        }
        tool_calls = getattr(message, "tool_calls", None)
        if tool_calls:
            entry["toolCalls"] = [{"name": call.get("name"), "args": call.get("args", {})} for call in tool_calls]
        name = getattr(message, "name", None)
        if name:
            entry["name"] = name
        result.append(entry)
    return result


def _collect_pending(raw: Any) -> list[dict]:
    """Normalise the interrupt payload into the list of approvals the UI shows.

    ``raw`` is the ``__interrupt__`` channel: a tuple of ``Interrupt`` objects
    right after a run, or the same tuple stored inside a checkpoint.
    """
    pending: list[dict] = []
    items = raw if isinstance(raw, (list, tuple)) else [raw]
    for item in items:
        value = getattr(item, "value", item)
        if not isinstance(value, dict):
            continue
        configs = value.get("review_configs") or []
        for index, request in enumerate(value.get("action_requests") or []):
            allowed = DECISION_TYPES
            if index < len(configs):
                allowed = tuple(configs[index].get("allowed_decisions") or DECISION_TYPES)
            pending.append(
                {
                    "id": str(index),
                    "name": request.get("name"),
                    "args": request.get("args") or {},
                    "description": request.get("description") or "",
                    "allowedDecisions": list(allowed),
                }
            )
    return pending


def _pending_from_checkpoint(saved: Any) -> list[dict]:
    """Recover the pending approvals of a paused run from a saved checkpoint.

    LangGraph stores the interrupt either as a channel value or as a pending
    write, depending on how the graph was checkpointed — check both.
    """
    values = saved.checkpoint.get("channel_values") or {}
    pending = _collect_pending(values.get("__interrupt__"))
    if pending:
        return pending
    for write in saved.pending_writes or []:
        # PendingWrite == (task_id, channel, value)
        if len(write) >= 3 and write[1] == "__interrupt__":
            pending.extend(_collect_pending(write[2]))
    return pending


async def _messages_from_checkpoint(saved: Any) -> list:
    """Hydrate messages without an AI configuration or a model invocation.

    DeepAgents stores messages as a DeltaChannel: most checkpoints deliberately
    omit them from channel_values. Replay the saver-provided ancestor writes
    with the same reducer used by the running agent, including removal/reset
    semantics, rather than treating a missing snapshot as an empty conversation.
    """
    values = saved.checkpoint.get("channel_values") or {}
    if "messages" in values:
        channel = _HISTORY_MESSAGES_CHANNEL.from_checkpoint(values["messages"])
    else:
        histories = await _checkpointer.aget_delta_channel_history(
            config=saved.config, channels=["messages"]
        )
        history = histories.get("messages") or {}
        channel = _HISTORY_MESSAGES_CHANNEL.from_checkpoint(history.get("seed", []))
        channel.replay_writes(history.get("writes") or [])
    return channel.get() or []


def render(result: dict, thread_id: str) -> dict:
    pending = _collect_pending(result.get("__interrupt__"))
    return {
        "threadId": thread_id,
        "status": "awaiting_approval" if pending else "done",
        "messages": serialize_messages(result.get("messages")),
        "pending": pending,
    }


def _normalize_decisions(decisions: Any) -> list[dict]:
    if not isinstance(decisions, list) or not decisions:
        raise HTTPException(status_code=400, detail="decisions 必须是非空数组")
    normalized = []
    for decision in decisions:
        if not isinstance(decision, dict):
            raise HTTPException(status_code=400, detail="每个 decision 必须是对象")
        kind = decision.get("type")
        if kind not in DECISION_TYPES:
            raise HTTPException(status_code=400, detail=f"不支持的决策类型：{kind}")
        if kind == "edit":
            edited = decision.get("edited_action")
            if not isinstance(edited, dict) or not edited.get("name"):
                raise HTTPException(status_code=400, detail="edit 决策必须提供 edited_action（含 name 与 args）")
            normalized.append({"type": "edit", "edited_action": {"name": edited["name"], "args": edited.get("args") or {}}})
        elif kind == "respond":
            normalized.append({"type": "respond", "message": decision.get("message") or ""})
        elif kind == "reject":
            normalized.append({"type": "reject", "message": decision.get("message") or ""})
        else:
            normalized.append({"type": "approve"})
    return normalized


@router.post("/api/agent/chat")
async def agent_chat(body: dict = Body(...), user: CurrentUser = Depends(current_user)) -> dict:
    message = str(body.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="message 不能为空")
    thread_id = str(body.get("threadId") or body.get("thread_id") or "").strip() or uuid.uuid4().hex
    agent = get_agent(user.id)
    result = await agent.ainvoke(
        {"messages": [{"role": "user", "content": message}]},
        _graph_config(user, thread_id),
        context=AgentContext(user_id=user.id),
    )
    return render(result, thread_id)


@router.post("/api/agent/resume")
async def agent_resume(body: dict = Body(...), user: CurrentUser = Depends(current_user)) -> dict:
    thread_id = str(body.get("threadId") or body.get("thread_id") or "").strip()
    if not thread_id:
        raise HTTPException(status_code=400, detail="threadId 不能为空")
    decisions = _normalize_decisions(body.get("decisions"))
    agent = get_agent(user.id)
    try:
        result = await agent.ainvoke(
            Command(resume={"decisions": decisions}),
            _graph_config(user, thread_id),
            context=AgentContext(user_id=user.id),
        )
    except ValueError as exc:
        # LangGraph wants exactly one decision per pending action request.
        if "human decisions" in str(exc):
            raise HTTPException(status_code=400, detail="审批决定的数量必须与待确认的操作数量一致") from None
        raise
    return render(result, thread_id)


@router.get("/api/agent/threads")
async def agent_threads(user: CurrentUser = Depends(current_user)) -> dict:
    """List this user's saved root conversations, including pre-existing ones."""
    if _checkpointer is None:
        return {"threads": []}

    # Enumerate IDs without deserializing every historical checkpoint. The saver
    # is the AsyncSqliteSaver installed by main.py; subagent namespaces are not
    # separate conversations. Release its lock before calling aget_tuple below.
    await _checkpointer.setup()
    prefix = f"u{user.id}:"
    async with _checkpointer.lock, _checkpointer.conn.execute(
        """SELECT thread_id, MAX(checkpoint_id) AS latest
           FROM checkpoints
           WHERE thread_id GLOB ? AND checkpoint_ns = ''
           GROUP BY thread_id ORDER BY latest DESC""",
        (prefix + "*",),
    ) as cursor:
        records = await cursor.fetchall()

    threads = []
    for record in records:
        thread_id = record[0][len(prefix):]
        saved = await _checkpointer.aget_tuple(_graph_config(user, thread_id))
        if not saved or not saved.checkpoint:
            continue
        messages = serialize_messages(await _messages_from_checkpoint(saved))
        first_user = next((m for m in messages if m["role"] == "user" and m["content"].strip()), None)
        if first_user is None:
            continue
        pending = _pending_from_checkpoint(saved)
        threads.append({
            "threadId": thread_id,
            "title": " ".join(first_user["content"].split())[:60],
            "updatedAt": saved.checkpoint.get("ts") or "",
            "status": "awaiting_approval" if pending else "done",
        })
    return {"threads": threads}


@router.get("/api/agent/history")
async def agent_history(threadId: str, user: CurrentUser = Depends(current_user)) -> dict:
    """Restore a conversation after a page reload — works even without an AI config."""
    thread_id = str(threadId or "").strip()
    if not thread_id:
        raise HTTPException(status_code=400, detail="threadId 不能为空")
    if _checkpointer is None:
        return {"threadId": thread_id, "status": "done", "messages": [], "pending": []}
    saved = await _checkpointer.aget_tuple(_graph_config(user, thread_id))
    if not saved or not saved.checkpoint:
        return {"threadId": thread_id, "status": "done", "messages": [], "pending": []}
    # A paused run keeps its interrupt in the checkpoint, so the approval card
    # survives a page reload.
    pending = _pending_from_checkpoint(saved)
    return {
        "threadId": thread_id,
        "status": "awaiting_approval" if pending else "done",
        "messages": serialize_messages(await _messages_from_checkpoint(saved)),
        "pending": pending,
    }
