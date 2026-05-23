"""
Lightweight in-memory rate limiter for the webhook endpoint.

We cap each repository to ``MAX_CALLS_PER_WINDOW`` webhook deliveries
inside ``WINDOW_SECONDS``. The data lives in-process, so a restart
clears the counters -- that's fine for a single-instance dev setup and
keeps us out of Redis.

The implementation is a sliding window: for each key we store a deque
of timestamps and drop everything older than ``WINDOW_SECONDS`` on each
check.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict

# Tunables exposed at module level so callers / tests can monkey-patch.
WINDOW_SECONDS = 60
MAX_CALLS_PER_WINDOW = 10


class SlidingWindowRateLimiter:
    """Thread-safe sliding-window rate limiter keyed by an arbitrary string."""

    def __init__(
        self,
        max_calls: int = MAX_CALLS_PER_WINDOW,
        window_seconds: int = WINDOW_SECONDS,
    ) -> None:
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self._buckets: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str) -> tuple[bool, int]:
        """
        Record a hit for ``key`` and report whether it's allowed.

        Returns ``(allowed, retry_after_seconds)``. When ``allowed`` is
        True, ``retry_after_seconds`` is 0. When False, it's an integer
        suggesting how many seconds the caller should wait before
        trying again.
        """
        now = time.monotonic()
        cutoff = now - self.window_seconds

        with self._lock:
            bucket = self._buckets[key]
            # Evict stale entries off the left side.
            while bucket and bucket[0] < cutoff:
                bucket.popleft()

            if len(bucket) >= self.max_calls:
                # Oldest call in the window dictates how long until we
                # have a free slot again.
                retry_after = max(1, int(self.window_seconds - (now - bucket[0])))
                return False, retry_after

            bucket.append(now)
            return True, 0

    def snapshot(self) -> Dict[str, int]:
        """Return a {key: current_count} dict (handy for /health debugging)."""
        cutoff = time.monotonic() - self.window_seconds
        with self._lock:
            return {
                key: sum(1 for ts in bucket if ts >= cutoff)
                for key, bucket in self._buckets.items()
            }


# Process-wide singleton -- import this everywhere you need to rate-limit.
webhook_limiter = SlidingWindowRateLimiter()
