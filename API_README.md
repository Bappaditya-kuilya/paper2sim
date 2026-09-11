# Paper2Sim API

FastAPI backend for equation extraction and 3D visualization.

## Setup

```bash
pip install -e ".[dev]"
cp .env.example .env  # Add your GROQ_API_KEY
```

## Run

```bash
uvicorn api:app --reload
# or
python api.py
```

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/health/dependencies` | Check installed dependencies |
| POST | `/api/extract` | Extract equations from arXiv/text |
| POST | `/api/render` | Start async render job |
| GET | `/api/render/{id}/status` | Get render progress |
| GET | `/api/render/{id}/video` | Download rendered video |
| GET | `/api/render/{id}/stream` | SSE progress stream |
| POST | `/api/breakdown` | Break down equations via LLM |
| POST | `/api/storyboard` | Generate animation storyboard |

## Rate Limits

- `/api/extract`: 10 requests/minute
