"""Paper2Sim API — FastAPI backend for equation extraction and visualization."""

import asyncio
import logging
import tempfile
import time
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError
from slowapi import Limiter
from slowapi.util import get_remote_address

from paper2sim.arxiv import download_pdf, download_source, get_paper_info, parse_arxiv_url
from paper2sim.equations import classify_equation, extract_equations_from_tex, select_templates
from workers import create_job, get_job, jobs

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


class ExtractRequest(BaseModel):
    source: str  # "arxiv_url" | "pdf_upload" | "text"
    url: str | None = None
    text: str | None = None


class Equation(BaseModel):
    latex: str
    type: str
    label: str | None = None
    template: str | None = None


class ExtractResponse(BaseModel):
    equations: list[Equation]
    paper_info: dict | None = None


class RenderRequest(BaseModel):
    template: str
    params: dict = {}
    equation: str


class RenderResponse(BaseModel):
    job_id: str
    status: str


class BreakdownRequest(BaseModel):
    pdf_path: str | None = None
    text: str | None = None
    model: str = "openai/gpt-oss-120b"


class StoryboardRequest(BaseModel):
    topic: dict
    source_text: str = ""


# In-memory TTL cache
_cache: dict[str, tuple[float, any]] = {}
CACHE_TTL = 3600  # 1 hour


def cache_get(key: str):
    if key in _cache:
        ts, val = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return val
        del _cache[key]
    return None


def cache_set(key: str, val):
    _cache[key] = (time.time(), val)


app = FastAPI(
    title="Paper2Sim API",
    description="Extract equations from papers and visualize them interactively",
    version="0.2.0",
)

app.state.limiter = limiter
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/health/dependencies")
async def health_deps():
    deps = {}
    try:
        import fitz
        deps["pymupdf"] = "ok"
    except ImportError:
        deps["pymupdf"] = "missing"
    try:
        import fastapi
        deps["fastapi"] = "ok"
    except ImportError:
        deps["fastapi"] = "missing"
    return deps


@app.post("/api/extract")
@limiter.limit("10/minute")
async def extract(req: ExtractRequest, request: Request):
    if req.source == "arxiv_url" and req.url:
        arxiv_id = parse_arxiv_url(req.url)
        if not arxiv_id:
            return {"error": "Invalid arXiv URL"}
        cached = cache_get(f"arxiv:{arxiv_id}")
        if cached:
            return cached
        with tempfile.TemporaryDirectory() as tmpdir:
            dest = Path(tmpdir)
            source_path = download_source(arxiv_id, str(dest))
            if source_path:
                tex_files = list(dest.rglob("*.tex"))
                if tex_files:
                    tex_content = tex_files[0].read_text(errors="replace")
                    equations = extract_equations_from_tex(tex_content)
                    for eq in equations:
                        eq["type"] = classify_equation(eq["latex"])
                    result = select_templates(equations)
                    response = ExtractResponse(
                        equations=[Equation(
                            latex=e["equation"],
                            type=classify_equation(e["equation"]),
                            template=e.get("template"),
                        ) for e in result],
                        paper_info={"arxiv_id": arxiv_id},
                    )
                    cache_set(f"arxiv:{arxiv_id}", response)
                    return response
            pdf_path = download_pdf(arxiv_id, str(dest))
            if pdf_path:
                return {"error": "PDF extraction not yet implemented"}
        return {"error": "Failed to download paper"}
    elif req.source == "text" and req.text:
        equations = [{"latex": req.text, "type": "display"}]
        equations[0]["type"] = classify_equation(req.text)
        result = select_templates(equations)
        return ExtractResponse(equations=[Equation(
            latex=e["equation"],
            type=classify_equation(e["equation"]),
            template=e.get("template"),
        ) for e in result])
    return {"error": "Invalid request"}


@app.post("/api/render", response_model=RenderResponse)
async def render(req: RenderRequest):
    job_id = create_job(req.template, req.params, req.equation)
    return RenderResponse(job_id=job_id, status="queued")


@app.get("/api/render/{job_id}/status")
async def render_status(job_id: str):
    job = get_job(job_id)
    if not job:
        return {"error": "Job not found"}
    return {
        "job_id": job["job_id"],
        "status": job["status"],
        "progress": job["progress"],
        "error": job["error"],
    }


@app.get("/api/render/{job_id}/video")
async def render_video(job_id: str):
    job = get_job(job_id)
    if not job:
        return {"error": "Job not found"}
    if job["status"] != "complete":
        return {"error": "Video not ready"}
    return {"video_path": job["video_path"]}


@app.post("/api/breakdown")
async def breakdown(req: BreakdownRequest):
    return {"error": "Breakdown not yet implemented — use existing Paper2SimBreakdownClient"}


@app.post("/api/storyboard")
async def storyboard(req: StoryboardRequest):
    return {"error": "Storyboard not yet implemented — use existing storyboard pipeline"}


@app.get("/api/render/{job_id}/stream")
async def render_stream(job_id: str):
    """SSE stream for render progress updates."""
    from fastapi.responses import StreamingResponse

    async def event_generator():
        job = get_job(job_id)
        if not job:
            yield f"data: {JSONResponse(content={'error': 'Job not found'}).body.decode()}\n\n"
            return
        yield f"data: {JSONResponse(content={'status': job['status'], 'progress': job['progress']}).body.decode()}\n\n"
    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    return JSONResponse(status_code=422, content={"error": "Validation error", "details": exc.errors()})


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(status_code=500, content={"error": "Internal server error"})


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(f"{request.method} {request.url.path} -> {response.status_code} ({duration:.3f}s)")
    return response
