# Paper2Sim

Extract equations from academic papers and visualize them as interactive 3D visualizations in the browser.

## Features

- **Equation Extraction**: Parse LaTeX and plain text equations from arXiv papers, PDFs, or direct input
- **Smart Classification**: Automatically detect equation types (trigonometric, polynomial, ODE, etc.)
- **Interactive 3D Rendering**: Real-time 3D visualizations using Three.js and React Three Fiber
- **Physics Simulations**: Force fields, spring systems, ideal gas, Coulomb interactions
- **Statistical Visualizations**: Distribution charts (Gaussian, Binomial, Poisson)
- **Mathematical Tools**: Slope fields, matrix operations, probability diagrams

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
uvicorn paper2sim.api:app --reload
```

### Docker

```bash
docker build -t paper2sim .
docker run -p 8000:8000 paper2sim
```

## Architecture

```
paper2sim/
├── src/paper2sim/       # Python backend (FastAPI)
│   ├── api.py          # REST API endpoints
│   ├── client.py       # LLM integration (Groq/OpenAI)
│   ├── equations.py    # Equation parsing & classification
│   ├── models.py       # Pydantic schemas
│   └── cli.py          # Command-line interface
├── frontend/           # React frontend (Vite)
│   └── src/
│       ├── components/ # UI & 3D components
│       ├── hooks/      # React hooks
│       └── lib/        # Utilities & math engine
└── tests/              # Backend tests
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/extract` | Extract equations from text/URL/PDF |
| POST | `/api/breakdown` | Analyze equation parameters via LLM |
| POST | `/api/render` | Start 3D render job |
| GET | `/api/render/{id}/status` | Check render status |
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
