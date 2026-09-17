# Paper2Sim — equation to plot

![Paper2Sim logo](frontend/public/logo.svg)

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

No accounts, no job queue, no server-side execution. Unplottable equations show an info card with a reason instead of a plot.

```
React (Vercel) ──same-origin rewrites──▶ FastAPI (Render, sync extract)
                                                 │  SQLite kv cache (arXiv 24h)
                                                 ▼
                                        regex extract → classify → shape
```

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/extract` | `{source: arxiv_url \| text, value}` → `{equations: [{latex, type}]}` |
| POST | `/api/extract/upload` | Multipart PDF → same shape |
| GET | `/api/arxiv?url=` | `{title, authors, equations}` for an arXiv URL |

## License

CC-BY-NC-SA-4.0
