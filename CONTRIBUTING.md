# Contributing to AI Code Reviewer

Thanks for your interest in improving this project. The codebase is
small on purpose -- you should be able to land a meaningful feature in
a single afternoon.

This document explains the layout, the conventions, and how to add new
backend endpoints, new frontend pages, new LLM analysis dimensions, or
new chart panels.

---

## 1. Project layout (quick refresher)

```
ai-code-reviewer/
├── backend/
│   ├── main.py             # FastAPI app, /health, startup hooks
│   ├── database.py         # SQLAlchemy engine + session factory
│   ├── models.py           # User + Review ORM models
│   ├── github_service.py   # GitHub REST API helpers
│   ├── llm_service.py      # Groq client, prompt, retry, formatting
│   ├── auth_utils.py       # JWT helpers + current_user dependency
│   ├── rate_limit.py       # In-process per-repo rate limiter
│   ├── logging_config.py   # File + console logging
│   └── routes/
│       ├── auth.py         # /auth/* (GitHub OAuth)
│       ├── reviews.py      # /reviews, /reviews/{id}, /reviews/{id}/export, /stats, /usage/monthly
│       └── webhook.py      # POST /webhook (GitHub PR events)
└── frontend/
    └── src/
        ├── api.ts            # Tiny fetch wrapper around the backend
        ├── types.ts          # All shared TS types
        ├── lib/issues.ts     # Issue normalization helpers
        ├── contexts/         # Theme + Toast providers
        ├── components/       # Reusable building blocks (Navbar, ReviewCard, ...)
        └── pages/            # Top-level routes (Home, Login, StatsPage, Settings)
```

---

## 2. Local development setup

1. `python -m venv .venv && .venv/Scripts/activate` (or `source .venv/bin/activate`).
2. `pip install -r backend/requirements.txt`.
3. Copy `backend/.env.example` to `backend/.env` and fill in your keys.
4. In one terminal: `cd backend && uvicorn main:app --reload`.
5. In another terminal: `cd frontend && npm install && npm start`.

The backend hot-reloads on file change; the frontend hot-reloads via
webpack-dev-server.

---

## 3. Adding a new backend endpoint

Most endpoints live under one of the existing routers in `backend/routes/`.
To add `GET /me/preferences`:

1. Pick the most relevant router file (or create a new one in
   `routes/` and export the `APIRouter` from `routes/__init__.py`'s
   convention -- import it in `main.py`).
2. Add the route function. Use `Depends(get_current_user)` for auth and
   `Depends(get_db)` for a SQLAlchemy session. Add a module-level
   `logger = logging.getLogger(__name__)` and call `logger.info()` for
   every meaningful action.
3. Update `frontend/src/api.ts` with a new method on the `api` object,
   and add a TypeScript type for the response in `frontend/src/types.ts`.
4. Consume it from a component / page.

Conventions to follow:

* All endpoints return JSON-serializable Python objects (plain dicts).
* Validate inputs explicitly and raise `HTTPException(4xx, "message")`
  on bad data -- avoid relying on Pydantic for one-off route inputs.
* Log every failure with `logger.exception(...)` so the stack trace
  ends up in `backend/logs/app.log`.

---

## 4. Adding a new dimension to the LLM review

The LLM prompt lives in `llm_service.py` as `SYSTEM_PROMPT`. Each
analysis dimension (bugs, security, performance, code quality,
suggestions) is a top-level JSON array of issue objects shaped like:

```json
{ "description": str, "severity": "CRITICAL|HIGH|MEDIUM|LOW", "confidence": 0..100 }
```

To add e.g. "accessibility" reviews:

1. Add `accessibility_issues` to `ISSUE_CATEGORIES`.
2. Update `SYSTEM_PROMPT` so the model is told to emit the new field.
3. Add a `accessibility_issues = Column(JSON, default=list)` to the
   `Review` model. Then list the column in
   `main._ensure_review_columns()` so it gets ALTERed in on existing
   deployments.
4. Update `_serialize` in `routes/reviews.py` to include the new field.
5. On the frontend, extend `Review` in `src/types.ts`, add a section
   to `ReviewCard.tsx`, and include it in the pie chart in `StatsPage`.

---

## 5. Adding a new frontend page

1. Create `src/pages/MyPage.tsx`. Wrap the body in a `<div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">` to match the rest of the app.
2. Add a `<Route path="/my" element={user ? <MyPage /> : <Navigate to="/login" replace />} />` to `src/App.tsx` (wrap with `<ErrorBoundary>`).
3. Add a `<NavLink to="/my">` to `src/components/Navbar.tsx`.
4. If you need toasts, call `const { push } = useToast()`. If you need
   theme info, call `const { theme, toggleTheme } = useTheme()`.

---

## 6. Adding a new chart to /stats

`src/pages/StatsPage.tsx` builds three charts today. To add a fourth:

1. Add a `build<MyMetric>` function that maps `Review[]` into the
   shape recharts expects.
2. Wrap the chart in the local `<ChartCard>` helper. Use
   `<ResponsiveContainer height={260}>` so it shrinks gracefully on
   mobile.
3. Pull theme-aware colors from the existing `CHART_AXIS_STYLE` and
   `CHART_GRID_COLOR` constants.

---

## 7. Code style

* Backend: PEP 8, type hints everywhere, JSDoc-style docstrings on
  every public function. Prefer `from __future__ import annotations`
  in new files.
* Frontend: TypeScript, no implicit `any`, prefer functional
  components with hooks. New components live in `src/components/`,
  pages in `src/pages/`, plain helpers in `src/lib/`.
* Use Tailwind utility classes -- avoid writing global CSS unless the
  rule can't be expressed inline.

---

## 8. Tests

There's no formal test suite yet. If you add complex logic (LLM
parsing, rate limiting, the dashboard filter pipeline), please drop a
test next to the file using:

* Backend: `pytest` (add `pytest` to a `requirements-dev.txt`).
* Frontend: `npm test` (CRA ships with Jest).

---

## 9. Commit / PR conventions

* One feature per PR, small enough to review in 10 minutes.
* Title format: `area: short description` (e.g. `webhook: skip drafts`).
* Include a screenshot or short clip for any visible UI change.
* Run `npm run build` and `python -m compileall backend` locally
  before pushing to catch typos.

Thanks again for contributing!
