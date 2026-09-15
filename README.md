# Paper2Sim

Feed it a paper. It extracts the testable claim, writes and runs a simulation to check that claim, and renders the result as a live, orbit-able 3D scene.

## Features

- **Claim → simulation pipeline**: ingest (arXiv / PDF / pasted text) → analyze → generate → execute (+ repair) → summarize with a verdict
- **Interactive 3D rendering**: scene.json drives Trig/Poly/Exp/Log/Matrix/Probability/Statistical/ODE/Physics/Trajectory views (Three.js + React Three Fiber)
- **Sandboxed execution**: AST import allowlist, rlimits, isolated env, no-network jail, output validation
- **Free-tier stack**: Groq → OpenRouter → Gemini → mock LLM fallback; SQLite job store (no Redis day one)
- **Equation tools**: LaTeX extraction, classification, breakdowns, storyboard plans

## Pipeline (5-stage)

```bash
# 1. Submit (exactly one of: text / arxiv id-or-URL / PDF ≤20MB)
curl -F 'text=We claim Monte Carlo pi converges at O(1/sqrt(N)).' http://localhost:8000/api/papers
# → {"job_id": "abc123..."}

# 2. Poll until terminal
curl http://localhost:8000/api/jobs/abc123...
# status: queued → ingesting → analyzing → generating → executing ⇄ repairing → summarizing → completed|failed
```

On `completed` you get the claim, `verdict` (supported / refuted / inconclusive), metrics, a validated `scene.json`, and `figure_*.png|gif` artifacts. After `MAX_REPAIR_ATTEMPTS` (default 3) failures the job goes `failed` with stderr surfaced. No API key? The mock provider runs a Monte Carlo π job end-to-end offline.

## Frontend Simulate UI

Sidebar → **Simulate**: same three inputs (arXiv / equation / PDF) plus a one-click sample. Watch the 5-stage stepper light up, then inspect the claim, verdict banner, live 3D scene (drag to rotate, scroll to zoom), metrics, generated code, and stdout/stderr (collapsed). Recent runs list below, served from `GET /api/jobs`.

## Env

Copy `.env.example` to `.env`. Keys: `GROQ_API_KEY` (+ `GROQ_MODEL`), `OPENROUTER_API_KEY` (+ `OPENROUTER_MODEL`, default `openrouter/free`), `GOOGLE_AI_STUDIO_API_KEY` (+ `GOOGLE_MODEL`). Storage: `DATA_DIR` (default `./data`), `JOBS_DB` (default `$DATA_DIR/jobs.db`). Tuning: `MAX_REPAIR_ATTEMPTS`, `SANDBOX_TIMEOUT_SECONDS`, `SANDBOX_MAX_MEMORY_MB`, `SANDBOX_NO_NET=0` (opt out of net jail), `SENTRY_DSN` (optional). Point the frontend at the backend with `VITE_API_URL` (same-origin `/api` needs nothing).

## Quick Start

### Frontend (Vercel)

```bash
cd frontend
npm install
npm run dev
```

### Backend (Render)

```bash
pip install -r requirements.txt
uvicorn api:app --reload
```

### Docker

```bash
docker build -t paper2sim .
docker run -p 8000:8000 paper2sim
```

## Architecture

```
paper2sim/
├── api.py                # FastAPI: extract + papers/jobs/artifacts routes
├── src/paper2sim/
│   ├── pipeline.py       # ingest → analyze → generate → execute ⇄ repair → summarize
│   ├── jobs.py           # SQLite job store + arXiv cache
│   ├── llm.py            # Groq → OpenRouter → Gemini → mock fallback
│   ├── sandbox.py        # rlimits + isolated env + no-net jail
│   ├── scene.py          # scene.json contract (pydantic, fail closed)
│   ├── allowlist.py      # AST import check
│   ├── prompts.py        # analyze/generate/repair/summarize prompts
│   ├── equations.py      # Equation parsing & classification
│   └── cli.py            # Command-line interface
├── frontend/           # React frontend (Vite)
│   └── src/
│       ├── components/ # UI, 3D surfaces, JobsView/JobDetail
│       ├── hooks/      # useExtract, useJobs (poll)
│       └── lib/        # api client, math engine
├── data/               # SQLite db + uploads + artifacts (gitignored)
└── tests/              # Backend tests (mock LLM, no keys needed)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/papers` | Submit paper (form: `text` \| `arxiv` \| `file` PDF) → `{job_id}` |
| GET | `/api/jobs` | Recent jobs (newest first) |
| GET | `/api/jobs/{id}` | Full job record (poll for live progress) |
| GET | `/api/jobs/{id}/artifacts/{fname}` | Generated `figure_*.png\|gif` |
| POST | `/api/extract` | Extract equations from text/URL |
| POST | `/api/extract/upload` | Extract equations from uploaded PDF |
| POST | `/api/breakdown` | Analyze equation parameters via LLM |
| POST | `/api/storyboard` | Generate animation storyboard |

## CLI Usage

```bash
# Extract equations
paper2sim extract --equation "y = mx + b"

# List model types
paper2sim models

# Start API server
paper2sim serve --port 8000
```

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest tests/ -v --cov=src

# Lint
ruff check src/
ruff format src/

# Type check
mypy src/ --ignore-missing-imports
```

## License

CC-BY-NC-SA-4.0
