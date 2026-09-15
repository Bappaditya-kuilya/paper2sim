"""Job store — SQLite file, no Redis day one (PRD §8).

Jobs are JSON records keyed by 12-char id. Same file also holds the
24h arXiv cache. Thread-safe via a module lock; fine at demo scale.
"""

import json
import os
import sqlite3
import threading
import uuid
from datetime import UTC, datetime

STATUSES = (
    "queued", "ingesting", "analyzing", "generating",
    "executing", "repairing", "summarizing", "completed", "failed",
)

_lock = threading.Lock()
_ready: set[str] = set()


def _now() -> str:
    return datetime.now(UTC).isoformat()


def db_path() -> str:
    return os.environ.get("JOBS_DB") or os.path.join(os.environ.get("DATA_DIR", "./data"), "jobs.db")


def _connect() -> sqlite3.Connection:
    path = db_path()
    parent = os.path.dirname(os.path.abspath(path))
    os.makedirs(parent, exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")  # multi-worker safe on Render disk
    conn.execute("PRAGMA busy_timeout=5000;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


def init_db() -> None:
    with _lock:
        path = db_path()
        if path in _ready:
            return
        conn = _connect()
        try:
            conn.execute("CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, data TEXT NOT NULL, created REAL NOT NULL)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs (created)")
            conn.execute("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, val TEXT NOT NULL, ts REAL NOT NULL)")
            conn.commit()
        finally:
            conn.close()
        _ready.add(path)


def _ensure() -> None:
    if db_path() not in _ready:
        init_db()


def new_id() -> str:
    return uuid.uuid4().hex[:12]


def create(source_kind: str, source_ref: str = "", title: str = "", upload_path: str = "") -> dict:
    _ensure()
    job: dict = {
        "id": new_id(), "status": "queued",
        "source_kind": source_kind, "source_ref": source_ref, "title": title or "Untitled run",
        "upload_path": upload_path, "created_at": _now(), "updated_at": _now(),
        "llm_provider": "auto", "paper_excerpt": "", "analysis": None, "code": "",
        "execution": None, "scene": None, "artifacts": [], "verdict": "error", "summary": "", "error": None,
    }
    with _lock:
        conn = _connect()
        try:
            import time as _t

            conn.execute("INSERT INTO jobs (id, data, created) VALUES (?, ?, ?)", (job["id"], json.dumps(job), _t.time()))
            conn.commit()
        finally:
            conn.close()
    return job


def get(job_id: str) -> dict | None:
    _ensure()
    with _lock:
        conn = _connect()
        try:
            row = conn.execute("SELECT data FROM jobs WHERE id = ?", (job_id,)).fetchone()
        finally:
            conn.close()
    return json.loads(row["data"]) if row else None


def update(job_id: str, **fields) -> dict | None:
    job = get(job_id)
    if job is None:
        return None
    job.update(fields)
    job["updated_at"] = _now()
    with _lock:
        conn = _connect()
        try:
            conn.execute("UPDATE jobs SET data = ? WHERE id = ?", (json.dumps(job), job_id))
            conn.commit()
        finally:
            conn.close()
    return job


def set_status(job_id: str, status: str) -> None:
    assert status in STATUSES, status
    update(job_id, status=status)


def list_recent(limit: int = 50) -> list[dict]:
    _ensure()
    with _lock:
        conn = _connect()
        try:
            rows = conn.execute("SELECT data FROM jobs ORDER BY created DESC LIMIT ?", (limit,)).fetchall()
        finally:
            conn.close()
    out = []
    for r in rows:
        j = json.loads(r["data"])
        out.append({"id": j["id"], "title": j.get("title", ""), "status": j.get("status", ""), "verdict": j.get("verdict", ""), "created_at": j.get("created_at", "")})
    return out


def cache_get(key: str, ttl_s: int = 86400) -> str | None:
    _ensure()
    import time as _t

    with _lock:
        conn = _connect()
        try:
            row = conn.execute("SELECT val, ts FROM kv WHERE key = ?", (key,)).fetchone()
        finally:
            conn.close()
    if row and _t.time() - row["ts"] < ttl_s:
        return row["val"]
    return None


def cache_set(key: str, val: str) -> None:
    _ensure()
    import time as _t

    with _lock:
        conn = _connect()
        try:
            conn.execute("INSERT OR REPLACE INTO kv (key, val, ts) VALUES (?, ?, ?)", (key, val, _t.time()))
            conn.commit()
        finally:
            conn.close()
