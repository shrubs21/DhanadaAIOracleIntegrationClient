"""
security/circuit_breaker.py

Circuit breaker for Oracle Fusion API calls.
Prevents cascading failures when Oracle is down.

States:
  CLOSED  — normal, requests pass through
  OPEN    — Oracle is down, requests blocked for OPEN_DURATION
  HALF    — testing if Oracle recovered (one probe allowed)
"""

from __future__ import annotations
import json
import os
import time
from typing import Callable, Any

import redis as redis_lib

_redis = redis_lib.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0, decode_responses=True,
)

FAILURE_THRESHOLD = 5    # failures before opening circuit
OPEN_DURATION     = 60   # seconds to keep circuit open
SUCCESS_THRESHOLD = 2    # successes in HALF state to close circuit


class CircuitOpenError(Exception):
    """Raised when circuit breaker is open."""
    pass


def _key(tenant_id: str, service: str = "oracle") -> str:
    return f"tenant:{tenant_id}:circuit:{service}"


def get_state(tenant_id: str, service: str = "oracle") -> dict:
    raw = _redis.get(_key(tenant_id, service))
    if not raw:
        return {
            "state":        "CLOSED",
            "failures":     0,
            "successes":    0,
            "opened_at":    None,
            "last_failure": None,
        }
    return json.loads(raw)


def _save_state(tenant_id: str, state: dict, service: str = "oracle") -> None:
    _redis.setex(_key(tenant_id, service), 3600, json.dumps(state))


def record_success(tenant_id: str, service: str = "oracle") -> None:
    state = get_state(tenant_id, service)
    if state["state"] == "HALF":
        state["successes"] = state.get("successes", 0) + 1
        if state["successes"] >= SUCCESS_THRESHOLD:
            state = {
                "state":     "CLOSED",
                "failures":  0,
                "successes": 0,
                "opened_at": None,
            }
    elif state["state"] == "CLOSED":
        state["failures"] = 0
    _save_state(tenant_id, state, service)


def record_failure(tenant_id: str, error: str = "", service: str = "oracle") -> None:
    state = get_state(tenant_id, service)
    now   = time.time()

    if state["state"] == "CLOSED":
        state["failures"]     = state.get("failures", 0) + 1
        state["last_failure"] = error[:200]
        if state["failures"] >= FAILURE_THRESHOLD:
            state["state"]     = "OPEN"
            state["opened_at"] = now

    elif state["state"] == "HALF":
        # Failed probe — reopen
        state["state"]     = "OPEN"
        state["opened_at"] = now
        state["successes"] = 0

    _save_state(tenant_id, state, service)


def allow_request(tenant_id: str, service: str = "oracle") -> bool:
    """
    Returns True if request should be allowed, False if blocked.
    Transitions OPEN → HALF after OPEN_DURATION.
    """
    state = get_state(tenant_id, service)

    if state["state"] == "CLOSED":
        return True

    if state["state"] == "OPEN":
        opened_at = state.get("opened_at") or 0
        if time.time() - opened_at >= OPEN_DURATION:
            # Transition to HALF — allow one probe
            state["state"]    = "HALF"
            state["successes"] = 0
            _save_state(tenant_id, state, service)
            return True
        return False

    if state["state"] == "HALF":
        return True

    return True


def circuit_breaker(tenant_id: str, service: str = "oracle"):
    """
    Decorator for circuit breaker protection.

    Usage:
        @circuit_breaker(tenant_id="tenant_1")
        def call_oracle():
            ...
    """
    def decorator(fn: Callable) -> Callable:
        def wrapper(*args, **kwargs) -> Any:
            if not allow_request(tenant_id, service):
                state = get_state(tenant_id, service)
                raise CircuitOpenError(
                    f"Oracle API is temporarily unavailable (circuit open). "
                    f"Last error: {state.get('last_failure', 'unknown')}. "
                    f"Retry in {OPEN_DURATION} seconds."
                )
            try:
                result = fn(*args, **kwargs)
                record_success(tenant_id, service)
                return result
            except Exception as e:
                record_failure(tenant_id, str(e), service)
                raise
        return wrapper
    return decorator