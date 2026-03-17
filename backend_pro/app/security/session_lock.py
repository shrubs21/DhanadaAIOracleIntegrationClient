"""
security/session_lock.py

Session locking — prevents race conditions on concurrent requests.
Uses Redis SETNX with TTL. Returns 409 if session is locked.
"""

from __future__ import annotations
import os
import time
import uuid
from contextlib import contextmanager
from typing import Optional

import redis as redis_lib

_redis = redis_lib.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0, decode_responses=True,
)

LOCK_TTL     = 30   # seconds
LOCK_RETRY   = 3    # attempts
LOCK_WAIT_MS = 200  # ms between retries


class SessionLockError(Exception):
    """Raised when session lock cannot be acquired."""
    pass


def acquire_lock(session_id: str, tenant_id: str = "default") -> Optional[str]:
    """
    Try to acquire a session lock.
    Returns lock_token if acquired, None if not.
    """
    key        = f"tenant:{tenant_id}:lock:session:{session_id}"
    lock_token = str(uuid.uuid4())

    for attempt in range(LOCK_RETRY):
        # SETNX — set only if not exists
        acquired = _redis.set(key, lock_token, nx=True, ex=LOCK_TTL)
        if acquired:
            return lock_token
        time.sleep(LOCK_WAIT_MS / 1000)

    return None


def release_lock(session_id: str, lock_token: str, tenant_id: str = "default") -> bool:
    """
    Release session lock — only if we own it (token matches).
    """
    key     = f"tenant:{tenant_id}:lock:session:{session_id}"
    current = _redis.get(key)
    if current == lock_token:
        _redis.delete(key)
        return True
    return False


def is_locked(session_id: str, tenant_id: str = "default") -> bool:
    key = f"tenant:{tenant_id}:lock:session:{session_id}"
    return bool(_redis.exists(key))


@contextmanager
def session_lock(session_id: str, tenant_id: str = "default"):
    """
    Context manager for session locking.

    Usage:
        with session_lock(session_id, tenant_id) as token:
            ... do work ...
    Raises SessionLockError if lock cannot be acquired.
    """
    token = acquire_lock(session_id, tenant_id)
    if not token:
        raise SessionLockError(
            f"Session {session_id} is currently being processed. "
            "Please wait a moment and retry."
        )
    try:
        yield token
    finally:
        release_lock(session_id, token, tenant_id)