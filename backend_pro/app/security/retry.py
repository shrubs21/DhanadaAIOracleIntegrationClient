"""
security/retry.py

Exponential backoff retry for Oracle API calls.
Only retries transient errors (5xx, timeout).
Never retries validation or business logic errors.
"""

from __future__ import annotations
import time
from typing import Callable, Any, Tuple

import httpx


# Errors that should never be retried
PERMANENT_ERRORS = [
    "duplicate", "already exists",
    "closed period", "invalid period",
    "invalid gl", "combination",
    "supplier not found", "bu not found",
    "not found", "invalid currency",
    "validation",
]

# Delays in seconds: attempt 1=0.5s, 2=1s, 3=2s
BACKOFF_DELAYS = [0.5, 1.0, 2.0]


def is_transient_error(error: str) -> bool:
    """Returns True if error is transient (worth retrying)."""
    error_lower = str(error).lower()
    for permanent in PERMANENT_ERRORS:
        if permanent in error_lower:
            return False
    return True


def with_retry(
    fn:          Callable,
    max_retries: int    = 3,
    *args,
    **kwargs,
) -> Any:
    """
    Call fn with exponential backoff retry.
    Only retries on transient errors.

    Usage:
        result = with_retry(oracle_post_fn, 3, user_id=1, payload=payload)
    """
    last_error = None

    for attempt in range(max_retries):
        try:
            return fn(*args, **kwargs)

        except httpx.TimeoutException as e:
            last_error = e
            if attempt < max_retries - 1:
                delay = BACKOFF_DELAYS[min(attempt, len(BACKOFF_DELAYS) - 1)]
                time.sleep(delay)

        except httpx.HTTPStatusError as e:
            status = e.response.status_code
            if status >= 500:
                # Server error — transient
                last_error = e
                if attempt < max_retries - 1:
                    delay = BACKOFF_DELAYS[min(attempt, len(BACKOFF_DELAYS) - 1)]
                    time.sleep(delay)
            else:
                # 4xx — client error, never retry
                raise

        except Exception as e:
            if is_transient_error(str(e)):
                last_error = e
                if attempt < max_retries - 1:
                    delay = BACKOFF_DELAYS[min(attempt, len(BACKOFF_DELAYS) - 1)]
                    time.sleep(delay)
            else:
                raise

    raise last_error or Exception("Max retries exceeded")


def retry_decorator(max_retries: int = 3):
    """
    Decorator version of retry.

    Usage:
        @retry_decorator(max_retries=3)
        def call_oracle():
            ...
    """
    def decorator(fn: Callable) -> Callable:
        def wrapper(*args, **kwargs) -> Any:
            return with_retry(fn, max_retries, *args, **kwargs)
        wrapper.__name__ = fn.__name__
        return wrapper
    return decorator