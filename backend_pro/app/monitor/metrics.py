"""
monitor/metrics.py

Full KPI metrics collection and reporting.
Tracks: invoices created/failed, avg latency, success rate,
        error categories, retry counts, circuit breaker status.
"""

from __future__ import annotations
import json
import os
import time
from typing import Dict, Any

import redis as redis_lib

_redis = redis_lib.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0, decode_responses=True,
)

METRICS_TTL = 86400  # 24 hours


def _k(tenant_id: str, metric: str) -> str:
    return f"tenant:{tenant_id}:metrics:{metric}"


# ── Counters ──────────────────────────────────────────────────────────────────

def inc(tenant_id: str, metric: str, amount: int = 1) -> None:
    key = _k(tenant_id, metric)
    _redis.incrby(key, amount)
    _redis.expire(key, METRICS_TTL)


def get_counter(tenant_id: str, metric: str) -> int:
    raw = _redis.get(_k(tenant_id, metric))
    return int(raw) if raw else 0


# ── Latency tracking ─────────────────────────────────────────────────────────

def record_latency(tenant_id: str, operation: str, duration_ms: int) -> None:
    """Record operation latency in a Redis list (last 1000)."""
    key = _k(tenant_id, f"latency:{operation}")
    _redis.rpush(key, duration_ms)
    _redis.ltrim(key, -1000, -1)
    _redis.expire(key, METRICS_TTL)


def get_avg_latency(tenant_id: str, operation: str) -> float:
    """Get average latency for an operation in ms."""
    key    = _k(tenant_id, f"latency:{operation}")
    values = _redis.lrange(key, 0, -1)
    if not values:
        return 0.0
    nums = [float(v) for v in values if v]
    return round(sum(nums) / len(nums), 1) if nums else 0.0


# ── Error categories ──────────────────────────────────────────────────────────

ERROR_CATEGORIES = [
    "VALIDATION_ERROR",
    "ORACLE_TIMEOUT",
    "DUPLICATE_BLOCK",
    "POLICY_BLOCK",
    "CIRCUIT_OPEN",
    "SYSTEM_ERROR",
    "SUPPLIER_NOT_FOUND",
    "BU_NOT_FOUND",
    "GL_INVALID",
]


def record_error(tenant_id: str, category: str) -> None:
    inc(tenant_id, f"error:{category}")


# ── Invoice tracking ──────────────────────────────────────────────────────────

def record_invoice_created(tenant_id: str, amount: float, duration_ms: int) -> None:
    inc(tenant_id, "invoices_created")
    inc(tenant_id, "invoices_total")
    record_latency(tenant_id, "invoice_creation", duration_ms)

    # Track total value created
    key = _k(tenant_id, "total_value_created")
    _redis.incrbyfloat(key, amount)
    _redis.expire(key, METRICS_TTL)


def record_invoice_failed(tenant_id: str, category: str = "SYSTEM_ERROR") -> None:
    inc(tenant_id, "invoices_failed")
    inc(tenant_id, "invoices_total")
    record_error(tenant_id, category)


def record_invoice_blocked(tenant_id: str, reason: str = "POLICY_BLOCK") -> None:
    inc(tenant_id, "invoices_blocked")
    record_error(tenant_id, reason)


# ── Full metrics snapshot ─────────────────────────────────────────────────────

def get_metrics_snapshot(tenant_id: str) -> Dict[str, Any]:
    """
    Returns full KPI snapshot for tenant.
    Used by /metrics endpoint.
    """
    total   = get_counter(tenant_id, "invoices_total")
    created = get_counter(tenant_id, "invoices_created")
    failed  = get_counter(tenant_id, "invoices_failed")
    blocked = get_counter(tenant_id, "invoices_blocked")

    success_rate = round((created / total * 100), 1) if total > 0 else 0.0
    failure_rate = round((failed / total * 100), 1) if total > 0 else 0.0

    # Error breakdown
    error_breakdown = {}
    for cat in ERROR_CATEGORIES:
        count = get_counter(tenant_id, f"error:{cat}")
        if count > 0:
            error_breakdown[cat] = count

    # Latency
    avg_creation_ms = get_avg_latency(tenant_id, "invoice_creation")
    avg_validation_ms = get_avg_latency(tenant_id, "validation")

    # Circuit breaker status
    from security.circuit_breaker import get_state as cb_state
    circuit = cb_state(tenant_id)

    # DLQ count
    from queue.dead_letter import dlq_count
    dlq = dlq_count(tenant_id)

    # Total value
    raw_val = _redis.get(_k(tenant_id, "total_value_created"))
    total_value = float(raw_val) if raw_val else 0.0

    return {
        "tenant_id":          tenant_id,
        "invoices": {
            "total":           total,
            "created":         created,
            "failed":          failed,
            "blocked":         blocked,
            "success_rate_pct": success_rate,
            "failure_rate_pct": failure_rate,
            "total_value":     round(total_value, 2),
        },
        "latency_ms": {
            "avg_invoice_creation": avg_creation_ms,
            "avg_validation":       avg_validation_ms,
        },
        "error_breakdown":   error_breakdown,
        "circuit_breaker": {
            "state":         circuit.get("state", "CLOSED"),
            "failures":      circuit.get("failures", 0),
            "last_failure":  circuit.get("last_failure"),
        },
        "dead_letter_queue": {
            "pending": dlq,
        },
        "retries": {
            "total": get_counter(tenant_id, "retries_total"),
        },
    }