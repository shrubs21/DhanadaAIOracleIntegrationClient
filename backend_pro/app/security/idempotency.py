"""
security/idempotency.py

Idempotency layer — prevents duplicate invoices.
Uses SHA256 hash of key invoice fields stored in Redis.
"""

from __future__ import annotations
import hashlib
import json
import os
from typing import Optional
import redis as redis_lib

_redis = redis_lib.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0, decode_responses=True,
)

IDEMPOTENCY_TTL = 86400  # 24 hours


def _make_hash(tenant_id: str, supplier_id: int, invoice_number: str,
               invoice_amount: float, business_unit: str) -> str:
    raw = f"{tenant_id}-{supplier_id}-{invoice_number}-{invoice_amount}-{business_unit}"
    return hashlib.sha256(raw.encode()).hexdigest()


def check_duplicate(
    tenant_id:      str,
    supplier_id:    int,
    invoice_number: str,
    invoice_amount: float,
    business_unit:  str,
) -> dict:
    """
    Check if this invoice was already created.
    Returns: { is_duplicate: bool, existing_invoice_id: int | None }
    """
    h   = _make_hash(tenant_id, supplier_id, invoice_number, invoice_amount, business_unit)
    key = f"tenant:{tenant_id}:invoice:hash:{h}"
    raw = _redis.get(key)
    if raw:
        data = json.loads(raw)
        return {
            "is_duplicate":       True,
            "existing_invoice_id":data.get("invoice_id"),
            "existing_invoice_number": data.get("invoice_number"),
            "created_at":         data.get("created_at"),
            "hash":               h,
        }
    return {"is_duplicate": False, "hash": h}


def register_invoice(
    tenant_id:      str,
    supplier_id:    int,
    invoice_number: str,
    invoice_amount: float,
    business_unit:  str,
    invoice_id:     int,
    created_at:     str,
) -> None:
    """Register a successfully created invoice to prevent future duplicates."""
    import datetime
    h   = _make_hash(tenant_id, supplier_id, invoice_number, invoice_amount, business_unit)
    key = f"tenant:{tenant_id}:invoice:hash:{h}"
    _redis.setex(key, IDEMPOTENCY_TTL, json.dumps({
        "invoice_id":     invoice_id,
        "invoice_number": invoice_number,
        "created_at":     created_at or datetime.datetime.utcnow().isoformat(),
    }))


def clear_invoice_hash(
    tenant_id:      str,
    supplier_id:    int,
    invoice_number: str,
    invoice_amount: float,
    business_unit:  str,
) -> None:
    """Remove idempotency record (e.g. after cancellation)."""
    h   = _make_hash(tenant_id, supplier_id, invoice_number, invoice_amount, business_unit)
    key = f"tenant:{tenant_id}:invoice:hash:{h}"
    _redis.delete(key)