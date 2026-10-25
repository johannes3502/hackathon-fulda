"""Tiny in-memory subset of redis-py for unit tests; no server is required."""

import time
from threading import RLock


class FakeRedis:
    def __init__(self):
        self.data: dict[str, str] = {}
        self.expires: dict[str, float] = {}
        self.locks = {}

    def _alive(self, key: str) -> bool:
        deadline = self.expires.get(key)
        if deadline is not None and deadline <= time.monotonic():
            self.data.pop(key, None)
            self.expires.pop(key, None)
            return False
        return key in self.data

    def get(self, key: str):
        return self.data.get(key) if self._alive(key) else None

    def set(self, key: str, value, ex: int | None = None, nx: bool = False,
            xx: bool = False, keepttl: bool = False):
        if xx and not self._alive(key):
            return None
        if nx and self._alive(key):
            return None
        self.data[key] = value.decode("utf-8") if isinstance(value, bytes) else str(value)
        if ex is not None:
            self.expires[key] = time.monotonic() + ex
        elif not keepttl:
            self.expires.pop(key, None)
        return True

    def lock(self, key, **kwargs):
        return self.locks.setdefault(key, RLock())

    def ttl(self, key: str) -> int:
        if not self._alive(key):
            return -2
        deadline = self.expires.get(key)
        if deadline is None:
            return -1
        return max(0, int(deadline - time.monotonic()))

    def delete(self, *keys: str) -> int:
        removed = 0
        for key in keys:
            if self._alive(key):
                self.data.pop(key, None)
                self.expires.pop(key, None)
                removed += 1
        return removed
