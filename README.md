# Paper2Sim — equation to plot

Paste any STEM equation, arXiv id/URL, or PDF. It extracts the equations, lists them, plots the selected one in 2D by default, and offers a 3D viewer toggle with browser-local parameters.

**Live:** [paper2sim.vercel.app](https://paper2sim.vercel.app/) · **API:** [paper2sim.onrender.com](https://paper2sim.onrender.com/health)

## How it works

```
[equation | arXiv | PDF] → [extract + classify] → [list, pick one] → [2D plot] ⇆ [3D viewer]
```

| Input | What happens |
|---|---|
| Equation text | Regex extract + type classify, served instantly |
| arXiv id/URL | `.tex` source preferred, abstract fallback; result cached 24h |
| PDF upload | Text-block math scoring, first 30 pages / 200 candidates, ≤20MB |

No accounts, no job queue, no server-side execution. Unplottable equations show an info card with a reason — never hidden, never a misleading plot.

## Quickstart

```bash
# Backend (needs nothing but pip)
pip install -r requirements.txt
uvicorn api:app --reload            # http://localhost:8000/health

# Frontend
cd frontend && npm install && npm run dev   # VITE_API_URL=http://localhost:8000
```

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Sanity check → `{"status":"ok"}` |
| GET | `/health` | Health check (HEAD also answered for uptime monitors) |
| POST | `/api/extract` | `{source: arxiv_url \| text, value}` → `{equations: [{latex, type, label?}]}` |
| POST | `/api/extract/upload` | Multipart PDF → same shape. 400 non-PDF, 413 over 20MB |
| GET | `/api/arxiv?url=` | `{title, authors, equations}` for an arXiv URL |

Empty success is `200 {equations: []}`; failures are JSON (`400` bad id, `502` arXiv down, never cached).

## Env

| Variable | Where | Default | Required in production |
|---|---|---|---|
| `VITE_API_URL` | Frontend build | `''` (same-origin) | No — same-origin by default via Vercel rewrites (nothing required); set only to point at a non-proxied backend (local dev, e.g. `http://localhost:8000`) |
| `CORS_ORIGINS` | Backend | `http://localhost:5173` | No — only for direct cross-origin API users; same-origin prod traffic via rewrites needs no CORS entry |
| `DATA_DIR` | Backend | `./data` | No (SQLite arXiv cache lives here) |
| `CACHE_DB` | Backend | `$DATA_DIR/cache.db` | No (overrides cache path; tests point it at tmp) |
| `VITE_DEV_HOSTS` | Frontend dev only | — | No (comma-separated extra `vite dev` hosts; never affects `vite build`) |

## Architecture

```
React (Vercel) ──HTTPS + CORS──▶ FastAPI (Render, sync extract)
                                        │  SQLite kv cache (arXiv 24h)
                                        ▼
                              regex extract → classify → shape
                                              (math parser + SVG/Canvas 2D
                                               + three.js 3D run 100% in browser)
```

Prod frontend calls the API same-origin via Vercel rewrites (`/api/*`, `/health` → Render); browsers never issue cross-origin fetches.

## Develop

```bash
pip install -e ".[dev]"
pytest tests/ -q                    # backend, offline, real SQLite cache in tmp
ruff check src/ api.py && ruff format --check src/ api.py
mypy src/ --ignore-missing-imports
cd frontend && npm run typecheck && npm run lint && npm run test:ci && npm run build
```

## License

CC-BY-NC-SA-4.0
