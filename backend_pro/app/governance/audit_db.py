"""
governance/audit_db.py

Persistent audit trail.
Stores every invoice decision, tool call, and risk score.

Redis as primary store with structured JSON.

Structure:
  tenant:{tenant_id}:audit:{session_id}  → list of events
  tenant:{tenant_id}:audit:all           → sorted set by timestamp
"""

from __future__ import annotations
import datetime
import json
import os
from typing import List, Optional

import redis as redis_lib


# ─────────────────────────────────────────────
# REDIS CONFIG
# ─────────────────────────────────────────────

_redis = redis_lib.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0,
    decode_responses=True,
)

AUDIT_TTL      = 2592000  # 30 days
AUDIT_LIST_TTL = 7776000  # 90 days


def _now() -> str:
    return datetime.datetime.utcnow().isoformat()


# ─────────────────────────────────────────────
# CORE AUDIT LOGGER
# ─────────────────────────────────────────────

def log_event(
    tenant_id:  str,
    session_id: str,
    user_id:    int,
    event:      str,
    node:       Optional[str] = None,
    detail:     Optional[str] = None,
    risk_score: Optional[int] = None,
    risk_level: Optional[str] = None,
    risk_factors: Optional[List[str]] = None,
    decision:   Optional[str] = None,
    tool_name:  Optional[str] = None,
    tool_args:  Optional[dict] = None,
    success:    Optional[bool] = True,
    error:      Optional[str]  = None,
    duration_ms:Optional[int]  = None,
    invoice_number: Optional[str] = None,
    invoice_amount: Optional[float] = None,
) -> None:
    """Log a single audit event."""

    entry = {
        "timestamp":      _now(),
        "tenant_id":      tenant_id,
        "session_id":     session_id,
        "user_id":        user_id,
        "event":          event,
        "node":           node,
        "detail":         detail,
        "risk_score":     risk_score,
        "risk_level":     risk_level,
        "risk_factors":   risk_factors or [],
        "decision":       decision,
        "tool_name":      tool_name,
        "tool_args_keys": list((tool_args or {}).keys()),
        "success":        success,
        "error":          (error or "")[:500],
        "duration_ms":    duration_ms,
        "invoice_number": invoice_number,
        "invoice_amount": invoice_amount,
    }

    serialized = json.dumps(entry, default=str)

    # Session-specific audit list
    session_key = f"tenant:{tenant_id}:audit:{session_id}"
    _redis.rpush(session_key, serialized)
    _redis.expire(session_key, AUDIT_TTL)

    # Global sorted audit index
    global_key = f"tenant:{tenant_id}:audit:all"
    score      = datetime.datetime.utcnow().timestamp()
    _redis.zadd(global_key, {serialized: score})
    _redis.expire(global_key, AUDIT_LIST_TTL)


# ─────────────────────────────────────────────
# AUDIT RETRIEVAL
# ─────────────────────────────────────────────

def get_session_audit(tenant_id: str, session_id: str) -> List[dict]:
    key   = f"tenant:{tenant_id}:audit:{session_id}"
    items = _redis.lrange(key, 0, -1)
    return [json.loads(i) for i in items if i]


def get_recent_audit(
    tenant_id: str,
    limit: int = 100,
    hours: int = 24,
) -> List[dict]:

    import time

    key      = f"tenant:{tenant_id}:audit:all"
    min_time = time.time() - (hours * 3600)

    items = _redis.zrangebyscore(
        key,
        min_time,
        "+inf",
        start=0,
        num=limit,
    )

    return [json.loads(i) for i in reversed(items) if i]


# ─────────────────────────────────────────────
# CONVENIENCE METHODS
# ─────────────────────────────────────────────

def log_invoice_created(
    tenant_id:      str,
    session_id:     str,
    user_id:        int,
    invoice_number: str,
    invoice_amount: float,
    currency:       str,
    supplier_name:  str,
    business_unit:  str,
    risk_score:     int,
    risk_level:     str,
    invoice_mode:   str,
) -> None:

    log_event(
        tenant_id=tenant_id,
        session_id=session_id,
        user_id=user_id,
        event="INVOICE_CREATED",
        detail=(
            f"{invoice_mode} | {currency} {invoice_amount:,.2f} | "
            f"{supplier_name} | {business_unit}"
        ),
        risk_score=risk_score,
        risk_level=risk_level,
        success=True,
        invoice_number=invoice_number,
        invoice_amount=invoice_amount,
    )


def log_invoice_blocked(
    tenant_id:   str,
    session_id:  str,
    user_id:     int,
    reason:      str,
    risk_score:  int,
    risk_level:  str,
    risk_factors: List[str],
    decision:    str,
) -> None:

    log_event(
        tenant_id=tenant_id,
        session_id=session_id,
        user_id=user_id,
        event="INVOICE_BLOCKED",
        detail=reason,
        risk_score=risk_score,
        risk_level=risk_level,
        risk_factors=risk_factors,
        decision=decision,
        success=False,
    )