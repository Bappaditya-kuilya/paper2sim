"""Paper2Sim API — FastAPI backend for equation extraction and visualization."""

import asyncio
import logging
import os
import re
import tempfile
import time
from pathlib import Path
from typing import AsyncGenerator

from fastapi import BackgroundTasks, FastAPI, Form, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel, ValidationError
from slowapi import Limiter
from slowapi.util import get_remote_address

from paper2sim import jobs as job_store
from paper2sim.arxiv import download_pdf, download_source, get_paper_info, parse_arxiv_url
from paper2sim.equations import classify_equation, extract_equations_from_tex, select_templates
from paper2sim.breakdown_client import breakdown_equations
from paper2sim.pipeline import run_pipeline
from paper2sim.storyboard_client import generate_storyboard

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if os.environ.get("SENTRY_DSN"):  # text.md §2.3: 5K errors/mo free; inert without DSN
    try:
        import sentry_sdk

        sentry_sdk.init(dsn=os.environ["SENTRY_DSN"])
    except ImportError:
        logger.warning("SENTRY_DSN set but sentry-sdk not installed")

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


def _block_math_score(text: str) -> int:
    score = sum(text.count(c) for c in ("=", "^", "_", "{", "}", "\\"))
    lowered = text.lower()
    for kw in ("\\int", "\\sum", "\\frac", "\\sqrt"):
        score += lowered.count(kw)
    return score


app = FastAPI(
    title="Paper2Sim API",
    description="Extract equations from papers and visualize them interactively",
    version="0.2.0",
)

app.state.limiter = limiter
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.head("/health")
async def health_head():
    """Uptime checkers (UptimeRobot free) send HEAD by default — answer it."""
    return Response(status_code=200)


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


@app.post("/api/breakdown")
async def breakdown(req: BreakdownRequest):
    equations = [{"latex": req.text or "", "type": "unknown"}]
    result = breakdown_equations(equations, model=req.model)
    return result


@app.post("/api/storyboard")
async def storyboard(req: StoryboardRequest):
    result = generate_storyboard(req.topic, req.source_text)
    return result


@app.post("/api/extract/upload")
async def extract_upload(file: UploadFile = File(...)):
    """Extract equations from uploaded PDF."""
    if not file.filename.endswith(".pdf"):
        return {"error": "Only PDF files supported"}
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    try:
        import fitz
        doc = fitz.open(tmp_path)
        candidates: list[str] = []
        for page in doc:
            blocks = sorted(page.get_text("blocks"), key=lambda b: (b[1], b[0]))
            for b in blocks:
                if b[6] != 0:
                    continue
                cleaned = " ".join(line.strip() for line in b[4].splitlines() if line.strip())
                if cleaned and _block_math_score(cleaned) > 0:
                    candidates.append(cleaned)
        doc.close()
        equations = [{"latex": t, "type": "display"} for t in candidates]
        for eq in equations:
            eq["type"] = classify_equation(eq["latex"])
        result = select_templates(equations)
        return ExtractResponse(
            equations=[Equation(
                latex=e["equation"],
                type=classify_equation(e["equation"]),
                template=e.get("template"),
            ) for e in result],
            paper_info={"filename": file.filename},
        )
    except Exception as e:
        return {"error": f"PDF extraction failed: {e}"}
    finally:
        Path(tmp_path).unlink(missing_ok=True)


MAX_UPLOAD_MB = 20
MAX_SUBMIT_TEXT = 100000
_ARTIFACT_RE = re.compile(r"^figure_\d+\.(png|gif)$")


def _data_dir() -> Path:
    return Path(os.environ.get("DATA_DIR", "./data"))


@app.post("/api/papers")
@limiter.limit("20/hour")
async def submit_paper(
    request: Request,
    background: BackgroundTasks,
    file: UploadFile | None = File(default=None),
    arxiv: str | None = Form(default=None),
    text: str | None = Form(default=None),
    title: str | None = Form(default=None),
):
    """Submit a paper for the 5-stage pipeline. Exactly one of file/arxiv/text. Bad input → 400."""
    has_file = file is not None and bool(file.filename)
    has_arxiv = bool(arxiv and arxiv.strip())
    has_text = bool(text and text.strip())
    if sum((has_file, has_arxiv, has_text)) != 1:
        raise HTTPException(status_code=400, detail="Provide exactly one of: file (PDF), arxiv id/URL, or text")
    if has_arxiv:
        arxiv_id = parse_arxiv_url(arxiv.strip())
        if not arxiv_id:
            raise HTTPException(status_code=400, detail="Invalid arXiv id or URL")
        job = job_store.create(source_kind="arxiv", source_ref=arxiv_id, title=(title or arxiv_id).strip()[:200])
    elif has_text:
        if len(text) > MAX_SUBMIT_TEXT:
            raise HTTPException(status_code=400, detail=f"Pasted text exceeds {MAX_SUBMIT_TEXT} chars")
        job = job_store.create(source_kind="text", source_ref=text.strip(), title=(title or text.strip()[:80]).strip()[:200])
    else:
        if not file.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files supported")
        content = await file.read()
        if len(content) > MAX_UPLOAD_MB * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"PDF exceeds {MAX_UPLOAD_MB}MB")
        job = job_store.create(source_kind="pdf", source_ref=file.filename, title=(title or file.filename).strip()[:200])
        upath = _data_dir() / "uploads" / f"{job['id']}.pdf"
        upath.parent.mkdir(parents=True, exist_ok=True)
        upath.write_bytes(content)
        job_store.update(job["id"], upload_path=str(upath))
        job = job_store.get(job["id"])
    background.add_task(run_pipeline, job["id"])
    return {"job_id": job["id"]}


@app.get("/api/jobs")
async def list_jobs():
    return {"jobs": job_store.list_recent()}


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Unknown job id")
    return job


@app.get("/api/jobs/{job_id}/artifacts/{fname}")
async def get_artifact(job_id: str, fname: str):
    if not _ARTIFACT_RE.match(fname):
        raise HTTPException(status_code=404, detail="Unknown artifact")
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Unknown job id")
    if fname not in [str(a).split("/")[-1] for a in job.get("artifacts", [])]:
        raise HTTPException(status_code=404, detail="Unknown artifact")
    run = next((str(a).split("/")[0] for a in job["artifacts"] if str(a).endswith(fname)), "")
    base = (_data_dir() / "artifacts" / job_id).resolve()
    path = (base / run / fname).resolve()
    if not str(path).startswith(str(base)) or not path.is_file():
        raise HTTPException(status_code=404, detail="Unknown artifact")
    return FileResponse(path)


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, workers=2)
