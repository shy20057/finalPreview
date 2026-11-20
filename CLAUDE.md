# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Vue 3-based exam/quiz system for semester review. Supports single-choice, multiple-choice, fill-in-the-blank and essay questions, practice/exam modes, wrong answer tracking, notes and history management. Question banks are imported as `.md` files containing JSON code blocks.

Two clients share one backend:
- **Web** (`src/`) — Vue 3 + Vite SPA, the original project.
- **Mobile** (`mobile/`) — uni-app Vue 3 (App-Vue) port, target platform Android. See [`docs/mobile/README.md`](docs/mobile/README.md); what changed and why is in [`docs/mobile/MIGRATION.md`](docs/mobile/MIGRATION.md).

## Commands

```bash
npm run dev      # Start dev server (http://localhost:5173), opens browser automatically
npm run build    # Build for production
npm run preview  # Preview production build
npm test         # node --test tests/*.test.mjs && python -m unittest discover -s tests -p test_*.py

# Backend (separate terminal)
pip install -r server/requirements.txt
python -m uvicorn app.main:app --app-dir server --port 3000   # FastAPI server on port 3000

# Mobile (HBuilderX classic project; import the mobile/ directory)
cd mobile && npm install && npm run build:app   # → mobile/unpackage/dist/build/app
```

Vite proxies `/api` requests to `http://localhost:3000` (backend API). The proxy only applies to the dev server — the mobile client always uses an absolute backend address (`http://10.0.2.2:3000` on the Android emulator).

Per `AGENTS.md`, do not run tests, builds or the emulator without explicit user approval.

## Architecture

### Backend (`server/`)

- **FastAPI** server on port 3000 — entry point `server/app/main.py`, run with `python -m uvicorn app.main:app --app-dir server --port 3000`
- **SQLite** via Python's stdlib `sqlite3` (WAL + explicit `BEGIN IMMEDIATE` transactions, no ORM), stored at `server/data/quiz.db`
- **Tables**: `users`, `banks`, `history`, `notes`, `note_tree`, `ai_configs`, `favorites`, `quiz_sessions`
- **Auth**: JWT (HS256) + bcrypt in `server/app/auth.py`; the signing secret stays in `server/data/auth-secret`, so tokens issued by the old Express backend still verify
- **API endpoints**: `GET/POST /api/banks`, `GET/POST/DELETE /api/history`, `GET/POST/DELETE /api/notes`, `GET /api/export`, `POST /api/import`, plus `/api/auth/*`, `/api/resources` and `/api/agent/*`

### Agent (`server/app/agent.py`)

- **Stack**: LangChain tools + DeepAgents (`create_deep_agent`) on a LangGraph graph; the LLM comes from the account's default AI config (`ChatOpenAI` with an OpenAI-compatible `base_url`)
- **Runtime context**: `AgentContext(user_id)` — the account id comes from the JWT, never from the model, so every tool query is account-scoped
- **Human-in-the-loop**: write tools are listed in `interrupt_on`, so the graph interrupts and waits for a decision — `approve` / `edit` (`edited_action`) / `reject` (optional reason). LangGraph wants exactly one decision per pending action request.
- **Checkpoints**: `AsyncSqliteSaver` (`server/data/checkpoints.db`) — a paused run survives a backend restart, and `GET /api/agent/history` restores it after a page reload
- **Endpoints**: `POST /api/agent/chat`, `POST /api/agent/resume`, `GET /api/agent/history`
- **Tools**: read-only `list_banks` / `get_bank_questions` / `list_wrong_questions` / `search_notes`; write `create_note` / `save_quiz_note` / `add_favorite` / `delete_note`

### Frontend (`src/`)

**State Management (Pinia)** — 9 stores:
- **quizStore** (`src/stores/quiz.js`) — Core quiz state: current question, answers, mode (practice/exam), scoring, wrong answers. All computed stats (correctCount, accuracy, currentScore, etc.) are derived here.
- **bankStore** (`src/stores/bank.js`) — Bank list management: the built-in guide bank plus user-imported banks (from backend API).
- **historyStore** (`src/stores/history.js`) — Quiz history records with stats aggregation by bank.
- **noteStore** (`src/stores/note.js`) — Hierarchical notes tree (folders + notes), CRUD operations via backend API.
- **wrongBookStore** (`src/stores/wrongBook.js`) — Aggregated wrong answers with mastered / removed flags.
- **favoriteStore** (`src/stores/favorite.js`) — Favourite questions.
- **authStore** (`src/stores/auth.js`) — Session token and current account.
- **appStore** (`src/stores/app.js`) — App-level state: theme and AI configuration.
- **agentStore** (`src/stores/agent.js`) — Agent conversation: thread id, messages, pending approvals.

**Routing (Vue Router, Hash History)**: `/` (home), `/banks`, `/quiz/:bankId`, `/result/:recordId`, `/history`, `/wrongbook`, `/favorites`, `/agent`, `/resources`, `/settings`, `/profile`, `/notes`, `/quiz-notes`, `/login`, `/register`. A `beforeEach` guard redirects unauthenticated users to `/login` with a `redirect` query.

**Utilities**:
- **parser.js** (`src/utils/parser.js`) — Extracts JSON from a ` ```json ` code block in an uploaded `.md` file, and holds the built-in "项目使用指南" bank (`builtinGuideBank`).
- **validator.js** (`src/utils/validator.js`) — Validates parsed JSON structure for both bank-level and per-question fields (type, options, answer format).
- **api.js** (`src/utils/api.js`) — HTTP client for backend REST API (banks, history, notes, agent).
- **ai.js** (`src/utils/ai.js`) — AI analysis service (OpenAI/MiniMax compatible), used by AiPanel component.
- **storage.js** (`src/utils/storage.js`) — Compatibility shim that forwards to `api.js`. Previously used IndexedDB; now uses the Express backend.
- **clearAccountState.js** (`src/utils/clearAccountState.js`) — Resets every store when the account or backend address changes.
- **db.js** (`src/utils/db.js`) — Legacy Dexie/IndexedDB layer. **No longer imported anywhere**; kept only as history. Do not use it in new code.

### Mobile client (`mobile/`)

Same stores and business rules as `src/stores/`, with platform APIs behind adapters:

- **utils/router.js** — vue-router-shaped shim over `uni.navigateTo` / `redirectTo` / `reLaunch` / `navigateBack`, plus `guardAuth()`.
- **utils/api.js** — `fetch` → `uni.request`; `localStorage` → `uni.getStorageSync` / `setStorageSync`; configurable backend origin.
- **utils/nativeFiles.js** — file import/export through the system document picker and `plus.io`.
- **utils/dialog.js** — `uni.showModal` / `showToast` / `setClipboardData`.
- **utils/accountScope.js** — per-account storage keys for local state (mastered flags, drafts, pending submissions).
- **renderjs view-layer components** — `HtmlContent`, `StarField`, `ScoreRing`, `ViewTransition`, `RichNoteEditor`, `UiBridge`; the logic layer has no DOM.

## Question Data Model

```json
// Single choice
{ "id": 1, "type": "single", "question": "...", "options": [{"label": "A", "text": "..."}], "answer": "A", "score": 2 }

// Multiple choice
{ "id": 2, "type": "multi", "question": "...", "options": [{"label": "A", "text": "..."}], "answer": ["A", "C"], "score": 2 }

// Fill in blank
{ "id": 3, "type": "fill", "question": "...(__①__)", "blanks": 2, "answer": ["ans1", "ans2"], "score": 2 }

// Essay
{ "id": 4, "type": "essay", "question": "...", "answer": "参考要点", "score": 5 }
```

## Built-in Banks

There is no `public/banks/` directory. The only built-in bank is `builtinGuideBank` ("项目使用指南 · 新手必读"), hardcoded in `src/utils/parser.js` and returned by `loadBuiltinBanks()`. It is flagged `builtin: true`, so the UI shows a "内置" tag and hides edit/delete.

All other banks are user-imported and live in the backend SQLite database.

## Key Design Decisions

- **Dual bank sources**: the built-in guide bank is hardcoded in `parser.js`; user-imported banks are stored in the backend SQLite database.
- **Quiz state is self-contained**: `quizStore` manages all quiz state — questions, answers, navigation, scoring, wrong-answer tracking. No server calls during a quiz session.
- **Mode behavior**: Practice mode allows shuffle; exam mode forces shuffle and locks in answers.
- **Hierarchical notes**: `noteStore` manages a tree of folders and notes, stored in backend SQLite (notes table with `parent_id` for tree structure).
- **One backend, two clients**: the mobile app never embeds the database; it talks to the same `server/` over HTTP and therefore needs a reachable address (emulator `10.0.2.2`, real device LAN IP, production HTTPS).
- **Agent writes need a human**: only read tools run unattended; anything that touches user data interrupts the LangGraph run and waits for an explicit decision in the web UI. The account id is injected as runtime context, so the model can never widen its own scope.

## Design System

**Accent color**: `#5b8acc` (blue) in the default `dark-blue` theme; the `light` theme uses `#d4a0a0` (dusty pink).
**Themes**: `dark-blue` (default) and `light`, selected via `[data-theme]` on `<html>` (web) or `.theme-*` classes (mobile).
**Background**: Warm ambient radial gradients plus a themed photo (`public/assets/images/starry-night.jpg` / `sunflowers.jpg`).
**Motion**: Stagger animations via `.stagger-N` classes, `cubic-bezier(0.16, 1, 0.3, 1)` easing throughout.
**Skeleton Loading**: `.skeleton` class with shimmer animation via `linear-gradient` + `background-size: 200%`.
**Reduced Motion**: `prefers-reduced-motion` media query disables all animations.
