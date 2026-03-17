"""
monitor/monitor.py

Observability layer.
Tracks: node transitions, tool calls, latency, errors, retry counts.
Evaluates tool results. Adapts state based on Oracle responses.
"""

from __future__ import annotations
import datetime
import json
import os
import time
from typing import Any, Callable, Optional

import redis as redis_lib

_redis = redis_lib.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0, decode_responses=True,
)

METRICS_TTL = 86400  # 24 hours


class Monitor:

    def __init__(self, session_id: str, user_id: int):
        self.session_id = session_id
        self.user_id    = user_id
        self._start_times: dict = {}

    # ── Node tracking ────────────────────────────────────────────────────────

    def node_start(self, node_name: str) -> float:
        start = time.time()
        self._start_times[node_name] = start
        self._push_metric("node_start", {
            "node": node_name,
            "timestamp": datetime.datetime.utcnow().isoformat(),
        })
        return start

    def node_end(self, node_name: str, success: bool = True, error: str = None) -> int:
        start      = self._start_times.get(node_name, time.time())
        elapsed_ms = int((time.time() - start) * 1000)
        self._push_metric("node_end", {
            "node":        node_name,
            "duration_ms": elapsed_ms,
            "success":     success,
            "error":       error,
            "timestamp":   datetime.datetime.utcnow().isoformat(),
        })
        return elapsed_ms

    # ── Tool tracking ────────────────────────────────────────────────────────

    def tool_call(self, tool_name: str, args: dict = None) -> float:
        start = time.time()
        self._start_times[f"tool:{tool_name}"] = start
        self._push_metric("tool_call", {
            "tool":      tool_name,
            "args_keys": list((args or {}).keys()),
            "timestamp": datetime.datetime.utcnow().isoformat(),
        })
        return start

    def tool_result(self, tool_name: str, success: bool,
                    result_summary: str = "") -> int:
        key        = f"tool:{tool_name}"
        start      = self._start_times.get(key, time.time())
        elapsed_ms = int((time.time() - start) * 1000)
        self._push_metric("tool_result", {
            "tool":        tool_name,
            "duration_ms": elapsed_ms,
            "success":     success,
            "summary":     result_summary[:200],
            "timestamp":   datetime.datetime.utcnow().isoformat(),
        })
        return elapsed_ms

    # ── Error tracking ────────────────────────────────────────────────────────

    def error(self, node: str, error_type: str, message: str) -> None:
        self._push_metric("error", {
            "node":       node,
            "error_type": error_type,
            "message":    message[:500],
            "timestamp":  datetime.datetime.utcnow().isoformat(),
        })
        # Increment error counter
        counter_key = f"metrics:{self.user_id}:errors:{error_type}"
        _redis.incr(counter_key)
        _redis.expire(counter_key, METRICS_TTL)

    # ── Invoice tracking ──────────────────────────────────────────────────────

    def invoice_created(self, invoice_number: str, amount: float,
                        currency: str, mode: str) -> None:
        self._push_metric("invoice_created", {
            "invoice_number": invoice_number,
            "amount":         amount,
            "currency":       currency,
            "mode":           mode,
            "timestamp":      datetime.datetime.utcnow().isoformat(),
        })
        _redis.incr(f"metrics:{self.user_id}:invoices_created")
        _redis.expire(f"metrics:{self.user_id}:invoices_created", METRICS_TTL)

    def invoice_failed(self, reason: str) -> None:
        self._push_metric("invoice_failed", {
            "reason":    reason,
            "timestamp": datetime.datetime.utcnow().isoformat(),
        })
        _redis.incr(f"metrics:{self.user_id}:invoices_failed")
        _redis.expire(f"metrics:{self.user_id}:invoices_failed", METRICS_TTL)

    # ── Evaluate tool result ──────────────────────────────────────────────────

    def evaluate_tool_result(self, tool_name: str, raw_result: str) -> dict:
        """
        Parse and evaluate a tool result.
        Returns structured evaluation with action recommendations.
        """
        try:
            result = json.loads(raw_result)
        except Exception:
            return {
                "success":    False,
                "action":     "RETRY",
                "message":    "Tool returned invalid JSON",
                "raw":        raw_result[:200],
            }

        # Invoice creation results
        if tool_name in ("create_non_po_invoice_tool", "create_po_invoice_tool"):
            if result.get("success"):
                return {
                    "success":        True,
                    "action":         "COMPLETE",
                    "invoice_id":     result.get("invoiceId"),
                    "invoice_number": result.get("invoiceNumber"),
                    "message":        result.get("message", "Invoice created"),
                }
            else:
                return {
                    "success":      False,
                    "action":       "EXPLAIN",
                    "human_error":  result.get("humanMessage", "Creation failed"),
                    "raw_error":    result.get("error", ""),
                }

        # Validation results
        if tool_name == "run_full_validation_tool":
            errors   = result.get("errors", [])
            warnings = result.get("warnings", [])
            resolved = result.get("resolved", {})
            return {
                "success":   len(errors) == 0,
                "action":    "CONTINUE" if not errors else "FIX_ERRORS",
                "errors":    errors,
                "warnings":  warnings,
                "resolved":  resolved,
            }

        return {"success": True, "action": "CONTINUE", "result": result}

    # ── Retry logic ───────────────────────────────────────────────────────────

    def should_retry(self, retry_count: int, max_retries: int,
                     error: str = "") -> bool:
        if retry_count >= max_retries:
            return False
        # Don't retry on known permanent errors
        permanent = [
            "duplicate", "closed period", "invalid gl",
            "supplier not found", "bu not found",
        ]
        error_lower = error.lower()
        if any(p in error_lower for p in permanent):
            return False
        return True

    # ── Internal ──────────────────────────────────────────────────────────────

    def _push_metric(self, event_type: str, data: dict) -> None:
        key     = f"audit:{self.session_id}"
        entry   = {"event": event_type, **data}
        _redis.rpush(key, json.dumps(entry, default=str))
        _redis.expire(key, METRICS_TTL)

    def get_audit_log(self) -> list:
        key    = f"audit:{self.session_id}"
        items  = _redis.lrange(key, 0, -1)
        result = []
        for item in items:
            try:
                result.append(json.loads(item))
            except Exception:
                pass
        return result

    def get_metrics(self) -> dict:
        prefix = f"metrics:{self.user_id}"
        return {
            "invoices_created": int(_redis.get(f"{prefix}:invoices_created") or 0),
            "invoices_failed":  int(_redis.get(f"{prefix}:invoices_failed") or 0),
        }


def timed_node(node_fn: Callable) -> Callable:
    """
    Decorator that adds automatic timing to any graph node.
    Usage: @timed_node
    """
    def wrapper(state):
        monitor    = Monitor(state.session_id, state.user_id)
        node_name  = node_fn.__name__
        monitor.node_start(node_name)
        try:
            result = node_fn(state)
            monitor.node_end(node_name, success=True)
            return result
        except Exception as e:
            monitor.node_end(node_name, success=False, error=str(e))
            raise
    wrapper.__name__ = node_fn.__name__
    return wrapper