"""SQLite kv cache (plan.md §8): single kv(key,val,ts), arXiv 24h TTL."""

import os
import sqlite3
import time
from pathlib import Path

_SCHEMA = "CREATE TABLE IF NOT EXISTS kv(key TEXT PRIMARY KEY, val TEXT, ts REAL)"


def db_path() -> str:
    p = os.environ.get("CACHE_DB") or os.path.join(os.environ.get("DATA_DIR", "./data"), "cache.db")
    Path(p).parent.mkdir(parents=True, exist_ok=True)
    return p


def _conn():
    c = sqlite3.connect(db_path(), timeout=5)
    try:
        c.execute("PRAGMA journal_mode=WAL")
        c.execute(_SCHEMA)
    except Exception:
        pass
    return c


def cache_get(key: str, max_age_s: float) -> str | None:
    try:
        c = _conn()
        try:
            row = c.execute("SELECT val, ts FROM kv WHERE key=?", (key,)).fetchone()
        finally:
            c.close()
        if not row:
            return None
        val, ts = row
        if time.time() - float(ts) > max_age_s:
            return None
        return val
    except Exception:
        return None


def cache_set(key: str, val: str) -> None:
    try:
        c = _conn()
        try:
            c.execute("INSERT INTO kv(key,val,ts) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET val=excluded.val, ts=excluded.ts", (key, val, time.time()))
            c.commit()
        finally:
            c.close()
    except Exception:
        pass


def cache_delete(key: str) -> None:
    try:
        c = _conn()
        try:
            c.execute("DELETE FROM kv WHERE key=?", (key,))
            c.commit()
        finally:
            c.close()
    except Exception:
        pass
