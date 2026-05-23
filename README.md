# AI Code Reviewer

An open-source, self-hostable "mini CodeGuru" for your GitHub pull requests.

When a developer opens a PR, the app:

1. Receives a GitHub webhook for the `pull_request` event.
2. Pulls the unified diff from the GitHub API.
3. Sends it to **Groq + Llama 3.3 70B Versatile** with a structured-output prompt.
4. Saves the bugs, security issues, performance flags, code-quality
   findings, suggestions, and a 1–10 score to PostgreSQL — each issue
   tagged with a severity (CRITICAL/HIGH/MEDIUM/LOW) and a confidence %.
5. Optionally posts the review back as a PR comment.
6. Renders everything on a clean React + Tailwind dashboard you log
   into with GitHub OAuth, including a charts page (line / bar / pie),
   a Settings page, search & filter, dark/light mode, and real-time
   toast notifications when a new review lands.

---

## How to run it (the proper way)

This is the verified, working setup. Pick **A** (Windows, one click) or
**B** (manual, any OS).

### Prerequisites

Install these once:

| Tool                | Version  | Get it from                                        |
| ------------------- | -------- | -------------------------------------------------- |
| Python              | 3.9–3.13 | <https://www.python.org/downloads/> (tick "Add to PATH") |
| Node.js + npm       | 18+      | <https://nodejs.org/en/download>                   |
| A PostgreSQL DB     | 14+      | Free hosted: <https://neon.tech> (recommended)     |
| Groq API key        | free     | <https://console.groq.com>                         |
| GitHub OAuth App    | —        | See [Step 2](#step-2-create-a-github-oauth-app) below |

### Step 1 — Get the code and fill in the environment

```powershell
git clone <this-repo>
cd ai-code-reviewer

# Copy the env templates
copy backend\.env.example backend\.env       # Windows
# or:  cp backend/.env.example backend/.env  # macOS / Linux
```

Open `backend\.env` and fill in every value:

| Variable                | What goes here                                                         |
| ----------------------- | ---------------------------------------------------------------------- |
| `GROQ_API_KEY`          | From <https://console.groq.com> (starts with `gsk_…`)                 |
| `GITHUB_CLIENT_ID`      | From your GitHub OAuth App                                             |
| `GITHUB_CLIENT_SECRET`  | From your GitHub OAuth App                                             |
| `GITHUB_WEBHOOK_SECRET` | Any random string (paste the same one in GitHub's webhook UI later)    |
| `DATABASE_URL`          | Your Neon URL, e.g. `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require` |
| `JWT_SECRET`            | Any long random string                                                 |
| `FRONTEND_URL`          | `http://localhost:3000` for local dev                                  |

The frontend already ships with a `.env` pointing at
`REACT_APP_API_URL=http://localhost:8000`, so no extra work there.

### Step 2 — Create a GitHub OAuth App

1. Go to <https://github.com/settings/developers> → **OAuth Apps** → **New OAuth App**.
2. Fill in:
   - **Application name**: `AI Code Reviewer` (or anything)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:8000/auth/callback` (exact match required)
3. Click **Register application**, then **Generate a new client secret**.
4. Paste the **Client ID** and **Client Secret** into `backend\.env`.

### Step 3A — Run everything in one command (Windows)

From the project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\start_all.ps1
```

`start_all.ps1` will:

1. Open a new PowerShell window for the **backend** that runs
   `pip install -r requirements.txt` and then
   `uvicorn main:app --reload --host 0.0.0.0 --port 8000`.
2. Open a new PowerShell window for the **frontend** that runs
   `npm install` and then `npm start` (with `BROWSER=none` to avoid
   the auto-launch hang on Node 22).
3. Wait 10 seconds for both to boot.
4. Start `ngrok http 8000` in a new window (only if you've run
   `setup_ngrok.ps1` once — see [optional ngrok setup](#optional-set-up-ngrok-for-the-webhook)).
5. Print a banner with the public URL ready to paste into GitHub's
   webhook UI.

When the dashboard finishes compiling, open <http://localhost:3000> and
click **Sign in with GitHub**.

### Step 3B — Run backend + frontend manually (any OS)

Open **two terminals**.

**Terminal 1 — backend:**

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

On Windows you can also just double-click `backend\run.bat`, which does
the same thing.

**Terminal 2 — frontend:**

```bash
cd frontend
npm install
npm start
```

On Windows: double-click `frontend\run.bat` (it also sets
`BROWSER=none` to prevent the react-scripts auto-launch crash on Node 22+).

### Step 4 — Verify it's working

Open these and confirm:

- <http://localhost:8000/> → `{"service":"ai-code-reviewer","status":"ok"}`
- <http://localhost:8000/docs> → FastAPI Swagger UI
- <http://localhost:8000/health> → JSON with `status: "ok"`, DB latency, Groq status, uptime
- <http://localhost:3000> → the landing page

Click **Sign in with GitHub**, get redirected, authorize, land on the
empty dashboard. Done — the app is fully wired up.

### Optional — set up ngrok for the webhook

You only need this when you're ready to test the **PR-triggered review
flow** (so GitHub.com can POST to your local `/webhook`). For just
exploring the UI / login, skip this step.

```powershell
powershell -ExecutionPolicy Bypass -File .\setup_ngrok.ps1
```

The script will:

1. Download `ngrok.exe` (Windows AMD64) into the project root if not
   present — no admin rights needed.
2. Prompt once for your ngrok authtoken (free at
   <https://dashboard.ngrok.com/get-started/your-authtoken>) and save
   it in your ngrok config.
3. Start `ngrok http 8000` and print the public URL.

Then add the webhook in your repo:

1. Repo → **Settings → Webhooks → Add webhook**
2. **Payload URL**: `https://<your-ngrok-id>.ngrok-free.app/webhook`
3. **Content type**: `application/json`
4. **Secret**: same string as `GITHUB_WEBHOOK_SECRET` in your `.env`
5. **Which events**: *Let me select individual events* → check only
   **Pull requests**

Open a PR — the review will appear in the dashboard within a few seconds.

### TL;DR cheat sheet

| Goal                                | Command                                                            |
| ----------------------------------- | ------------------------------------------------------------------ |
| Print the 4-step checklist          | `start.bat`                                                        |
| Run the whole stack (Windows)       | `powershell -ExecutionPolicy Bypass -File .\start_all.ps1`         |
| Run backend only                    | `backend\run.bat`                                                  |
| Run frontend only                   | `frontend\run.bat`                                                 |
| Install + start ngrok (Windows)     | `powershell -ExecutionPolicy Bypass -File .\setup_ngrok.ps1`       |
| Backend health check                | <http://localhost:8000/health>                                     |
| API docs                            | <http://localhost:8000/docs>                                       |
| Dashboard                           | <http://localhost:3000>                                            |

---

## Tech stack

- **Backend** — Python 3.9+, FastAPI, SQLAlchemy 2, rotating file logger
- **LLM** — Groq API, model `llama-3.3-70b-versatile`, retry-with-backoff
- **DB** — PostgreSQL 14+ (local install or free hosted from
  [Neon](https://neon.tech)); auto-migrates new columns via
  `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- **Frontend** — React 18, TypeScript, Tailwind CSS, recharts
- **Auth** — GitHub OAuth → JWT
- **Tunneling** — ngrok (optional, only for the webhook)

---

## Project layout

```
ai-code-reviewer/
├── backend/
│   ├── main.py             # FastAPI app, logging, /health, startup hooks
│   ├── database.py         # SQLAlchemy engine + Neon SSL connect args
│   ├── models.py           # User + Review ORM models
│   ├── github_service.py   # GitHub REST API (async httpx)
│   ├── llm_service.py      # Groq client, prompt, retry, formatting
│   ├── auth_utils.py       # JWT helpers + current_user dependency
│   ├── rate_limit.py       # In-process per-repo rate limiter (10/min)
│   ├── logging_config.py   # File + console logging (logs/app.log)
│   ├── routes/
│   │   ├── auth.py         # /auth/github, /auth/callback, /auth/me
│   │   ├── reviews.py      # /reviews[/{id}[/export]], /stats, /usage/monthly
│   │   └── webhook.py      # POST /webhook with HMAC + rate limit
│   ├── requirements.txt
│   ├── run.bat             # One-click backend launcher (Windows)
│   ├── .env.example
│   └── logs/               # Created on first run
├── frontend/
│   ├── src/
│   │   ├── api.ts          # Tiny fetch wrapper for the FastAPI backend
│   │   ├── types.ts        # Shared TS types (Issue, Review, Stats, ...)
│   │   ├── App.tsx         # Routes + providers + ErrorBoundary
│   │   ├── index.tsx
│   │   ├── index.css       # Tailwind + dark/light overrides + page fade
│   │   ├── lib/issues.ts   # Issue normalization helpers
│   │   ├── contexts/       # ThemeProvider, ToastProvider
│   │   ├── components/     # Navbar, Dashboard, ReviewCard, Stats,
│   │   │                   # ScoreRing, SeverityBadge, Skeleton,
│   │   │                   # SearchFilterBar, EmptyState, ErrorBoundary,
│   │   │                   # Logo, DashboardPreview, Icons, ThemeToggle
│   │   └── pages/          # Home, Login, StatsPage, Settings
│   ├── public/
│   │   ├── index.html      # SEO meta, OG, favicon link
│   │   └── favicon.svg
│   ├── package.json
│   ├── tailwind.config.js  # darkMode: 'class' + brand/severity palette
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── run.bat             # One-click frontend launcher (Windows)
│   └── .env.example
├── start.bat               # Prints the 4-step start-up checklist
├── setup_ngrok.ps1         # Download + configure ngrok (Windows)
├── start_all.ps1           # One-shot: backend + frontend + ngrok (Windows)
├── CONTRIBUTING.md
└── README.md
```

---

## API quick reference

| Method | Path                            | Auth | Description                                       |
| ------ | ------------------------------- | ---- | ------------------------------------------------- |
| GET    | `/`                             | no   | Root info                                         |
| GET    | `/health`                       | no   | Deep health check (DB + Groq + uptime + counts)   |
| GET    | `/auth/github`                  | no   | Start GitHub OAuth flow                           |
| GET    | `/auth/callback`                | no   | OAuth callback → redirects to `/login?token=…`    |
| GET    | `/auth/me`                      | yes  | Current user                                      |
| GET    | `/reviews`                      | yes  | All reviews for the current user                  |
| GET    | `/reviews/{id}`                 | yes  | One review by id                                  |
| GET    | `/reviews/{id}/export`          | yes  | Downloadable Markdown report                      |
| GET    | `/stats`                        | yes  | Aggregate stats for the Stats component           |
| GET    | `/usage/monthly`                | yes  | Reviews processed this calendar month             |
| POST   | `/webhook`                      | sig  | GitHub PR webhook receiver (rate limited)         |

Authenticated requests require an `Authorization: Bearer <jwt>` header.
The JWT is issued by `/auth/callback` and stored in `localStorage` by
the React app.

---

## Troubleshooting

- **`pip install` fails with "Microsoft Visual C++ 14.0 or greater is required"**
  Your Python version doesn't have prebuilt wheels for one of the
  dependencies. The pinned versions in `requirements.txt`
  (`psycopg2-binary==2.9.10`, `asyncpg==0.30.0`) ship wheels for
  Python 3.9–3.13.
- **`npm start` exits immediately with code 1 and no error message**
  react-scripts 5 + Node 22 hits an auto-browser-launch crash on
  Windows. Use `backend\run.bat` / `frontend\run.bat` (they set
  `BROWSER=none`), or set the env var manually before `npm start`.
- **`could not connect to server: SSL connection is required`**
  Your `DATABASE_URL` is pointing at a hosted DB (like Neon) but doesn't
  include `?sslmode=require`. Add it.
- **`server does not support SSL`** (local Postgres)
  Append `?sslmode=disable` to `DATABASE_URL`.
- **`GROQ_API_KEY is not configured`**
  Set the key in `backend/.env` and restart the backend.
- **`Invalid webhook signature`**
  Make sure `GITHUB_WEBHOOK_SECRET` exactly matches the secret you typed
  into GitHub's webhook UI.
- **No reviews appearing**
  Open a PR (or push a new commit). The webhook only fires for the
  `opened`, `reopened`, `synchronize`, and `ready_for_review` actions —
  drafts and diffs larger than 10,000 chars are skipped on purpose.
- **`429 Too Many Requests`**
  The webhook hit the per-repo rate limit (10 calls / 60 seconds). The
  `Retry-After` header tells you when to try again.
- **CORS errors in the browser**
  Make sure `FRONTEND_URL` in the backend env matches the URL your
  React app is served from.
- **ngrok says "authtoken required"**
  Run `setup_ngrok.ps1` once and paste your token at the prompt.

---

## Logs

The backend writes structured logs to `backend/logs/app.log` (rotated
at 5 MB × 5 backups) and mirrors them to stderr. Every webhook
delivery, every Groq call (with timing in ms), and every error (with
full stack trace) ends up there. Tail it while debugging:

```bash
# Windows PowerShell
Get-Content backend\logs\app.log -Wait -Tail 50

# macOS / Linux
tail -f backend/logs/app.log
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the project layout, code
style, and step-by-step instructions for adding a new backend endpoint,
a new LLM analysis dimension, a new frontend page, or a new chart.

---

## License

MIT. Have fun.
