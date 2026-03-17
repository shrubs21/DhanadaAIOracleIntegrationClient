"""
monitor/health.py

Deep health check — tests Redis, Oracle, and OpenAI connectivity.
Not just "return ok" — actually probes each service.
"""

from __future__ import annotations
import os
import time
from typing import Dict, Any

import redis as redis_lib

_redis = redis_lib.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0, decode_responses=True,
)


def check_redis() -> dict:
    start = time.time()
    try:
        _redis.ping()
        return {
            "status":      "ok",
            "latency_ms":  round((time.time() - start) * 1000, 1),
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}


def check_oracle(user_id: int = 1, tenant_id: str = "default") -> dict:
    """Probe Oracle by fetching a minimal resource."""
    start = time.time()
    try:
        from security.credentials import get_credentials
        import httpx

        creds = get_credentials(user_id, tenant_id)
        if not creds:
            return {"status": "no_credentials", "message": "Oracle credentials not configured"}

        base = creds["baseUrl"].rstrip("/")
        url  = f"{base}/fscmRestApi/resources/11.13.18.05/suppliers"
        r    = httpx.get(
            url, params={"limit": 1},
            auth=(creds["username"], creds["password"]),
            headers={"Accept": "application/json"},
            timeout=10,
        )
        r.raise_for_status()
        return {
            "status":     "ok",
            "latency_ms": round((time.time() - start) * 1000, 1),
            "http_status": r.status_code,
        }
    except Exception as e:
        return {
            "status":     "error",
            "latency_ms": round((time.time() - start) * 1000, 1),
            "error":      str(e)[:200],
        }


def check_openai() -> dict:
    """Probe OpenAI with a minimal completion."""
    start = time.time()
    try:
        import httpx
        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key:
            return {"status": "no_key", "message": "OPENAI_API_KEY not set"}

        r = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            json={
                "model":      "gpt-4o-2024-05-13",
                "messages":   [{"role": "user", "content": "ping"}],
                "max_tokens": 1,
            },
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type":  "application/json",
            },
            timeout=15,
        )
        r.raise_for_status()
        return {
            "status":     "ok",
            "latency_ms": round((time.time() - start) * 1000, 1),
        }
    except Exception as e:
        return {
            "status":     "error",
            "latency_ms": round((time.time() - start) * 1000, 1),
            "error":      str(e)[:200],
        }


def full_health_check(user_id: int = 1, tenant_id: str = "default") -> dict:
    redis_status  = check_redis()
    oracle_status = check_oracle(user_id, tenant_id)
    openai_status = check_openai()

    all_ok = all(
        s.get("status") == "ok"
        for s in [redis_status, openai_status]
    )
    # Oracle degraded doesn't make whole system down — credentials may not be set
    oracle_ok = oracle_status.get("status") in ("ok", "no_credentials")

    overall = "ok" if (all_ok and oracle_ok) else "degraded"

    return {
        "status":  overall,
        "service": "Oracle Invoice AI",
        "version": "4.0.0",
        "checks": {
            "redis":  redis_status,
            "oracle": oracle_status,
            "openai": openai_status,
        },
    }