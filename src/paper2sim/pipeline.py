"""Five-stage pipeline (PRD §7): ingest → analyze → generate → execute ⇄ repair → summarize.

Runs as a FastAPI BackgroundTask (no Celery day one). Each stage writes back
to the SQLite job record so the UI can poll live progress.
"""

import json
import logging
import os
import time
from pathlib import Path

from paper2sim import arxiv as arxiv_mod
from paper2sim.jobs import cache_get, cache_set, get, set_status, update
from paper2sim.llm import chat, strip_fences
from paper2sim.prompts import ANALYZE_SYSTEM, GENERATE_STRICT, GENERATE_SYSTEM, REPAIR_SYSTEM, SUMMARIZE_SYSTEM
from paper2sim.sandbox import run_script

logger = logging.getLogger(__name__)

MAX_TEXT = 24000
VERDICTS = ("supported", "refuted", "inconclusive")
VIZ_TYPES = frozenset({"trigonometric", "polynomial", "exponential", "logarithmic", "hyperbolic", "matrix", "probability", "statistical", "ode", "physics", "generic", "trajectory"})


def _data_dir() -> Path:
    return Path(os.environ.get("DATA_DIR", "./data"))


def _repair_attempts() -> int:
    try:
        return max(0, int(os.environ.get("MAX_REPAIR_ATTEMPTS", "3")))
    except ValueError:
        return 3


def _sandbox_timeout() -> int:
    try:
        return max(5, int(os.environ.get("SANDBOX_TIMEOUT_SECONDS", "60")))
    except ValueError:
        return 60


def _sandbox_mem_mb() -> int:
    try:
        return max(256, int(os.environ.get("SANDBOX_MAX_MEMORY_MB", "2048")))
    except ValueError:
        return 2048


def extract_code(response: str) -> str | None:
    """Pull the ```python block out of an LLM response (reuse of fence-strip idiom)."""
    text = response or ""
    if "```python" in text:
        return text.split("```python", 1)[1].split("```", 1)[0].strip() or None
    if "```" in text:
        return text.split("```", 1)[1].split("```", 1)[0].strip() or None
    return None


def parse_analysis(response: str) -> dict:
    """Defensive parse: first {...} block wins, else raw text becomes the claim (PRD §7)."""
    text = (response or "").strip()
    start = text.find("{")
    while start != -1:
        try:
            obj, _ = json.JSONDecoder().raw_decode(text[start:])
            if isinstance(obj, dict) and obj.get("claim"):
                viz = obj.get("viz_type") if obj.get("viz_type") in VIZ_TYPES else "generic"
                return {
                    "claim": str(obj["claim"])[:2000],
                    "why_it_matters": str(obj.get("why_it_matters", ""))[:2000],
                    "simulation_plan": str(obj.get("simulation_plan", ""))[:2000],
                    "viz_type": viz,
                }
        except json.JSONDecodeError:
            pass
        start = text.find("{", start + 1)
    return {"claim": text[:2000] or "No claim extracted", "why_it_matters": "", "simulation_plan": "", "viz_type": "generic"}


def _extract_pdf_text(path: str) -> str:
    import fitz

    doc = fitz.open(path)
    try:
        parts = [page.get_text() for page in doc]
    finally:
        doc.close()
    return "\n".join(parts)


def _ingest(job: dict) -> str:
    """Stage 1. Returns plain text trimmed to MAX_TEXT. Raises on bad input."""
    kind, ref = job["source_kind"], job.get("source_ref", "")
    if kind == "arxiv":
        cached = cache_get(f"arxiv:{ref}")
        if cached:
            info = json.loads(cached)
        else:
            info = arxiv_mod.get_paper_info(ref)
            if not info:
                raise ValueError(f"could not fetch arXiv:{ref}")
            cache_set(f"arxiv:{ref}", json.dumps(info))
        if info.get("title"):
            update(job["id"], title=info["title"][:200])
        text = f"{info.get('title', '')}\n\n{info.get('abstract', '')}"
    elif kind == "pdf":
        up = job.get("upload_path", "")
        if not up or not Path(up).exists():
            raise ValueError("uploaded PDF missing")
        text = _extract_pdf_text(up)
    else:
        text = ref
    text = (text or "").strip()
    if not text:
        raise ValueError("empty input text")
    return text[:MAX_TEXT]


def _fail(job_id: str, stage: str, err: str) -> None:
    logger.warning(f"job {job_id} failed at {stage}: {err}"[:500])
    update(job_id, status="failed", error=f"{stage}: {err}"[:2000], verdict="error", summary=f"Run failed during {stage}. {err}"[:2000])


def run_pipeline(job_id: str) -> None:
    """Background-task entry. Never raises — failures land on the job record."""
    job = get(job_id)
    if job is None:
        return
    provider = "mock" if not any(os.environ.get(k) for k in ("GROQ_API_KEY", "OPENROUTER_API_KEY", "GOOGLE_AI_STUDIO_API_KEY")) else "auto"
    update(job_id, llm_provider=provider)
    try:
        # 1. Ingest
        set_status(job_id, "ingesting")
        text = _ingest(get(job_id))
        update(job_id, paper_excerpt=text[:4000])

        # 2. Analyze
        set_status(job_id, "analyzing")
        analysis = parse_analysis(chat(ANALYZE_SYSTEM, text))
        update(job_id, analysis=analysis)

        # 3. Generate (one retry with a stricter prompt if no code block)
        set_status(job_id, "generating")
        plan = f"Claim: {analysis['claim']}\nPlan: {analysis['simulation_plan']}\nViz: {analysis['viz_type']}"
        code = extract_code(chat(GENERATE_SYSTEM, plan))
        if not code:
            code = extract_code(chat(GENERATE_STRICT, plan))
        if not code:
            _fail(job_id, "generating", "LLM returned no usable code block")
            return
        update(job_id, code=code[:50000])

        # 4. Execute + repair
        timeout_s = _sandbox_timeout()
        max_mem_mb = _sandbox_mem_mb()
        max_repairs = _repair_attempts()
        job_dir = _data_dir() / "artifacts" / job_id
        out, attempt = None, 0
        while True:
            set_status(job_id, "executing" if attempt == 0 else "repairing")
            run_dir = job_dir / f"run_{attempt + 1}"
            t0 = time.time()
            out = run_script(code, timeout_s=timeout_s, max_mem_mb=max_mem_mb, out_dir=str(run_dir))
            duration = round(time.time() - t0, 2)
            ok = out["returncode"] == 0 and out["scene"] is not None
            rel_artifacts = [f"run_{attempt + 1}/{n}" for n in out["artifacts"]]
            execution = {
                "returncode": out["returncode"], "stdout": out["stdout"][-8000:], "stderr": out["stderr"][-8000:],
                "duration_seconds": duration, "artifacts": rel_artifacts,
                "result_json": out["result_json"], "attempt": attempt + 1, "timed_out": out["timed_out"],
            }
            update(job_id, execution=execution, scene=out["scene"], artifacts=rel_artifacts, code=code[:50000])
            if ok:
                break
            reason = (out["stderr"] or "clean exit with no scene.json")[-4000:]
            if attempt >= max_repairs:
                _fail(job_id, "executing", reason[-1500:])
                return
            attempt += 1
            fixed = extract_code(chat(REPAIR_SYSTEM, f"Code:\n{code[:12000]}\n\nStderr:\n{reason}"))
            if not fixed:
                _fail(job_id, "repairing", reason[-1500:])
                return
            code = fixed

        # 5. Summarize (skip LLM on failure — we already returned)
        set_status(job_id, "summarizing")
        result = out["result_json"] or {}
        verdict = result.get("verdict") if result.get("verdict") in VERDICTS else "inconclusive"
        summary = ""
        try:
            raw = strip_fences(chat(SUMMARIZE_SYSTEM, f"Claim: {analysis['claim']}\nMetrics: {json.dumps(result.get('metrics', {}))}"))
            summary = str(json.loads(raw).get("summary", ""))
        except Exception:  # noqa: BLE001 — canned fallback below
            summary = ""
        if not summary:
            summary = f"Verdict: {verdict}. Metrics: {json.dumps(result.get('metrics', {}))}."
        update(job_id, status="completed", verdict=verdict, summary=summary[:4000], error=None)
    except Exception as e:  # noqa: BLE001 — job must fail closed, never hang
        job_now = get(job_id) or {}
        _fail(job_id, str(job_now.get("status", "pipeline")), str(e)[:500])
