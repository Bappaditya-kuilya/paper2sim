"""TTL cache utility for Paper2Sim."""

import time
from typing import Any


class TTLCache:
    """Simple in-memory cache with TTL expiration."""

    def __init__(self, ttl: int = 3600):
        self.ttl = ttl
        self._store: dict[str, tuple[float, Any]] = {}

    def get(self, key: str) -> Any | None:
        if key in self._store:
            ts, val = self._store[key]
            if time.time() - ts < self.ttl:
                return val
            del self._store[key]
        return None

    def set(self, key: str, val: Any):
        self._store[key] = (time.time(), val)

    def clear(self):
        self._store.clear()

    def size(self) -> int:
        return len(self._store)
