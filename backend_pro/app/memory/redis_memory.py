"""
memory/redis_memory.py

Session store + Org memory.
Safe JSON serialization. Message rehydration on load.
TTL management. Completed invoice archiving.
"""

from __future__ import annotations
import json
import os
import datetime
from typing import Any, Optional

import redis as redis_lib
from langchain_core.messages import (
    HumanMessage, AIMessage, SystemMessage, ToolMessage
)

_redis = redis_lib.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0, decode_responses=True,
)

SESSION_TTL      = 7200    # 2 hours
ORG_MEMORY_TTL   = 2592000 # 30 days
MAX_MESSAGES     = 50      # trim if exceeded
COMPLETED_TTL    = 86400   # 24 hours for completed invoice cache


class SessionStore:

    # ── Save ─────────────────────────────────────────────────────────────────

    def save(self, session_id: str, state_dict: dict) -> None:
        """Serialize and save state to Redis."""
        safe = self._make_serializable(state_dict)
        _redis.setex(
            f"session:{session_id}",
            SESSION_TTL,
            json.dumps(safe, default=str),
        )

    def _make_serializable(self, state_dict: dict) -> dict:
        """Convert messages to safe dicts. Remove non-JSON types."""
        safe = dict(state_dict)

        # Serialize messages
        msgs = safe.get("messages", [])
        safe["messages"] = [self._serialize_message(m) for m in msgs]

        # Trim messages if too long
        if len(safe["messages"]) > MAX_MESSAGES:
            safe["messages"] = safe["messages"][-MAX_MESSAGES:]

        # Remove file_base64 from long-term storage (too large)
        safe.pop("file_base64", None)

        return safe

    def _serialize_message(self, msg: Any) -> dict:
        """Convert LangChain message to plain dict."""
        if isinstance(msg, dict):
            return msg
        if hasattr(msg, "type") and hasattr(msg, "content"):
            d = {"type": msg.type, "content": msg.content or ""}
            # AIMessage: must persist tool_calls so next turn can pair them
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                d["tool_calls"] = msg.tool_calls
            # ToolMessage: must persist both tool_call_id AND name
            if hasattr(msg, "tool_call_id") and msg.tool_call_id:
                d["tool_call_id"] = msg.tool_call_id
            if hasattr(msg, "name") and msg.name:
                d["name"] = msg.name
            return d
        return {"type": "unknown", "content": str(msg)}

    # ── Load ─────────────────────────────────────────────────────────────────

    def load(self, session_id: str) -> Optional[dict]:
        """Load and rehydrate state from Redis."""
        raw = _redis.get(f"session:{session_id}")
        if not raw:
            return None
        try:
            state_dict = json.loads(raw)
            state_dict["messages"] = self._rehydrate_messages(
                state_dict.get("messages", [])
            )
            return state_dict
        except Exception:
            return None

    def _rehydrate_messages(self, raw_messages: list) -> list:
        """
        Convert stored dicts back to live LangChain message objects.

        Rules that must hold after rehydration (OpenAI enforces these):
          1. Every ToolMessage must be immediately preceded by an AIMessage
             whose tool_calls list contains a matching tool_call_id.
          2. tool_calls must be passed in the AIMessage constructor —
             not assigned afterward — so LangChain sets all internal fields.
          3. ToolMessage name must be passed in the constructor — not patched.
        """
        restored = []
        for m in raw_messages:
            if not isinstance(m, dict):
                restored.append(m)
                continue

            msg_type = m.get("type", "")
            content  = m.get("content", "") or ""

            if msg_type == "human":
                restored.append(HumanMessage(content=content))

            elif msg_type == "ai":
                tool_calls = m.get("tool_calls") or None
                # Pass tool_calls in constructor — never assign afterward.
                # LangChain uses the constructor to set additional_kwargs too.
                if tool_calls:
                    restored.append(AIMessage(
                        content=content,
                        tool_calls=tool_calls,
                    ))
                else:
                    restored.append(AIMessage(content=content))

            elif msg_type == "system":
                restored.append(SystemMessage(content=content))

            elif msg_type == "tool":
                # Pass name in constructor — not by attribute assignment.
                restored.append(ToolMessage(
                    content=content,
                    tool_call_id=m.get("tool_call_id") or "",
                    name=m.get("name") or "",
                ))

            # skip unknown types silently

        # Orphan guard: drop any ToolMessage whose IMMEDIATELY preceding
        # message is not an AIMessage with tool_calls.
        # Checking "any previous AIMessage" is wrong — must be the direct parent.
        validated = []
        for msg in restored:
            if isinstance(msg, ToolMessage):
                prev = validated[-1] if validated else None
                is_paired = (
                    prev is not None
                    and isinstance(prev, AIMessage)
                    and getattr(prev, "tool_calls", None)
                )
                if not is_paired:
                    # Orphaned — drop silently to prevent OpenAI 400
                    continue
            validated.append(msg)

        return validated

    def delete(self, session_id: str) -> None:
        _redis.delete(f"session:{session_id}")

    def exists(self, session_id: str) -> bool:
        return bool(_redis.exists(f"session:{session_id}"))

    def refresh_ttl(self, session_id: str) -> None:
        _redis.expire(f"session:{session_id}", SESSION_TTL)

    # ── Completed Invoices ────────────────────────────────────────────────────

    def save_completed_invoice(self, state: Any) -> None:
        """Archive completed invoice for quick lookup."""
        if not hasattr(state, "oracle_invoice_number"):
            return
        key  = f"invoice:{state.user_id}:{state.oracle_invoice_number}"
        data = {
            "invoiceId":     state.oracle_invoice_id,
            "invoiceNumber": state.oracle_invoice_number,
            "status":        state.oracle_invoice_status,
            "amount":        state.invoice_amount,
            "currency":      state.currency,
            "supplier":      state.supplier.supplier_name,
            "businessUnit":  state.business_unit,
            "createdAt":     datetime.datetime.utcnow().isoformat(),
        }
        _redis.setex(key, COMPLETED_TTL, json.dumps(data))

    # ── Org Memory ────────────────────────────────────────────────────────────

    def save_gl_pattern(self, org_id: str, gl_combination: str) -> None:
        """Store frequently used GL combinations for an org."""
        key = f"org:{org_id}:gl_patterns"
        patterns = self._get_list(key)
        if gl_combination not in patterns:
            patterns.insert(0, gl_combination)
            patterns = patterns[:20]  # keep top 20
        _redis.setex(key, ORG_MEMORY_TTL, json.dumps(patterns))

    def get_gl_patterns(self, org_id: str) -> list:
        return self._get_list(f"org:{org_id}:gl_patterns")

    def save_supplier_default(self, org_id: str, supplier_id: int, defaults: dict) -> None:
        key = f"org:{org_id}:supplier:{supplier_id}:defaults"
        _redis.setex(key, ORG_MEMORY_TTL, json.dumps(defaults))

    def get_supplier_default(self, org_id: str, supplier_id: int) -> Optional[dict]:
        raw = _redis.get(f"org:{org_id}:supplier:{supplier_id}:defaults")
        return json.loads(raw) if raw else None

    def _get_list(self, key: str) -> list:
        raw = _redis.get(key)
        if not raw:
            return []
        try:
            return json.loads(raw)
        except Exception:
            return []

    # ── Health ────────────────────────────────────────────────────────────────

    def ping(self) -> bool:
        try:
            return _redis.ping()
        except Exception:
            return False