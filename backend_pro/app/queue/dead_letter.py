"""
queue/dead_letter.py

Dead letter queue for failed invoices.
When an invoice fails after all retries, it goes here.
Admins can inspect, fix, and requeue them later.
"""

from __future__ import annotations
import datetime
import json
import os
from typing import List, Optional

import redis as redis_lib

_redis = redis_lib.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0, decode_responses=True,
)

DLQ_TTL = 604800  # 7 days


def push_failed_invoice(
    tenant_id:      str,
    session_id:     str,
    user_id:        int,
    invoice_data:   dict,
    error:          str,
    retry_count:    int,
    failed_at:      Optional[str] = None,
) -> str:
    """
    Push a failed invoice to the dead letter queue.
    Returns the DLQ entry ID.
    """
    import uuid
    dlq_id  = str(uuid.uuid4())
    entry   = {
        "dlq_id":       dlq_id,
        "tenant_id":    tenant_id,
        "session_id":   session_id,
        "user_id":      user_id,
        "invoice_data": invoice_data,
        "error":        error[:1000],
        "retry_count":  retry_count,
        "failed_at":    failed_at or datetime.datetime.utcnow().isoformat(),
        "status":       "PENDING",
    }

    key = f"tenant:{tenant_id}:dlq"
    _redis.rpush(key, json.dumps(entry, default=str))
    _redis.expire(key, DLQ_TTL)

    # Also store by ID for direct lookup
    id_key = f"tenant:{tenant_id}:dlq:{dlq_id}"
    _redis.setex(id_key, DLQ_TTL, json.dumps(entry, default=str))

    return dlq_id


def get_failed_invoices(
    tenant_id: str,
    limit:     int = 50,
) -> List[dict]:
    """Get all failed invoices in the dead letter queue."""
    key   = f"tenant:{tenant_id}:dlq"
    items = _redis.lrange(key, -limit, -1)
    result = []
    for item in reversed(items):
        try:
            result.append(json.loads(item))
        except Exception:
            pass
    return result


def get_failed_invoice(tenant_id: str, dlq_id: str) -> Optional[dict]:
    """Get a specific failed invoice by DLQ ID."""
    key = f"tenant:{tenant_id}:dlq:{dlq_id}"
    raw = _redis.get(key)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def mark_requeued(tenant_id: str, dlq_id: str) -> bool:
    """Mark a DLQ entry as requeued (admin retried it)."""
    key = f"tenant:{tenant_id}:dlq:{dlq_id}"
    raw = _redis.get(key)
    if not raw:
        return False
    try:
        entry            = json.loads(raw)
        entry["status"]  = "REQUEUED"
        entry["requeued_at"] = datetime.datetime.utcnow().isoformat()
        _redis.setex(key, DLQ_TTL, json.dumps(entry))
        return True
    except Exception:
        return False


def mark_resolved(tenant_id: str, dlq_id: str, resolution: str = "") -> bool:
    """Mark a DLQ entry as manually resolved."""
    key = f"tenant:{tenant_id}:dlq:{dlq_id}"
    raw = _redis.get(key)
    if not raw:
        return False
    try:
        entry               = json.loads(raw)
        entry["status"]     = "RESOLVED"
        entry["resolved_at"]= datetime.datetime.utcnow().isoformat()
        entry["resolution"] = resolution
        _redis.setex(key, DLQ_TTL, json.dumps(entry))
        return True
    except Exception:
        return False


def dlq_count(tenant_id: str) -> int:
    """Returns count of items in DLQ."""
    key = f"tenant:{tenant_id}:dlq"
    return _redis.llen(key)