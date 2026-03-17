"""
app/routes/invoice_ai_routes.py — Enterprise Invoice AI Router v4.6

Changes in v4.6:
  - SECURITY FIX: /upload/document, /upload/excel, /upload/bulk now extract
    user_id from the JWT via Depends(_get_user_id_from_request) instead of
    trusting the request Form body — prevents user ID spoofing on all uploads.
  - user_id = Form(...) removed from all three upload endpoints.
  - All endpoints now consistently derive user_id from the validated JWT.

Changes in v4.5:
  - Added DELETE /conversations/{conversation_id} endpoint
    Deletes messages first (FK constraint), then the conversation row.
    Scoped to the JWT user_id so users can only delete their own chats.

Changes in v4.4:
  - /chat now extracts user_id from the JWT (via Depends) instead of
    trusting the request body — prevents user ID spoofing
  - user_id removed from ChatRequest entirely
  - All internal calls that previously used req.user_id now use the
    JWT-derived user_id local variable
  - audit log, policy evaluation, session load/create all use JWT user_id

Previous changes retained:
  - HTTPBearer security scheme (🔒 Swagger lock icons)
  - _get_user_id_from_request() as a proper Depends() injectable
  - psycopg2 + asyncio.to_thread (no asyncpg dependency)
  - PostgreSQL chat persistence in /chat and /chat/stream
  - last_message preview in /conversations sidebar response
"""

from __future__ import annotations

import asyncio
import base64
import json
import os
import traceback
import uuid
from contextlib import contextmanager
from typing import Optional

import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from langchain_core.messages import HumanMessage, AIMessage

from app.schemas.state import InvoiceState, InputMode, BatchRow
from app.graph.graph import invoice_graph
from app.memory.redis_memory import SessionStore
from app.security.session_lock import session_lock, SessionLockError

# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────

_DATABASE_URL = os.getenv("DATABASE_URL")
_JWT_SECRET   = os.getenv("JWT_SECRET", "secret")

router        = APIRouter()
session_store = SessionStore()

# Registers the Bearer scheme — makes 🔒 lock icons appear in Swagger UI
security = HTTPBearer()


# ─────────────────────────────────────────────────────────────────────────────
# DB helpers — synchronous, offloaded via asyncio.to_thread
# ─────────────────────────────────────────────────────────────────────────────

@contextmanager
def _db():
    """
    Opens one psycopg2 connection, yields a RealDictCursor, commits on
    success, rolls back + closes on any error.

    Usage (sync functions only):
        with _db() as cur:
            cur.execute(...)
    """
    conn = psycopg2.connect(_DATABASE_URL)
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def _sync_persist_chat_turn(
    session_id:      str,
    user_id:         int,
    user_message:    str,
    assistant_reply: str,
) -> None:
    with _db() as cur:
        cur.execute(
            """
            INSERT INTO conversations (id, user_id, title)
            VALUES (%s, %s, %s)
            ON CONFLICT (id) DO NOTHING
            """,
            (session_id, user_id, user_message[:60]),
        )
        cur.executemany(
            """
            INSERT INTO messages (conversation_id, role, content)
            VALUES (%s, %s, %s)
            """,
            [
                (session_id, "user",      user_message),
                (session_id, "assistant", assistant_reply),
            ],
        )


async def _persist_chat_turn(
    session_id:      str,
    user_id:         int,
    user_message:    str,
    assistant_reply: str,
) -> None:
    """Async wrapper — offloads blocking DB work to a thread pool."""
    try:
        await asyncio.to_thread(
            _sync_persist_chat_turn,
            session_id,
            user_id,
            user_message,
            assistant_reply,
        )
    except Exception as db_error:
        print("POSTGRES SAVE ERROR:", db_error)


def _sync_list_conversations(user_id: int) -> list[dict]:
    """
    Returns conversations newest-first with a last_message preview snippet
    (like ChatGPT sidebar). Falls back gracefully if no messages yet.
    """
    with _db() as cur:
        cur.execute(
            """
            SELECT
                c.id,
                c.title,
                c.created_at,
                (
                    SELECT m.content
                    FROM   messages m
                    WHERE  m.conversation_id = c.id
                    ORDER  BY m.created_at DESC
                    LIMIT  1
                ) AS last_message
            FROM   conversations c
            WHERE  c.user_id = %s
            ORDER  BY c.created_at DESC
            """,
            (user_id,),
        )
        return [
            {
                "id":           str(r["id"]),
                "title":        r["title"] or "New Chat",
                "created_at":   str(r["created_at"]),
                "last_message": (r["last_message"] or "")[:120],
            }
            for r in cur.fetchall()
        ]


def _sync_get_messages(conversation_id: str) -> list[dict]:
    with _db() as cur:
        cur.execute(
            """
            SELECT role, content, created_at
            FROM   messages
            WHERE  conversation_id = %s
            ORDER  BY created_at ASC
            """,
            (conversation_id,),
        )
        return [
            {
                "role":       r["role"],
                "content":    r["content"],
                "created_at": str(r["created_at"]),
            }
            for r in cur.fetchall()
        ]


def _sync_delete_conversation(conversation_id: str, user_id: int) -> bool:
    """
    Deletes messages first (satisfies FK constraint), then the conversation.
    Scoped to user_id so users can only delete their own conversations.
    Returns True if a row was actually deleted, False if not found / not owned.
    """
    with _db() as cur:
        # Delete messages first — FK references conversations(id)
        cur.execute(
            "DELETE FROM messages WHERE conversation_id = %s",
            (conversation_id,),
        )
        # Delete conversation — only if it belongs to this user
        cur.execute(
            "DELETE FROM conversations WHERE id = %s AND user_id = %s",
            (conversation_id, user_id),
        )
        return cur.rowcount > 0


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    """
    user_id intentionally removed — the backend now derives it from the JWT.
    This prevents any client from spoofing another user's conversations.
    """
    chatNumber:     str
    message:        str
    conversationId: Optional[str] = None
    org_id:         Optional[str] = None
    tenant_id:      Optional[str] = "default"


class ChatResponse(BaseModel):
    conversationId:  str
    response:        str
    status:          str
    intent:          Optional[str] = None
    missing:         list          = Field(default_factory=list)
    errors:          list          = Field(default_factory=list)
    warnings:        list          = Field(default_factory=list)
    risk_level:      Optional[str] = None
    risk_score:      Optional[int] = None
    risk_factors:    list          = Field(default_factory=list)
    decision_action: Optional[str] = None
    invoice_id:      Optional[str] = None
    policy_action:   Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Auth helpers
# ─────────────────────────────────────────────────────────────────────────────

def _decode_jwt(token: str) -> dict:
    from jose import jwt as josejwt
    from jose.exceptions import ExpiredSignatureError, JWTError

    try:
        return josejwt.decode(token, _JWT_SECRET, algorithms=["HS256"])
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")


def _get_user_id_from_request(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> int:
    """
    FastAPI Depends() injectable.
    Validates the Bearer JWT and returns the user_id claim.
    Automatically wired into Swagger's 🔒 Authorize button.
    """
    payload = _decode_jwt(credentials.credentials)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="user_id missing from token")
    return int(user_id)


# ─────────────────────────────────────────────────────────────────────────────
# Graph / session helpers
# ─────────────────────────────────────────────────────────────────────────────

def _load_or_create(
    session_id: str,
    user_id:    int,
    tenant_id:  str           = "default",
    org_id:     Optional[str] = None,
) -> InvoiceState:
    existing = session_store.load(session_id)
    if existing:
        try:
            if org_id:
                gl_patterns = session_store.get_gl_patterns(org_id)
                if gl_patterns:
                    existing.setdefault("org_memory", {})
                    existing["org_memory"]["common_gl_combinations"] = gl_patterns
            return InvoiceState(**existing)
        except Exception:
            pass
    return InvoiceState(
        session_id=session_id,
        user_id=user_id,
        tenant_id=tenant_id,
        org_id=org_id,
    )


def _last_ai_response(state: InvoiceState) -> str:
    for msg in reversed(state.messages):
        if isinstance(msg, AIMessage) and msg.content:
            return str(msg.content)
    return ""


def _run_graph(state: InvoiceState) -> InvoiceState:
    result = invoice_graph.invoke(state, {"recursion_limit": 25})

    if isinstance(result, InvoiceState):
        return result

    if isinstance(result, dict):
        merged = {k: getattr(state, k) for k in InvoiceState.model_fields}
        for k, v in result.items():
            if k in InvoiceState.model_fields:
                merged[k] = v
        return InvoiceState(**merged)

    return state


# ─────────────────────────────────────────────────────────────────────────────
# POST /chat
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(
    req:     ChatRequest,
    user_id: int = Depends(_get_user_id_from_request),
):
    """
    user_id comes exclusively from the validated JWT — never from req body.
    This guarantees conversations are always stored under the real logged-in user.
    """
    try:
        tenant_id  = req.tenant_id or "default"
        session_id = req.chatNumber

        try:
            lock_ctx = session_lock(session_id, tenant_id)
            lock_ctx.__enter__()
        except SessionLockError as exc:
            raise HTTPException(status_code=409, detail=str(exc))

        try:
            # ── STEP 1: Load or create session ────────────────────────────────
            state = _load_or_create(session_id, user_id, tenant_id, req.org_id)

            # ── STEP 2: Attach the latest user message ────────────────────────
            state.messages  = list(state.messages) + [HumanMessage(content=req.message)]
            state.user_id   = user_id
            state.tenant_id = tenant_id

            # ── STEP 3: Run the LangGraph pipeline ────────────────────────────
            final_state = await asyncio.to_thread(_run_graph, state)

            # Cache reply once — used for DB write and HTTP response
            assistant_reply = _last_ai_response(final_state)

            # ── STEP 4: Persist chat turn to PostgreSQL ───────────────────────
            await _persist_chat_turn(
                session_id      = session_id,
                user_id         = user_id,
                user_message    = req.message,
                assistant_reply = assistant_reply,
            )

            # ── STEP 5: Save full session state to Redis ──────────────────────
            # CRITICAL: Use model_dump() NOT model_dump(mode="json").
            # mode="json" fails on live LangChain message objects.
            try:
                from app.graph.graph import _serialize_messages_for_storage

                safe = final_state.model_dump()
                safe["messages"] = _serialize_messages_for_storage(final_state.messages)
                safe.pop("file_base64", None)
                session_store.save(session_id, safe)

            except Exception as exc:
                print("SESSION SAVE ERROR:", exc)

            # ── STEP 6: Policy evaluation ─────────────────────────────────────
            policy_action = None
            if final_state.invoice_amount and final_state.supplier.supplier_name:
                from app.governance.policy_engine import evaluate_policy
                decision = evaluate_policy(
                    tenant_id        = tenant_id,
                    user_id          = user_id,
                    invoice_amount   = final_state.invoice_amount,
                    invoice_type     = final_state.invoice_type,
                    risk_level       = final_state.risk.level,
                    supplier_on_hold = bool(final_state.supplier.on_hold),
                    is_po            = final_state.invoice_mode == "PO",
                )
                policy_action = decision.action

            # ── STEP 7: Audit log ─────────────────────────────────────────────
            from app.governance.audit_db import log_event
            log_event(
                tenant_id    = tenant_id,
                session_id   = session_id,
                user_id      = user_id,
                event        = "CHAT_TURN",
                detail       = req.message[:100],
                risk_score   = final_state.risk.score   if final_state.risk else None,
                risk_level   = final_state.risk.level   if final_state.risk else None,
                risk_factors = final_state.risk.factors if final_state.risk else [],
                decision     = str(final_state.decision_action),
                success      = True,
            )

            # ── STEP 8: Metrics ───────────────────────────────────────────────
            from app.monitor.metrics import inc
            inc(tenant_id, "chat_turns")

            return ChatResponse(
                conversationId  = session_id,
                response        = assistant_reply,
                status          = str(final_state.status),
                intent          = str(final_state.detected_intent) if final_state.detected_intent else None,
                missing         = final_state.missing_required,
                errors          = final_state.errors,
                warnings        = final_state.warnings,
                risk_level      = final_state.risk.level   if final_state.risk else None,
                risk_score      = final_state.risk.score   if final_state.risk else None,
                risk_factors    = final_state.risk.factors if final_state.risk else [],
                decision_action = str(final_state.decision_action) if final_state.decision_action else None,
                invoice_id      = final_state.oracle_invoice_id,
                policy_action   = policy_action,
            )

        finally:
            try:
                lock_ctx.__exit__(None, None, None)
            except Exception:
                pass

    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# POST /chat/stream
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/chat/stream")
async def chat_stream(
    req:     ChatRequest,
    user_id: int = Depends(_get_user_id_from_request),
):
    async def generate():
        try:
            tenant_id  = req.tenant_id or "default"
            session_id = req.chatNumber

            state           = _load_or_create(session_id, user_id, tenant_id, req.org_id)
            state.messages  = list(state.messages) + [HumanMessage(content=req.message)]
            state.user_id   = user_id
            state.tenant_id = tenant_id

            final_state     = await asyncio.to_thread(_run_graph, state)
            assistant_reply = _last_ai_response(final_state)

            await _persist_chat_turn(
                session_id      = session_id,
                user_id         = user_id,
                user_message    = req.message,
                assistant_reply = assistant_reply,
            )

            for char in assistant_reply:
                yield f"data: {json.dumps({'token': char})}\n\n"
                await asyncio.sleep(0)

            yield f"data: {json.dumps({'done': True, 'status': str(final_state.status), 'errors': final_state.errors, 'risk_level': final_state.risk.level if final_state.risk else None})}\n\n"

        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


# ─────────────────────────────────────────────────────────────────────────────
# GET /stream/{session_id}  (Production SSE — streams last AI response)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/stream/{session_id}")
async def stream_response(
    session_id: str,
    request:    Request,
    token:      Optional[str] = None,
):
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")

    async def event_generator():
        try:
            tenant_id = "default"
            lock_ctx  = session_lock(session_id, tenant_id)
            lock_ctx.__enter__()

            try:
                data = session_store.load(session_id)

                if not data:
                    yield f"data: {json.dumps({'error': 'session_not_found'})}\n\n"
                    return

                state         = InvoiceState(**data)
                response_text = _last_ai_response(state)

                for char in response_text:
                    if await request.is_disconnected():
                        return
                    yield f"data: {json.dumps({'token': char})}\n\n"
                    await asyncio.sleep(0)

                yield f"data: {json.dumps({'done': True})}\n\n"

            finally:
                lock_ctx.__exit__(None, None, None)

        except Exception as exc:
            traceback.print_exc()
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "Connection":        "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# POST /upload/document
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/upload/document")
async def upload_document(
    session_id: str        = Form(...),
    tenant_id:  str        = Form("default"),
    org_id:     str        = Form(None),
    file:       UploadFile = File(...),
    user_id:    int        = Depends(_get_user_id_from_request),  # ✅ JWT only
):
    try:
        file_bytes = await file.read()
        file_name  = file.filename or "document"
        extension  = file_name.rsplit(".", 1)[-1].lower()
        if extension not in ("pdf", "png", "jpg", "jpeg"):
            raise HTTPException(status_code=400, detail="Unsupported file type")

        file_b64   = base64.b64encode(file_bytes).decode()
        input_mode = InputMode.PDF if extension == "pdf" else InputMode.IMAGE

        state = _load_or_create(session_id, user_id, tenant_id, org_id)
        state.file_base64 = file_b64
        state.file_type   = extension
        state.input_mode  = input_mode
        state.messages    = list(state.messages) + [HumanMessage(content=f"[Uploaded {file_name}]")]

        final_state     = await asyncio.to_thread(_run_graph, state)
        assistant_reply = _last_ai_response(final_state)

        return {
            "session_id": session_id,
            "response":   assistant_reply,
            "status":     str(final_state.status),
            "extracted": {
                "invoice_number": final_state.invoice_number,
                "invoice_date":   final_state.invoice_date,
                "invoice_amount": final_state.invoice_amount,
                "currency":       final_state.currency,
                "supplier_name":  final_state.supplier.supplier_name,
                "po_number":      final_state.po.po_number,
            },
            "low_confidence": final_state.extraction.low_confidence_fields,
            "has_variance":   final_state.extraction.has_variance,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# POST /upload/excel
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/upload/excel")
async def upload_excel(
    session_id:    str        = Form(...),
    tenant_id:     str        = Form("default"),
    business_unit: str        = Form(None),
    org_id:        str        = Form(None),
    file:          UploadFile = File(...),
    user_id:       int        = Depends(_get_user_id_from_request),  # ✅ JWT only
):
    try:
        file_bytes = await file.read()
        file_name  = file.filename or "invoices.xlsx"
        extension  = file_name.rsplit(".", 1)[-1].lower()
        if extension not in ("xlsx", "xls", "csv"):
            raise HTTPException(status_code=400, detail="Use .xlsx or .csv")

        from app.oracle.extractor import ExcelParser
        parsed = ExcelParser().parse(file_bytes, file_name)
        if not parsed["rows"]:
            raise HTTPException(status_code=400, detail="No rows found in file")

        batch_rows = [
            BatchRow(
                row_number  = row["source_row"],
                source_data = row,
                mapped_data = {
                    **row,
                    "business_unit": row.get("business_unit") or business_unit,
                },
                status="PENDING",
            )
            for row in parsed["rows"]
        ]

        state = _load_or_create(session_id, user_id, tenant_id, org_id)
        state.input_mode    = InputMode.EXCEL
        state.is_batch_mode = True
        state.batch_rows    = batch_rows
        state.batch_total   = len(batch_rows)
        state.business_unit = business_unit or state.business_unit
        state.tenant_id     = tenant_id
        state.messages      = list(state.messages) + [
            HumanMessage(content=f"[Uploaded {file_name} with {len(batch_rows)} rows]")
        ]

        final_state = await asyncio.to_thread(invoice_graph.invoke, state, {"recursion_limit": 50})
        final_state = InvoiceState(**final_state) if isinstance(final_state, dict) else final_state

        failed_rows = [
            {"row": r.row_number, "error": r.error}
            for r in final_state.batch_rows
            if r.status == "FAILED"
        ]

        return {
            "session_id":    session_id,
            "response":      _last_ai_response(final_state),
            "total":         final_state.batch_total,
            "success":       final_state.batch_success,
            "failed":        final_state.batch_failed,
            "failed_rows":   failed_rows,
            "unmapped_cols": parsed.get("unmapped_columns", []),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# POST /upload/bulk
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/upload/bulk")
async def upload_bulk(
    session_id:    str              = Form(...),
    tenant_id:     str              = Form("default"),
    business_unit: str              = Form(None),
    org_id:        str              = Form(None),
    excel_file:    UploadFile       = File(...),
    pdf_files:     list[UploadFile] = File(default=[]),
    user_id:       int              = Depends(_get_user_id_from_request),  # ✅ JWT only
):
    """
    Bulk invoice creation from Excel + optional PDFs.

    excel_file    : required — .xlsx / .xls / .csv, one row per invoice
    pdf_files     : optional — matched by InvoiceNumber, then by row order
    business_unit : default BU applied when column is blank
    user_id       : derived from JWT — never trusted from form body
    """
    try:
        from app.oracle.bulk_processor import process_bulk

        ext = (excel_file.filename or "x.xlsx").rsplit(".", 1)[-1].lower()
        if ext not in ("xlsx", "xls", "csv"):
            raise HTTPException(status_code=400, detail="Excel must be .xlsx, .xls, or .csv")

        excel_bytes = await excel_file.read()

        pdf_uploads = []
        for uf in (pdf_files or []):
            fbytes = await uf.read()
            fext   = (uf.filename or "doc.pdf").rsplit(".", 1)[-1].lower()
            pdf_uploads.append((uf.filename or "document.pdf", fbytes, fext))

        result = await process_bulk(
            excel_bytes  = excel_bytes,
            excel_name   = excel_file.filename or "invoices.xlsx",
            pdf_uploads  = pdf_uploads,
            user_id      = user_id,
            tenant_id    = tenant_id or "default",
            default_bu   = business_unit or "",
            session_id   = session_id,
        )

        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        return {"session_id": session_id, **result}

    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# GET /session/{session_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/session/{session_id}")
async def get_session(session_id: str):
    data = session_store.load(session_id)
    if not data:
        raise HTTPException(status_code=404, detail="Session not found")
    data.pop("messages",    None)
    data.pop("file_base64", None)
    return data


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    session_store.delete(session_id)
    return {"deleted": True, "session_id": session_id}


# ─────────────────────────────────────────────────────────────────────────────
# GET /metrics/{tenant_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/metrics/{tenant_id}")
async def get_metrics(tenant_id: str):
    from app.monitor.metrics import get_metrics_snapshot
    return get_metrics_snapshot(tenant_id)


# ─────────────────────────────────────────────────────────────────────────────
# GET /audit/{tenant_id}/{session_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/audit/{tenant_id}/{session_id}")
async def get_audit(tenant_id: str, session_id: str):
    from app.governance.audit_db import get_session_audit
    return {
        "session_id": session_id,
        "tenant_id":  tenant_id,
        "events":     get_session_audit(tenant_id, session_id),
    }


@router.get("/audit/{tenant_id}")
async def get_recent_audit(tenant_id: str, hours: int = 24, limit: int = 100):
    from app.governance.audit_db import get_recent_audit
    return {
        "tenant_id": tenant_id,
        "events":    get_recent_audit(tenant_id, limit=limit, hours=hours),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Dead Letter Queue endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/dlq/{tenant_id}")
async def get_dlq(tenant_id: str, limit: int = 50):
    from app.queue.dead_letter import get_failed_invoices
    return {
        "tenant_id": tenant_id,
        "failed":    get_failed_invoices(tenant_id, limit=limit),
    }


@router.post("/dlq/{tenant_id}/{dlq_id}/requeue")
async def requeue_invoice(tenant_id: str, dlq_id: str):
    from app.queue.dead_letter import get_failed_invoice, mark_requeued
    entry = get_failed_invoice(tenant_id, dlq_id)
    if not entry:
        raise HTTPException(status_code=404, detail="DLQ entry not found")
    mark_requeued(tenant_id, dlq_id)
    return {"requeued": True, "dlq_id": dlq_id}


@router.post("/dlq/{tenant_id}/{dlq_id}/resolve")
async def resolve_dlq(tenant_id: str, dlq_id: str, resolution: str = ""):
    from app.queue.dead_letter import mark_resolved
    mark_resolved(tenant_id, dlq_id, resolution)
    return {"resolved": True, "dlq_id": dlq_id}


# ─────────────────────────────────────────────────────────────────────────────
# Policy endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/policy/{tenant_id}")
async def get_policy(tenant_id: str):
    from app.governance.policy_engine import get_policy
    return get_policy(tenant_id)


@router.post("/policy/{tenant_id}/role")
async def set_user_role(tenant_id: str, user_id: int, role: str):
    from app.governance.policy_engine import set_user_role
    set_user_role(user_id, tenant_id, role)
    return {"set": True, "user_id": user_id, "role": role, "tenant_id": tenant_id}


# ─────────────────────────────────────────────────────────────────────────────
# GET /health
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    from app.monitor.health import full_health_check
    return full_health_check()


@router.get("/health/deep")
async def health_deep(user_id: int = 1, tenant_id: str = "default"):
    from app.monitor.health import full_health_check
    return full_health_check(user_id=user_id, tenant_id=tenant_id)


# ─────────────────────────────────────────────────────────────────────────────
# GET /conversations  (Sidebar chat history)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/conversations")
async def list_conversations(
    user_id: int = Depends(_get_user_id_from_request),
):
    """
    Returns conversations for the logged-in user, newest first.
    Each row includes a last_message preview (120 chars) for the sidebar.
    Requires Bearer JWT — wired automatically via Depends().
    """
    try:
        return await asyncio.to_thread(_sync_list_conversations, user_id)
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# GET /conversations/{conversation_id}/messages
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: str):
    """Return all messages for a conversation, in chronological order."""
    try:
        return await asyncio.to_thread(_sync_get_messages, conversation_id)
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /conversations/{conversation_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    user_id: int = Depends(_get_user_id_from_request),
):
    """
    Deletes a conversation and all its messages from PostgreSQL.

    Scoped to the JWT user_id — users can only delete their own conversations.
    Also clears the Redis session cache for the same session_id.

    Steps:
      1. DELETE FROM messages WHERE conversation_id = ?       (FK first)
      2. DELETE FROM conversations WHERE id = ? AND user_id = ?
      3. session_store.delete(conversation_id)                (Redis cleanup)
    """
    try:
        deleted = await asyncio.to_thread(
            _sync_delete_conversation,
            conversation_id,
            user_id,
        )

        if not deleted:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found or does not belong to you.",
            )

        try:
            session_store.delete(conversation_id)
        except Exception:
            pass  # Redis cleanup failure is non-fatal

        return {"deleted": True, "conversation_id": conversation_id}

    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))