# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Vue 3-based exam/quiz system for semester review. Supports single-choice, multiple-choice, and fill-in-the-blank questions, practice/exam modes, wrong answer tracking, and history management. Question banks are uploaded as `.md` files containing JSON code blocks.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:5173), opens browser automatically
npm run build    # Build for production
npm run preview  # Preview production build

# Backend (separate terminal)
cd server && node server.js  # Start Express server on port 3000
```

Vite proxies `/api` requests to `http://localhost:3000` (backend API).

## Architecture

### Backend (`server/`)

- **Express.js** server on port 3000
- **SQLite** via Node.js built-in `node:sqlite` (DatabaseSync), stored at `server/data/quiz.db`
- **Tables**: `banks`, `history`, `notes`
- **API endpoints**: `GET/POST /api/banks`, `GET/POST/DELETE /api/history`, `GET/POST/DELETE /api/notes`, `GET /api/export`, `POST /api/import`

### Frontend (`src/`)

**State Management (Pinia)**:
- **quizStore** (`src/stores/quiz.js`) — Core quiz state: current question, answers, mode (practice/exam), scoring, wrong answers. All computed stats (correctCount, accuracy, currentScore, etc.) are derived here.
- **bankStore** (`src/stores/bank.js`) — Bank list management: builtin banks (from MD files) and user-imported banks (from backend API).
- **historyStore** (`src/stores/history.js`) — Quiz history records with stats aggregation by bank.
- **noteStore** (`src/stores/note.js`) — Hierarchical notes tree (folders + notes), CRUD operations via backend API.
- **appStore** (`src/stores/app.js`) — App-level state: theme only.

**Routing (Vue Router, Hash History)**: `/` (home), `/banks`, `/quiz/:bankId`, `/result/:recordId`, `/history`, `/wrongbook`, `/settings`, `/notes`

**Utilities**:
- **parser.js** (`src/utils/parser.js`) — Fetches `/banks/banks.json` to get the list of built-in bank files, then loads each `.md` and extracts JSON from ` ```json ` code blocks via regex.
- **validator.js** (`src/utils/validator.js`) — Validates parsed JSON structure for both bank-level and per-question fields (type, options, answer format).
- **api.js** (`src/utils/api.js`) — HTTP client for backend REST API (banks, history, notes).
- **ai.js** (`src/utils/ai.js`) — AI analysis service (OpenAI/MiniMax compatible), used by AiPanel component.
- **storage.js** (`src/utils/storage.js`) — Compatibility shim that forwards to `api.js`. Previously used IndexedDB; now uses the Express backend.

### Question Data Model

```json
// Single choice
{ "id": 1, "type": "single", "question": "...", "options": [{"label": "A", "text": "..."}], "answer": "A", "score": 2 }

// Multiple choice
{ "id": 2, "type": "multi", "question": "...", "options": [{"label": "A", "text": "..."}], "answer": ["A", "C"], "score": 2 }

// Fill in blank
{ "id": 3, "type": "fill", "question": "...(__①__)", "blanks": 2, "answer": ["ans1", "ans2"], "score": 2 }
```

### Built-in Banks

Built-in banks live in `public/banks/` as `.md` files. A `public/banks/banks.json` manifest lists which banks to load:

```json
{ "banks": [{ "id": "os-filesystem", "name": "操作系统-文件系统", "file": "操作系统-文件系统.md" }] }
```

Each `.md` file contains a ` ```json ` code block with the full question bank JSON. The `parser.js` loads the manifest, then fetches each `.md` and extracts the JSON.

### Key Design Decisions

- **Dual bank sources**: Builtin banks are parsed from `public/banks/*.md` (via regex extraction); user-imported banks are stored in the backend SQLite database.
- **Quiz state is self-contained**: `quizStore` manages all quiz state — questions, answers, navigation, scoring, wrong-answer tracking. No server calls during a quiz session.
- **Mode behavior**: Practice mode allows shuffle; exam mode forces shuffle and locks in answers.
- **Hierarchical notes**: `noteStore` manages a tree of folders and notes, stored in backend SQLite (notes table with `parent_id` for tree structure).

## Design System

**Accent color**: Emerald Green (`#059669`) — eye-care/护眼 palette, calm and deep.
**Background**: Warm ambient radial gradients, dark theme default.
**Motion**: Stagger animations via `.stagger-N` classes, `cubic-bezier(0.16, 1, 0.3, 1)` easing throughout.
**Skeleton Loading**: `.skeleton` class with shimmer animation via `linear-gradient` + `background-size: 200%`.
**Reduced Motion**: `prefers-reduced-motion` media query disables all animations.
