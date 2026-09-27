# Contributing to Paper2Sim

Thank you for your interest in contributing!

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch
4. Make your changes
5. Submit a pull request

## Development Setup

```bash
# Clone
git clone https://github.com/your-username/paper2sim.git
cd paper2sim

# Backend
pip install -e ".[dev]"

# Frontend
cd frontend
npm install
```

### Running locally

```bash
# Terminal 1 — backend (port 8000)
uvicorn api:app --port 8000

# Terminal 2 — frontend (from frontend/)
npm run dev
```

The dev server proxies `/api` and `/health` to `127.0.0.1:8000`, so zero
config — no `.env` needed. Export `VITE_API_URL=...` in your shell to retarget
the proxy. Putting `VITE_API_URL` in `frontend/.env` instead bypasses the
proxy: the client picks it up via `import.meta.env` and calls the API directly
(it also sets the API base for production/preview builds).

## Code Style

- **Python**: Follow PEP 8, use ruff for formatting
- **TypeScript**: Follow the repo's oxlint rules (`cd frontend && npm run lint`)
- **Commit Messages**: Use conventional commits (`feat:`, `fix:`, `test:`, etc.)

## Testing

```bash
# Backend
pytest tests/ -v --cov=src

# Frontend
cd frontend
npm test
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Request review from maintainers

## Code of Conduct

Be respectful and inclusive. We're here to learn and build together.
