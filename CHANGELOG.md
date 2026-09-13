# Changelog

## [0.2.0] - 2026-09-13

### Added
- FastAPI backend with async job queue
- React frontend with 3D visualization (Three.js, React Three Fiber)
- Math engine with LaTeX parsing, implicit multiplication, Greek letters
- 10+ 3D renderers: surfaces, physics simulations, distributions, ODE fields
- Matrix visualization with dot product support
- Probability diagrams with conditional probability
- CLI with extract, render, models, serve commands
- GitHub Actions CI/CD
- Docker support (130MB production image)
- Pre-commit hooks with ruff + mypy

### Changed
- Replaced Manim video rendering with browser-based 3D (~784MB savings)
- Upgraded to Python 3.12, FastAPI, Pydantic v2
- Frontend deployed to Vercel, backend to Render

### Removed
- Manim dependency (~500MB)
- Streamlit UI
- FFmpeg dependency

## [0.1.0] - Initial Release

- Basic equation extraction from arXiv papers
- PDF parsing with PyMuPDF
- LLM-powered equation breakdown
