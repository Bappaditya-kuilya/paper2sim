"""Paper2Sim API — slim extract-only backend (plan.md §8)."""

import hashlib
import json
import logging
import os
import tempfile
import time
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

try:
    from eqextract.cache import cache_get as _cget
    from eqextract.cache import cache_set as _cset
except ImportError:
    try:
        from src.eqextract.cache import cache_get as _cget
        from src.eqextract.cache import cache_set as _cset
    except ImportError:

        def _cget(key: str, max_age_s: float) -> str | None:
            return None

        def _cset(key: str, val: str) -> None:
            return None


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Paper2Sim API", version="1.0.0")

_cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins or ["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExtractRequest(BaseModel):
    source: Literal["arxiv_url", "text"]
    value: str


_ARXIV_TTL = 86400
_EMPTY_TTL = 300
_MAX_TEXT = 100_000
_MAX_PDF_BYTES = 20 * 1024 * 1024
_MAX_PDF_PAGES = 30
_MAX_CANDIDATES = 200
_BLOCK_CHARS = 2000


def _json_get(key: str, ttl: int):
    try:
        raw = _cget(key, ttl)
    except Exception:
        return None
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def _json_set(key: str, val) -> None:
    try:
        _cset(key, json.dumps(val))
    except Exception:
        pass


def _empty_key(value: str) -> str:
    # ponytail: lone surrogates break utf-8 encode → replace (trust boundary)
    return "empty:" + hashlib.sha256(value.encode("utf-8", errors="replace")).hexdigest()


class _CacheView:
    """Back-compat for `api._cache` membership probes (failure-never-cached)."""

    def __contains__(self, key: object) -> bool:
        try:
            k = str(key)
            ttl = _ARXIV_TTL if k.startswith("arxiv:") else _EMPTY_TTL
            return _cget(k, ttl) is not None
        except Exception:
            return False


_cache = _CacheView()


def _block_math_score(text: str) -> int:
    score = sum(text.count(c) for c in ("=", "^", "_", "{", "}", "\\"))
    lowered = text.lower()
    for kw in ("\\int", "\\sum", "\\frac", "\\sqrt"):
        score += lowered.count(kw)
    return score


_EQ_FUNCS = ("parse_arxiv_url", "download_source", "get_paper_info", "extract_equations_from_tex", "extract_equations_from_text", "classify_equation")


def _eq():
    """Lazily load eqextract: installed package first (Docker/CI `pip install .`),
    src-layout fallback for dev without install. Exactly one branch runs per process."""
    try:
        import eqextract as mod
    except ImportError:
        try:
            from src import eqextract as mod
        except ImportError:
            raise HTTPException(status_code=502, detail="equation extractor not available (eqextract missing)")
    missing = [n for n in _EQ_FUNCS if not callable(getattr(mod, n, None))]
    if missing:
        raise HTTPException(status_code=502, detail=f"equation extractor incomplete (missing: {', '.join(missing)})")
    return mod


def _norm_eq(item, classify) -> dict:
    latex, etype, label = "", None, None
    if isinstance(item, str):
        latex = item
    elif isinstance(item, dict):
        latex = item.get("latex", item.get("equation", item.get("text", "")))
        etype, label = item.get("type"), item.get("label")
    if not isinstance(latex, str):
        latex = str(latex)
    if latex.strip() and not etype:
        try:
            etype = classify(latex)
        except Exception:
            etype = None
    eq = {"latex": latex, "type": etype if isinstance(etype, str) and etype else "unknown"}
    if isinstance(label, str) and label:
        eq["label"] = label
    return eq


def _fetch_arxiv(arxiv_id: str, mod) -> tuple[list[dict], dict, str | None]:
    """Download + extract. Returns (equations, info, warning). Raises on fetch failure."""
    with tempfile.TemporaryDirectory() as tmpdir:
        dest = Path(tmpdir)
        mod.download_source(arxiv_id, str(dest))  # raises on failure
        tex_files = sorted(dest.rglob("*.tex"))
        if tex_files:
            content = max(tex_files, key=lambda p: p.stat().st_size).read_text(errors="replace")
            try:
                raw = mod.extract_equations_from_tex(content)
            except Exception:
                logger.exception("tex extraction failed")
                return [], {}, "extraction failed"
            return [_norm_eq(e, mod.classify_equation) for e in raw], {}, None
        info = mod.get_paper_info(arxiv_id) or {}
        abstract = info.get("summary") or info.get("abstract") or ""
        try:
            raw = mod.extract_equations_from_text(abstract) if abstract.strip() else []
        except Exception:
            logger.exception("abstract extraction failed")
            return [], info, "extraction failed"
        return [_norm_eq(e, mod.classify_equation) for e in raw], info, "no tex source; extracted from abstract"


@app.get("/")
async def root():
    """Backend sanity check — API only, UI lives on the frontend origin."""
    return {"status": "ok"}


@app.head("/")
async def root_head():
    """Render health checks HEAD / — answer it like HEAD /health."""
    return Response(status_code=200)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.head("/health")
async def health_head():
    """Uptime checkers (UptimeRobot free) send HEAD by default — answer it."""
    return Response(status_code=200)


@app.post("/api/extract")
async def extract(req: ExtractRequest):
    # ponytail: lone surrogates break JSONResponse utf-8 encode → replace upfront
    value = req.value.encode("utf-8", errors="replace").decode("utf-8")
    if len(value) > _MAX_TEXT:
        raise HTTPException(status_code=400, detail="value exceeds 100000 chars")
    mod = _eq()
    if req.source == "text":
        if not value.strip():
            return {"equations": []}
        ekey = _empty_key(value)
        if _cget(ekey, _EMPTY_TTL) is not None:
            return {"equations": []}
        try:
            raw = mod.extract_equations_from_text(value)
        except Exception:
            logger.exception("text extraction failed")
            return {"equations": [], "warning": "extraction failed"}
        eqs = [_norm_eq(e, mod.classify_equation) for e in raw]
        if not eqs:
            _cset(ekey, '{"equations": []}')
            return {"equations": []}
        return {"equations": eqs}
    try:
        arxiv_id = mod.parse_arxiv_url(req.value)
    except Exception:
        arxiv_id = None
    if not arxiv_id:
        raise HTTPException(status_code=400, detail="invalid_id")
    cached = _json_get(f"arxiv:{arxiv_id}", _ARXIV_TTL)
    if cached is not None:
        return cached
    try:
        equations, _, warning = _fetch_arxiv(arxiv_id, mod)
    except Exception:
        logger.exception("arxiv extract failed")
        raise HTTPException(status_code=502, detail="arxiv_unavailable")
    resp: dict = {"equations": equations}
    if warning:
        resp["warning"] = warning
    _json_set(f"arxiv:{arxiv_id}", resp)
    return resp


@app.post("/api/extract/upload")
async def extract_upload(file: UploadFile = File(...)):
    """Extract equations from an uploaded PDF (block-score, capped)."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="missing filename")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="only PDF files supported")
    content = await file.read(_MAX_PDF_BYTES + 1)
    if len(content) > _MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="PDF exceeds 20MB")
    if not content.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="not a PDF file")
    try:
        import fitz
    except ImportError:
        raise HTTPException(status_code=502, detail="PDF support not available (pymupdf missing)")
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    try:
        doc = fitz.open(tmp_path)
        try:
            candidates: list[str] = []
            truncated = False
            for i, page in enumerate(doc):
                if i >= _MAX_PDF_PAGES:
                    truncated = True
                    break
                for b in sorted(page.get_text("blocks"), key=lambda b: (b[1], b[0])):
                    if len(candidates) >= _MAX_CANDIDATES:
                        truncated = True
                        break
                    if b[6] != 0:
                        continue
                    cleaned = " ".join(line.strip() for line in b[4].splitlines() if line.strip())
                    if cleaned and _block_math_score(cleaned) > 0:
                        candidates.append(cleaned[:_BLOCK_CHARS])
                if len(candidates) >= _MAX_CANDIDATES:
                    truncated = True
                    break
        finally:
            doc.close()
    except Exception:
        logger.exception("PDF extraction failed")
        return {"equations": [], "warning": "PDF extraction failed"}
    finally:
        Path(tmp_path).unlink(missing_ok=True)
    try:
        classify = _eq().classify_equation
    except HTTPException:
        classify = None
    equations = [_norm_eq(t, classify or (lambda s: "unknown")) for t in candidates]
    resp = {"equations": equations}
    if truncated:
        resp["warning"] = f"truncated to first {_MAX_PDF_PAGES} pages / {_MAX_CANDIDATES} candidates"
    return resp


@app.get("/api/arxiv")
async def arxiv_lookup(url: str):
    mod = _eq()
    try:
        arxiv_id = mod.parse_arxiv_url(url)
    except Exception:
        arxiv_id = None
    if not arxiv_id:
        raise HTTPException(status_code=400, detail="invalid_id")
    cached = _json_get(f"arxiv:{arxiv_id}", _ARXIV_TTL)
    if cached is not None:
        return cached
    try:
        equations, info, _ = _fetch_arxiv(arxiv_id, mod)
        if not info:
            try:
                info = mod.get_paper_info(arxiv_id) or {}
            except Exception:
                info = {}
    except Exception:
        logger.exception("arxiv lookup failed")
        raise HTTPException(status_code=502, detail="arxiv_unavailable")
    authors = info.get("authors") or []
    if authors and isinstance(authors[0], dict):
        authors = [a.get("name", "") for a in authors]
    resp = {"title": info.get("title") or arxiv_id, "authors": authors, "equations": equations}
    _json_set(f"arxiv:{arxiv_id}", resp)
    return resp


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    logger.info(f"{request.method} {request.url.path} -> {response.status_code} ({time.time() - start:.3f}s)")
    return response


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8000")))
