"""
graph/graph.py

Oracle Invoice AI — Production LangGraph state machine.

PRODUCTION RULES (do not break):
  1. streaming=False for tool-calling LLM (prevents tool_call_id mismatch)
  2. Never inject SystemMessage mid tool chain
  3. Always append messages as plain list (no add_messages reducer)
  4. Use model_dump() not .dict()
  5. Use model_copy() not .copy()
  6. One tool call per agent turn maximum
  7. ToolMessage must follow AIMessage with tool_calls immediately
  8. Never overwrite non-null state with null

v4.3 changes:
  - FIX: po_number removed from generic _merge() loop in field_extractor_node.
    LLM-extracted PO now validated against r'^\d{3}-PO-\d{6,}$' before merge.
    Garbage values ("ber", "po", "number") no longer overwrite a valid PO
    that was already stored in state from an earlier turn.

v4.2 changes:
  - FIX: PO regex now catches bare PO numbers like "101-PO-25008859" without
    requiring a "po" prefix. Old regex only matched "po number X" style,
    causing "ber" to be extracted instead of the real PO.

v4.1 changes:
  - field_validator_node: fires AWAITING_PO_DECISION before AWAITING_CONFIRM
  - auto_create_node: uses unified create_invoice() with optional po_number
  - route_after_field_validator: handles AWAITING_PO_DECISION -> agent
  - field_extractor_node: detects po_decision_made from user message
"""

from __future__ import annotations
import json
import re
import time
from typing import Any

from langchain_core.messages import (
    AIMessage, HumanMessage, SystemMessage, ToolMessage
)
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from app.schemas.state import (
    InvoiceState, InvoiceStatus, AgentIntent, InputMode,
    InvoiceLine, InvoiceDistribution, InvoiceInstallment,
    SupplierInfo, POInfo, TaxInfo, ValidationResult,
    ExtractionResult, BatchRow, BusinessUnitInfo, RiskScore,
    OracleHold,
)
from app.tools.tools import ALL_TOOLS
from app.prompts.master_prompt import build_system_prompt
from app.memory.redis_memory import SessionStore
from app.monitor.monitor import Monitor

session_store = SessionStore()


# -----------------------------------------------------------------------------
# LLM factory
# streaming=False for tool-calling LLM — CRITICAL to prevent 400 errors
# -----------------------------------------------------------------------------

def get_llm(tools=None, temperature=0.1, streaming=False):
    llm = ChatOpenAI(
        model="gpt-4o",
        temperature=temperature,
        streaming=streaming,
    )
    if tools:
        return llm.bind_tools(tools, tool_choice="auto")
    return llm


# -----------------------------------------------------------------------------
# Intent classifier prompt
# -----------------------------------------------------------------------------

INTENT_PROMPT = """
Classify this user message for Oracle Fusion AP Invoice system.
Reply with EXACTLY one word from this list:

CREATE_INVOICE   user wants to create a new invoice
QUERY_STATUS     asking about invoice status, payment, due date
MANAGE_HOLDS     asking about invoice holds
CANCEL_INVOICE   wants to cancel or void an invoice
BULK_PROCESS     uploaded Excel/CSV for batch creation
SCAN_DOCUMENT    uploaded PDF/image for extraction
GENERAL_QUERY    general Oracle AP question
CORRECT_FIELD    correcting a previously entered value
CONFIRM          confirming / approving a previous summary
REJECT           rejecting / cancelling a previous summary
"""


# -----------------------------------------------------------------------------
# Field extraction prompt
# -----------------------------------------------------------------------------

FIELD_EXTRACT_PROMPT = """
Extract invoice fields from this message. Return ONLY valid JSON, no explanation.
Use null for any field not mentioned.

{
  "business_unit": null,
  "supplier_name": null,
  "supplier_site": null,
  "invoice_number": null,
  "invoice_date": "YYYY-MM-DD or null",
  "invoice_amount": number or null,
  "currency": "3-letter ISO or null",
  "invoice_type": "Standard|Credit Memo|Prepayment|Debit Memo or null",
  "payment_terms": "e.g. NET30, NET45, IMMEDIATE, or null",
  "invoice_mode": "PO or NON_PO or null",
  "po_number": null,
  "description": null,
  "invoice_group": null,
  "lines": [
    {
      "line_number": int,
      "line_type": "Item|Freight|Tax",
      "line_amount": number,
      "description": str,
      "distribution_combination": "GL combination string or null"
    }
  ],
  "user_confirmed": true or false or null,
  "correction_mode": true or false or null,
  "po_decision_made": true or false or null,
  "po_skipped": true or false or null
}

Rules:
- "15k" -> 15000, "100 thousand" -> 100000
- "confirm", "yes", "ok", "proceed", "create it", "looks good" -> user_confirmed: true
- "cancel", "stop", "reset", "no" -> user_confirmed: false
- "actually", "change", "I meant", "correction" -> correction_mode: true
- PO invoice keywords: "PO invoice", "purchase order invoice", "match to PO"
- GL combination pattern: digits separated by dots or dashes (e.g. 101.05.1112)
- If currency not mentioned and context is UAE -> AED
- invoice_type default is "Standard"
- payment_terms: extract values like "net 30", "30 days", "immediate", "NET45"
- description: extract if mentioned
- "no po", "no purchase order", "skip po", "without po", "standalone" -> po_skipped: true, po_decision_made: true
- "po number: X", "PO: X", "purchase order X", or bare PO number like "101-PO-25008859" -> po_decision_made: true, po_number: X
"""


# -----------------------------------------------------------------------------
# Helper: non-destructive merge
# -----------------------------------------------------------------------------

def _merge(new_val, existing_val):
    """Return new_val only if it's not None/empty, else keep existing."""
    if new_val is not None and new_val != "" and new_val != []:
        return new_val
    return existing_val


# -----------------------------------------------------------------------------
# PO number regex — catches all common formats
#
# Group 1: bare format  101-PO-25008859  (no prefix required)
# Group 2: prefixed     po: X / po# X / po number X
#
# Tested against:
#   "101-PO-25008859"           -> "101-PO-25008859"  ✓
#   "po number 101-PO-25008859" -> "101-PO-25008859"  ✓
#   "yes 101-PO-25008859"       -> "101-PO-25008859"  ✓
#   "po: 101-PO-25008859"       -> "101-PO-25008859"  ✓
#   "PO#101-PO-25008859"        -> "101-PO-25008859"  ✓
#   "ber"                       -> None               ✓
#   "skip"                      -> None               ✓
# -----------------------------------------------------------------------------

_PO_REGEX = re.compile(
    r'\b(\d{2,4}-[Pp][Oo]-\d{4,12})\b'
    r'|(?:po\s*(?:number|num|#|no|:)?\s*[:\-]?\s*)([A-Z0-9][A-Z0-9_\-]{4,})',
    re.IGNORECASE,
)


def _extract_po_from_text(text: str):
    """
    Extract PO number from free-form text.
    Returns the PO string (uppercased) or None.
    """
    m = _PO_REGEX.search(text)
    if m:
        val = (m.group(1) or m.group(2) or "").strip().upper()
        return val if val else None
    return None


# -----------------------------------------------------------------------------
# NODE 1 — INTENT CLASSIFIER
# -----------------------------------------------------------------------------

def intent_classifier_node(state: InvoiceState) -> dict:
    monitor = Monitor(state.session_id, state.user_id)
    monitor.node_start("intent_classifier")

    last_human = next(
        (m.content for m in reversed(state.messages) if isinstance(m, HumanMessage)), ""
    )

    if state.input_mode == "PDF" or state.input_mode == "IMAGE":
        monitor.node_end("intent_classifier")
        return {
            "detected_intent": AgentIntent.SCAN_DOCUMENT,
            "status":          InvoiceStatus.EXTRACTING,
            "current_node":    "intent_classifier",
        }
    if state.input_mode == "EXCEL":
        monitor.node_end("intent_classifier")
        return {
            "detected_intent": AgentIntent.BULK_PROCESS,
            "is_batch_mode":   True,
            "current_node":    "intent_classifier",
        }

    # Intent lock: once CREATE_INVOICE is set, don't overwrite it
    if state.detected_intent == AgentIntent.CREATE_INVOICE:
        monitor.node_end("intent_classifier")
        return {
            "detected_intent":  AgentIntent.CREATE_INVOICE,
            "raw_user_message": last_human,
            "current_node":     "intent_classifier",
        }

    llm      = get_llm(temperature=0, streaming=False)
    response = llm.invoke([
        SystemMessage(content=INTENT_PROMPT),
        HumanMessage(content=last_human),
    ])
    try:
        intent = AgentIntent(response.content.strip().upper())
    except ValueError:
        intent = AgentIntent.CREATE_INVOICE

    has_invoice_data = bool(
        state.business_unit or state.supplier.supplier_name
        or state.invoice_number or state.invoice_amount
    )
    if has_invoice_data and intent in (AgentIntent.GENERAL_QUERY, AgentIntent.CONFIRM):
        intent = AgentIntent.CREATE_INVOICE

    monitor.node_end("intent_classifier")
    return {
        "detected_intent":  intent,
        "raw_user_message": last_human,
        "current_node":     "intent_classifier",
    }


# -----------------------------------------------------------------------------
# NODE 2 — FIELD EXTRACTOR
# -----------------------------------------------------------------------------

def field_extractor_node(state: InvoiceState) -> dict:
    monitor = Monitor(state.session_id, state.user_id)
    monitor.node_start("field_extractor")

    if state.detected_intent not in (
        AgentIntent.CREATE_INVOICE, AgentIntent.CORRECT_FIELD,
        AgentIntent.CONFIRM, None
    ):
        monitor.node_end("field_extractor")
        return {"current_node": "field_extractor"}

    last_human = state.raw_user_message or ""
    if not last_human:
        monitor.node_end("field_extractor")
        return {"current_node": "field_extractor"}

    _msg_lower = last_human.lower().strip()

    # ── Regex fast-path: no-PO decision ──────────────────────────────────────
    _NO_PO_PHRASES = [
        "no po", "no purchase order", "skip po", "skip", "without po",
        "standalone", "create without po", "no - create", "no po —",
        "create as standalone",
    ]
    if (
        state.status == InvoiceStatus.AWAITING_PO_DECISION
        and not state.po_decision_made
        and any(p in _msg_lower for p in _NO_PO_PHRASES)
    ):
        monitor.node_end("field_extractor")
        return {
            "po_decision_made":      True,
            "po_skipped":            True,
            "awaiting_po_decision":  False,
            "invoice_mode":          "NON_PO",
            "current_node":          "field_extractor",
        }

    # ── Regex fast-path: PO number provided ──────────────────────────────────
    # FIX v4.2: use _PO_REGEX which catches bare "101-PO-25008859" without
    # requiring a "po" keyword prefix. The old regex missed bare PO numbers
    # and caused downstream extraction of "ber" from surrounding words.
    if (
        state.status == InvoiceStatus.AWAITING_PO_DECISION
        and not state.po_decision_made
    ):
        _po_val = _extract_po_from_text(last_human)
        if _po_val:
            po = state.po.model_dump()
            po["po_number"] = _po_val
            monitor.node_end("field_extractor")
            return {
                "po_decision_made":     True,
                "po_skipped":           False,
                "awaiting_po_decision": False,
                "invoice_mode":         "PO",
                "po":                   POInfo(**po),
                "current_node":         "field_extractor",
            }

    # ── Regex fast-path: confirmation detection ───────────────────────────────
    _CONFIRM_WORDS = {
        "yes", "ok", "okay", "confirm", "confirmed", "create",
        "proceed", "go ahead", "do it", "looks good", "correct",
        "create it", "yes create", "yes please", "approve", "submit",
    }
    if (
        not state.user_confirmed
        and state.status == InvoiceStatus.AWAITING_CONFIRM
        and any(_msg_lower == w or _msg_lower.startswith(w) for w in _CONFIRM_WORDS)
    ):
        monitor.node_end("field_extractor")
        return {
            "user_confirmed": True,
            "current_node":   "field_extractor",
        }

    # ── Regex fast-path: GL combination correction ────────────────────────────
    _gl_match = re.search(
        r"\b(\d{3,}\.\d{2,}\.\d{4,}(?:\.\d+){2,})\b", last_human
    )
    if _gl_match and state.lines:
        _gl_value = _gl_match.group(1)
        _patched  = [
            line.model_copy(update={"account_combination": _gl_value})
            for line in state.lines
        ]
        _temp_data = state.model_dump(exclude={"messages"})
        _temp_data["lines"] = [l.model_dump() for l in _patched]
        try:
            _temp    = InvoiceState(**_temp_data)
            _missing = _temp.get_missing_required()
        except Exception:
            _missing = state.get_missing_required()
        monitor.node_end("field_extractor")
        return {
            "lines":            _patched,
            "missing_required": _missing,
            "current_node":     "field_extractor",
        }

    llm      = get_llm(temperature=0, streaming=False)
    response = llm.invoke([
        SystemMessage(content=FIELD_EXTRACT_PROMPT),
        HumanMessage(content=last_human),
    ])

    try:
        raw       = re.sub(r'^```json\s*|^```\s*|\s*```$', '', response.content.strip())
        extracted = json.loads(raw)
    except Exception:
        monitor.node_end("field_extractor", success=False, error="JSON parse failed")
        return {"current_node": "field_extractor"}

    updates = {}

    for f in ["invoice_number", "invoice_date", "invoice_amount", "currency",
              "description", "business_unit", "payment_terms", "invoice_group"]:
        updates[f] = _merge(extracted.get(f), getattr(state, f, None))

    # po_number handled separately — validate before merging to prevent
    # garbage LLM extractions ("ber", "po", "number") from overwriting a
    # valid PO already stored in state.
    _llm_po_raw = extracted.get("po_number")
    if _llm_po_raw and re.match(r'^\d{3}-PO-\d{6,}$', str(_llm_po_raw).strip().upper()):
        updates["po_number"] = str(_llm_po_raw).strip().upper()
    else:
        updates["po_number"] = getattr(state, "po_number", None)  # keep existing

    updates["currency"]        = updates.get("currency") or "AED"
    updates["correction_mode"] = extracted.get("correction_mode", False)

    if extracted.get("user_confirmed") is True and not state.user_confirmed:
        updates["user_confirmed"] = True

    if extracted.get("invoice_type"):
        updates["invoice_type"] = extracted["invoice_type"]

    # ── PO decision from LLM extraction ──────────────────────────────────────
    if extracted.get("po_decision_made") and not state.po_decision_made:
        updates["po_decision_made"]     = True
        updates["awaiting_po_decision"] = False
        if extracted.get("po_skipped"):
            updates["po_skipped"]   = True
            updates["invoice_mode"] = "NON_PO"
        elif extracted.get("po_number"):
            updates["po_skipped"]   = False
            updates["invoice_mode"] = "PO"

    # Invoice mode
    if extracted.get("invoice_mode"):
        updates["invoice_mode"] = extracted["invoice_mode"]
    elif extracted.get("po_number"):
        updates["invoice_mode"] = "PO"

    # Supplier
    s = state.supplier.model_dump()
    if extracted.get("supplier_name") and not s["supplier_name"]:
        s["supplier_name"] = extracted["supplier_name"]
    if extracted.get("supplier_site") and not s["supplier_site_code"]:
        s["supplier_site_code"] = extracted["supplier_site"]
    updates["supplier"] = SupplierInfo(**s)

    # PO — also run _extract_po_from_text on raw text as a safety net
    po = state.po.model_dump()
    llm_po = extracted.get("po_number")
    if llm_po and not po["po_number"]:
        po["po_number"] = llm_po.strip().upper()
    elif not po["po_number"]:
        # Safety net: try regex on raw text in case LLM missed it
        regex_po = _extract_po_from_text(last_human)
        if regex_po:
            po["po_number"] = regex_po
            updates["invoice_mode"]     = "PO"
            updates["po_decision_made"] = True
            updates["po_skipped"]       = False
            updates["awaiting_po_decision"] = False
    updates["po"] = POInfo(**po)

    # ── Lines ─────────────────────────────────────────────────────────────────
    if extracted.get("lines") or extracted.get("invoice_amount"):

        for l in extracted.get("lines", []):
            if l.get("line_amount") is None:
                l["line_amount"] = (
                    extracted.get("invoice_amount")
                    or state.invoice_amount
                    or 0
                )

        if state.lines and extracted.get("lines"):
            extracted_line = extracted["lines"][0]
            updated_lines  = []
            for line in state.lines:
                patch     = {}
                new_amount = extracted_line.get("line_amount")
                new_gl     = extracted_line.get("distribution_combination")
                if new_amount is not None:
                    patch["line_amount"] = new_amount
                if new_gl:
                    patch["account_combination"] = new_gl
                updated_lines.append(
                    line.model_copy(update=patch) if patch else line
                )
            updates["lines"] = updated_lines

        elif extracted.get("lines"):
            updates["lines"] = [
                InvoiceLine(
                    line_number=l.get("line_number") or (i + 1),
                    line_type=l.get("line_type") or "Item",
                    line_amount=l.get("line_amount") or extracted.get("invoice_amount") or state.invoice_amount or 0,
                    description=l.get("description") or state.description,
                    account_combination=l.get("distribution_combination"),
                )
                for i, l in enumerate(extracted["lines"])
            ]
        else:
            amount = extracted.get("invoice_amount") or state.invoice_amount
            if amount and not state.lines:
                updates["lines"] = [
                    InvoiceLine(
                        line_number=1,
                        line_type="Item",
                        line_amount=amount,
                        description=extracted.get("description") or state.description,
                    )
                ]

    updates["current_node"] = "field_extractor"

    temp_data = state.model_dump(exclude={"messages"})
    temp_data.update({k: v for k, v in updates.items() if k != "messages"})
    try:
        temp = InvoiceState(**temp_data)
        updates["missing_required"] = temp.get_missing_required()
    except Exception:
        updates["missing_required"] = state.get_missing_required()

    monitor.node_end("field_extractor")
    return updates


# -----------------------------------------------------------------------------
# NODE 3 — DOCUMENT EXTRACTOR (PDF/Image)
# -----------------------------------------------------------------------------

def document_extractor_node(state: InvoiceState) -> dict:
    monitor = Monitor(state.session_id, state.user_id)
    monitor.node_start("document_extractor")

    if not state.file_base64:
        monitor.node_end("document_extractor", success=False)
        return {"current_node": "document_extractor", "errors": ["No file data in state"]}

    try:
        import base64
        from app.oracle.extractor import DocumentExtractor
        extractor  = DocumentExtractor()
        file_bytes = base64.b64decode(state.file_base64)
        result     = extractor.extract_from_file(file_bytes, state.file_type or "pdf")
    except Exception as e:
        monitor.node_end("document_extractor", success=False, error=str(e))
        return {"current_node": "document_extractor", "errors": [f"Extraction failed: {e}"]}

    updates = {
        "invoice_number": _merge(result.get("invoice_number"), state.invoice_number),
        "invoice_date":   _merge(result.get("invoice_date"),   state.invoice_date),
        "invoice_amount": _merge(result.get("total_amount"),   state.invoice_amount),
        "currency":       _merge(result.get("currency"),       state.currency) or "AED",
        "description":    _merge(result.get("description"),    state.description),
        "payment_terms":  _merge(result.get("payment_terms"),  state.payment_terms),
    }

    if result.get("po_number") and not state.po.po_number:
        po = state.po.model_dump()
        po["po_number"] = result["po_number"]
        updates["po"]           = POInfo(**po)
        updates["invoice_mode"] = "PO"

    s = state.supplier.model_dump()
    if result.get("supplier_name") and not s["supplier_name"]:
        s["supplier_name"] = result["supplier_name"]
    updates["supplier"] = SupplierInfo(**s)

    if result.get("lines"):
        updates["lines"] = [
            InvoiceLine(
                line_number=i + 1,
                line_type="Item",
                line_amount=l.get("amount", 0),
                description=l.get("description"),
            )
            for i, l in enumerate(result["lines"])
        ]

    if result.get("tax_amount"):
        t = state.tax.model_dump()
        t["tax_amount"] = result["tax_amount"]
        if result.get("tax_rate"):
            t["tax_rate"] = result["tax_rate"]
        updates["tax"] = TaxInfo(**t)

    confidence = result.get("confidence", {})
    low_conf   = [f for f, v in confidence.items() if v < 0.85]

    updates["extraction"] = ExtractionResult(
        method=result.get("extraction_method", "vision"),
        confidence=confidence,
        raw_text=result.get("raw_text"),
        has_variance=result.get("has_variance", False),
        variance_detail=result.get("extraction_notes"),
        low_confidence_fields=low_conf,
    )
    updates["awaiting_review"] = True
    updates["status"]          = InvoiceStatus.EXTRACTED
    updates["current_node"]    = "document_extractor"

    monitor.node_end("document_extractor")
    return updates


# -----------------------------------------------------------------------------
# NODE 4 — PARALLEL VALIDATOR
# -----------------------------------------------------------------------------

def parallel_validator_node(state: InvoiceState) -> dict:
    monitor = Monitor(state.session_id, state.user_id)
    monitor.node_start("parallel_validator")

    nothing_to_validate = (
        not state.business_unit
        and not state.supplier.supplier_name
        and not state.po.po_number
    )
    if nothing_to_validate:
        monitor.node_end("parallel_validator")
        return {"current_node": "parallel_validator"}

    everything_validated = (
        state.bu_info.validated
        and state.supplier.validated
        and state.supplier.site_validated
    )
    if everything_validated:
        monitor.node_end("parallel_validator")
        return {"current_node": "parallel_validator"}

    from app.engine.parallel_validator import run_parallel_validation

    val_result = run_parallel_validation(
        user_id=state.user_id,
        bu_name=state.business_unit,
        supplier_name=state.supplier.supplier_name,
        po_number=state.po.po_number if state.invoice_mode == "PO" else None,
        bu_id=state.business_unit_id,
        supplier_id=state.supplier.supplier_id,
        bu_validated=bool(state.bu_info.validated),
        sup_validated=bool(state.supplier.validated),
        site_validated=bool(state.supplier.site_validated),
    )

    resolved = val_result.get("resolved", {})
    errors   = list(state.errors) + val_result.get("errors", [])
    warnings = list(state.warnings) + val_result.get("warnings", [])
    updates  = {
        "errors":       errors,
        "warnings":     warnings,
        "current_node": "parallel_validator",
    }

    if resolved.get("bu_id"):
        bu = state.bu_info.model_dump()
        bu["bu_id"]     = resolved["bu_id"]
        bu["bu_name"]   = resolved.get("bu_name", state.business_unit)
        bu["validated"] = True
        updates["bu_info"]          = BusinessUnitInfo(**bu)
        updates["business_unit"]    = resolved.get("bu_name", state.business_unit)
        updates["business_unit_id"] = resolved["bu_id"]

    if resolved.get("supplier_id"):
        s = state.supplier.model_dump()
        s["supplier_id"]   = resolved["supplier_id"]
        s["supplier_name"] = resolved.get("supplier_name", s["supplier_name"])
        s["validated"]     = True
        updates["supplier"] = SupplierInfo(**s)

    if resolved.get("site_id"):
        s = updates.get("supplier", state.supplier).model_dump() if isinstance(
            updates.get("supplier"), SupplierInfo
        ) else state.supplier.model_dump()
        s["supplier_site_id"]   = resolved["site_id"]
        s["supplier_site_code"] = resolved.get("site_name", s["supplier_site_code"])
        s["site_validated"]     = True
        updates["supplier"]     = SupplierInfo(**s)

    if resolved.get("po_header_id"):
        po = state.po.model_dump()
        po["po_header_id"] = resolved["po_header_id"]
        po["validated"]    = True
        updates["po"] = POInfo(**po)

    if not errors:
        updates["status"] = InvoiceStatus.VALIDATING_FIELDS

    monitor.node_end("parallel_validator", success=not bool(errors))
    return updates


# -----------------------------------------------------------------------------
# NODE 5 — FIELD VALIDATOR
# -----------------------------------------------------------------------------

def field_validator_node(state: InvoiceState) -> dict:
    import datetime as dt
    monitor = Monitor(state.session_id, state.user_id)
    monitor.node_start("field_validator")

    errors   = []
    warnings = list(state.warnings)
    missing  = state.get_missing_required()

    errors.extend([f"Missing: {f}" for f in missing])

    # GL combination check for Non-PO
    if state.invoice_mode == "NON_PO" and state.lines and not state.distributions_valid():
        missing_gl = [
            l.line_number for l in state.lines
            if not l.account_combination
            and not any(d.distribution_combination for d in l.distributions)
        ]
        errors.append(
            f"Missing GL account combination on lines: {missing_gl}."
        )

    # Amount consistency — auto-correct line amount instead of hard error
    if state.lines and state.invoice_amount:
        tax_amt     = state.tax.tax_amount or 0
        lines_total = state.lines_sum()
        expected    = round(lines_total + tax_amt, 2)
        if abs(expected - state.invoice_amount) > 0.10:
            other_lines_total = sum(l.line_amount for l in state.lines[1:])
            corrected_amount  = round(state.invoice_amount - tax_amt - other_lines_total, 2)
            corrected_line    = state.lines[0].model_copy(
                update={"line_amount": corrected_amount}
            )
            corrected_lines = [corrected_line] + list(state.lines[1:])
            warnings.append(
                f"Line 1 amount adjusted from {state.lines[0].line_amount:,.2f} "
                f"to {corrected_amount:,.2f} to match invoice total "
                f"{state.invoice_amount:,.2f}."
            )
            _corrected_lines = corrected_lines
        else:
            _corrected_lines = None
    else:
        _corrected_lines = None

    # Credit memo should be negative
    if state.invoice_type == "Credit Memo" and state.invoice_amount:
        if state.invoice_amount > 0:
            warnings.append(
                "Credit Memo amount should be negative. "
                "Will negate when creating in Oracle."
            )

    # PO amount check
    if state.invoice_mode == "PO" and state.po.remaining_amount is not None:
        if state.invoice_amount and state.invoice_amount > state.po.remaining_amount:
            excess = state.invoice_amount - state.po.remaining_amount
            po     = state.po.model_dump()
            po["amount_exceeded"] = True
            po["excess_amount"]   = round(excess, 2)
            errors.append(
                f"Invoice amount ({state.invoice_amount:,.2f}) exceeds "
                f"PO remaining ({state.po.remaining_amount:,.2f}) by {excess:,.2f}."
            )

    # Risk scoring
    from app.engine.risk_engine import calculate_risk, decide_action
    risk   = calculate_risk(state)
    action = decide_action(state)

    if len(errors) == 0 and getattr(risk, "risk_level", "LOW") != "HIGH":
        action = "AUTO_CREATE"

    validation = ValidationResult(
        passed=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        checked_at=dt.datetime.utcnow().isoformat(),
    )

    # ── PO DECISION GATE ──────────────────────────────────────────────────────
    # When all fields are valid AND the user hasn't answered the PO question yet,
    # fire AWAITING_PO_DECISION instead of going straight to AWAITING_CONFIRM.
    if (
        validation.passed
        and not state.po_decision_made
        and not state.awaiting_po_decision
    ):
        result = {
            "field_validation":      validation,
            "risk":                  risk,
            "decision_action":       action,
            "warnings":              warnings,
            "status":                InvoiceStatus.AWAITING_PO_DECISION,
            "awaiting_po_decision":  True,
            "current_node":          "field_validator",
            "missing_required":      missing,
        }
        if _corrected_lines is not None:
            result["lines"] = _corrected_lines
        monitor.node_end("field_validator")
        return result

    # ── NORMAL PATH: po_decision_made = True ─────────────────────────────────
    new_status = (
        InvoiceStatus.AWAITING_CONFIRM
        if validation.passed
        else InvoiceStatus.VALIDATING_FIELDS
    )

    result = {
        "field_validation": validation,
        "risk":             risk,
        "decision_action":  action,
        "warnings":         warnings,
        "status":           new_status,
        "current_node":     "field_validator",
        "missing_required": missing,
    }

    if _corrected_lines is not None:
        result["lines"] = _corrected_lines

    monitor.node_end("field_validator", success=validation.passed)
    return result


# -----------------------------------------------------------------------------
# NODE 6 — AUTO CREATE NODE
# -----------------------------------------------------------------------------

def auto_create_node(state: InvoiceState) -> dict:
    import logging, traceback
    _log = logging.getLogger("invoice.auto_create")
    monitor = Monitor(state.session_id, state.user_id)
    monitor.node_start("auto_create")

    try:
        from app.oracle.invoice_service import create_invoice

        lines = [
            {
                "line_number":         l.line_number,
                "line_type":           l.line_type,
                "line_amount":         l.line_amount,
                "description":         l.description or "",
                "account_combination": l.account_combination or "",
            }
            for l in (state.lines or [])
        ]

        # PO number: pass through only if user provided one and chose PO mode
        po_number = state.po.po_number if (
            state.invoice_mode == "PO" and state.po.po_number
        ) else None

        _log.warning(
            f"[auto_create] Calling OIC — "
            f"invoice={state.invoice_number} amount={state.invoice_amount} "
            f"supplier={state.supplier.supplier_name} "
            f"po={'YES: ' + po_number if po_number else 'NO'} "
            f"lines={lines}"
        )

        result = create_invoice(
            user_id=state.user_id,
            invoice_number=state.invoice_number,
            invoice_currency=state.currency,
            invoice_amount=state.invoice_amount,
            invoice_date=state.invoice_date,
            business_unit=state.business_unit,
            supplier_name=state.supplier.supplier_name,
            supplier_site=state.supplier.supplier_site_code,
            description=state.description or "",
            invoice_type=state.invoice_type or "Standard",
            payment_terms=state.payment_terms or None,
            invoice_group=state.invoice_group or None,
            gl_date=state.gl_date or None,
            po_number=po_number,
            lines=lines or None,
            installments=[
                {
                    "installment_number":    i.installment_number,
                    "due_date":              i.due_date,
                    "gross_amount":          i.gross_amount,
                    "hold_reason":           i.hold_reason,
                    "first_discount_amount": i.first_discount_amount,
                }
                for i in (state.installments or [])
            ] or None,
            tax_amount=state.tax.tax_amount if state.tax else None,
            tenant_id=state.tenant_id or "default",
            session_id=state.session_id,
            supplier_id=state.supplier.supplier_id or 0,
        )

        _log.warning(f"[auto_create] OIC result: {result}")

        if result.get("success"):
            oracle_id  = result.get("invoiceId") or result.get("invoiceNumber") or state.invoice_number
            oracle_num = result.get("invoiceNumber") or state.invoice_number
            oic_resp   = result.get("oicResponse") or ""
            mode_label = f"PO-matched ({po_number})" if po_number else "Standalone"
            reply = (
                f"✅ {mode_label} invoice **{oracle_num}** created successfully in Oracle.\n\n"
                f"- **Invoice ID:** {oracle_id}\n"
                f"- **Status:** {result.get('status', 'CREATED')}\n"
            )
            if oic_resp:
                reply += f"- **OIC Response:** {oic_resp}\n"

            monitor.node_end("auto_create")
            return {
                "messages":              list(state.messages) + [AIMessage(content=reply)],
                "oracle_invoice_id":     oracle_id,
                "oracle_invoice_number": oracle_num,
                "oracle_invoice_status": "CREATED",
                "status":                InvoiceStatus.COMPLETED,
                "current_node":          "auto_create",
            }

        else:
            error_msg = result.get("humanMessage") or result.get("error") or "Unknown OIC error"
            _log.error(f"[auto_create] OIC failed: {error_msg}")
            monitor.node_end("auto_create", success=False, error=error_msg)
            return {
                "messages":     list(state.messages) + [AIMessage(content=f"❌ Invoice creation failed: {error_msg}")],
                "errors":       list(state.errors) + [error_msg],
                "status":       InvoiceStatus.FAILED,
                "current_node": "auto_create",
            }

    except Exception as e:
        _log.error(f"[auto_create] Exception: {e}\n{traceback.format_exc()}")
        monitor.node_end("auto_create", success=False, error=str(e))
        return {
            "messages":     list(state.messages) + [AIMessage(content=f"❌ Invoice creation error: {e}")],
            "errors":       list(state.errors) + [str(e)],
            "status":       InvoiceStatus.FAILED,
            "current_node": "auto_create",
        }


# -----------------------------------------------------------------------------
# Message cleaner
# -----------------------------------------------------------------------------

def _clean_tool_messages(messages: list) -> list:
    cleaned = []
    last_ai_had_tool_calls = False

    for msg in messages:
        if isinstance(msg, ToolMessage):
            if not last_ai_had_tool_calls:
                continue
        cleaned.append(msg)
        if isinstance(msg, AIMessage) and getattr(msg, "tool_calls", None):
            last_ai_had_tool_calls = True
        else:
            last_ai_had_tool_calls = False

    if not cleaned:
        for m in reversed(messages):
            if isinstance(m, HumanMessage):
                return [m]
        return list(messages)

    return cleaned


# -----------------------------------------------------------------------------
# NODE 7 — AGENT
# -----------------------------------------------------------------------------

def agent_node(state: InvoiceState) -> dict:
    monitor = Monitor(state.session_id, state.user_id)
    monitor.node_start("agent")

    import os as _os
    _DRY_RUN = _os.getenv("DRY_RUN_MODE", "false").lower() == "true"

    if (
        _DRY_RUN
        and state.status == InvoiceStatus.AWAITING_CONFIRM
        and state.decision_action == "AUTO_CREATE"
        and state.user_confirmed
    ):
        _payload = {
            "InvoiceNumber":      state.invoice_number,
            "CurrencyCode":       state.currency,
            "InvoiceAmount":      state.invoice_amount,
            "InvoiceDate":        state.invoice_date,
            "BusinessUnit":       state.business_unit,
            "Supplier":           state.supplier.supplier_name,
            "SupplierSite":       state.supplier.supplier_site_code,
            "Description":        state.description,
            "PaymentTerms":       state.payment_terms,
            "InvoiceMode":        state.invoice_mode,
            "PurchaseOrderNumber": state.po.po_number if state.invoice_mode == "PO" else None,
            "Lines": [
                {
                    "LineNumber":         l.line_number,
                    "LineType":           l.line_type,
                    "LineAmount":         l.line_amount,
                    "Description":        l.description,
                    "AccountCombination": l.account_combination,
                }
                for l in (state.lines or [])
            ],
        }
        _dry_msg = AIMessage(
            content=(
                "**[DRY RUN — Oracle payload preview]**\n"
                "Set `DRY_RUN_MODE=false` to submit this to Oracle.\n\n"
                f"```json\n{json.dumps(_payload, indent=2, default=str)}\n```"
            )
        )
        monitor.node_end("agent")
        return {
            "messages":     list(state.messages) + [_dry_msg],
            "current_node": "agent",
        }

    last_msg = state.messages[-1] if state.messages else None

    # Case 1: Last message is ToolMessage
    if isinstance(last_msg, ToolMessage):
        cleaned = _clean_tool_messages(list(state.messages))
        while cleaned and isinstance(cleaned[0], ToolMessage):
            cleaned.pop(0)
        if not cleaned:
            monitor.node_end("agent")
            return {"current_node": "agent"}
        llm          = get_llm(tools=ALL_TOOLS, temperature=0.1, streaming=False)
        response     = llm.invoke(cleaned)
        new_messages = cleaned + [response]
        monitor.node_end("agent")
        return {
            "messages":     new_messages,
            "current_node": "agent",
            "last_tool":    None,
        }

    # Case 2: Last message is AIMessage with tool_calls
    if isinstance(last_msg, AIMessage) and getattr(last_msg, "tool_calls", None):
        cleaned = _clean_tool_messages(list(state.messages))
        while cleaned and isinstance(cleaned[0], ToolMessage):
            cleaned.pop(0)
        if not cleaned:
            monitor.node_end("agent")
            return {"current_node": "agent"}
        llm          = get_llm(tools=ALL_TOOLS, temperature=0.1, streaming=False)
        response     = llm.invoke(cleaned)
        new_messages = cleaned + [response]
        monitor.node_end("agent")
        return {
            "messages":     new_messages,
            "current_node": "agent",
            "last_tool":    None,
        }

    # AUTO_CREATE bypass
    import uuid as _uuid
    if (
        state.status == InvoiceStatus.AWAITING_CONFIRM
        and state.user_confirmed
        and state.decision_action == "AUTO_CREATE"
    ):
        _tool_call_id = f"call_{_uuid.uuid4().hex[:24]}"
        _tool_name    = "create_invoice_tool"
        _tool_args    = {
            "user_id":               state.user_id,
            "invoice_number":        state.invoice_number,
            "invoice_currency":      state.currency,
            "invoice_amount":        state.invoice_amount,
            "invoice_date":          state.invoice_date,
            "business_unit":         state.business_unit,
            "supplier_name":         state.supplier.supplier_name,
            "supplier_site":         state.supplier.supplier_site_code,
            "description":           state.description or "",
            "payment_terms":         state.payment_terms or "",
            "po_number":             state.po.po_number if state.invoice_mode == "PO" else "",
            "lines_json":            json.dumps([
                {
                    "line_number":         l.line_number,
                    "line_type":           l.line_type,
                    "line_amount":         l.line_amount,
                    "description":         l.description or "",
                    "account_combination": l.account_combination or "",
                }
                for l in (state.lines or [])
            ]),
            "installments_json": json.dumps([
                {
                    "installment_number":    i.installment_number,
                    "due_date":              i.due_date,
                    "gross_amount":          i.gross_amount,
                    "hold_reason":           i.hold_reason,
                    "first_discount_amount": i.first_discount_amount,
                }
                for i in (state.installments or [])
            ]),
        }

        _auto_ai_msg = AIMessage(
            content="",
            tool_calls=[{
                "id":   _tool_call_id,
                "name": _tool_name,
                "args": _tool_args,
                "type": "tool_call",
            }],
        )
        monitor.node_end("agent")
        return {
            "messages":     list(state.messages) + [_auto_ai_msg],
            "current_node": "agent",
            "last_tool":    None,
        }

    # Case 3: Normal turn — inject fresh system prompt
    cleaned = _clean_tool_messages(list(state.messages))
    while cleaned and isinstance(cleaned[0], ToolMessage):
        cleaned.pop(0)
    if not cleaned:
        monitor.node_end("agent")
        return {"current_node": "agent"}
    system_msg   = SystemMessage(content=build_system_prompt(state))
    all_msgs     = [system_msg] + cleaned
    llm          = get_llm(tools=ALL_TOOLS, temperature=0.1, streaming=False)
    response     = llm.invoke(all_msgs)
    new_messages = cleaned + [response]

    monitor.node_end("agent")
    return {
        "messages":     new_messages,
        "current_node": "agent",
        "last_tool":    None,
    }


# -----------------------------------------------------------------------------
# NODE 8 — MONITOR
# -----------------------------------------------------------------------------

def monitor_node(state: InvoiceState) -> dict:
    monitor_client = Monitor(state.session_id, state.user_id)
    monitor_client.node_start("monitor")

    last_tool_msg  = None
    last_tool_name = None
    for msg in reversed(state.messages):
        if isinstance(msg, ToolMessage):
            last_tool_msg = msg
            break
    for msg in reversed(state.messages):
        if isinstance(msg, AIMessage) and getattr(msg, "tool_calls", None):
            if msg.tool_calls:
                last_tool_name = msg.tool_calls[0].get("name", "")
            break

    if not last_tool_msg or not last_tool_name:
        monitor_client.node_end("monitor")
        return {"current_node": "monitor"}

    evaluation = monitor_client.evaluate_tool_result(
        last_tool_name,
        last_tool_msg.content
        if isinstance(last_tool_msg.content, str)
        else json.dumps(last_tool_msg.content),
    )
    import logging
    logging.getLogger("invoice.monitor").warning(
        f"[monitor_node] tool={last_tool_name} "
        f"content={str(last_tool_msg.content)[:300]!r} "
        f"evaluation={evaluation}"
    )
    updates = {"current_node": "monitor", "last_tool": last_tool_name}

    if evaluation.get("action") == "COMPLETE":
        monitor_client.invoice_created(
            evaluation.get("invoice_number", ""),
            state.invoice_amount or 0,
            state.currency,
            state.invoice_mode,
        )
        updates["oracle_invoice_id"]     = evaluation.get("invoice_id")
        updates["oracle_invoice_number"] = evaluation.get("invoice_number")
        updates["oracle_invoice_status"] = "CREATED"
        updates["status"]                = InvoiceStatus.COMPLETED

    elif evaluation.get("action") == "EXPLAIN":
        monitor_client.invoice_failed(evaluation.get("raw_error", ""))
        updates["errors"] = list(state.errors) + [evaluation.get("human_error", "Creation failed")]
        updates["status"] = InvoiceStatus.FAILED

    elif evaluation.get("action") == "CONTINUE" and last_tool_name == "run_full_validation_tool":
        resolved = evaluation.get("resolved", {})
        if resolved.get("bu_id"):
            bu = state.bu_info.model_dump()
            bu["bu_id"]     = resolved["bu_id"]
            bu["bu_name"]   = resolved.get("bu_name", state.business_unit)
            bu["validated"] = True
            updates["bu_info"]          = BusinessUnitInfo(**bu)
            updates["business_unit_id"] = resolved["bu_id"]

        if resolved.get("supplier_id"):
            s = state.supplier.model_dump()
            s["supplier_id"] = resolved["supplier_id"]
            s["validated"]   = True
            updates["supplier"] = SupplierInfo(**s)

        if resolved.get("site_id"):
            s = (updates.get("supplier") or state.supplier).model_dump()
            s["supplier_site_id"]   = resolved["site_id"]
            s["supplier_site_code"] = resolved.get("site_name")
            s["site_validated"]     = True
            updates["supplier"] = SupplierInfo(**s)

    monitor_client.node_end("monitor")
    return updates


# -----------------------------------------------------------------------------
# NODE 9 — BATCH PROCESSOR
# -----------------------------------------------------------------------------

def batch_processor_node(state: InvoiceState) -> dict:
    monitor = Monitor(state.session_id, state.user_id)
    monitor.node_start("batch_processor")

    if not state.batch_rows:
        monitor.node_end("batch_processor")
        return {"current_node": "batch_processor"}

    from app.engine.parallel_validator import run_parallel_validation
    from app.oracle.invoice_service import create_invoice

    updated_rows = list(state.batch_rows)
    success = state.batch_success
    failed  = state.batch_failed

    for i, row in enumerate(updated_rows):
        if row.status != "PENDING":
            continue

        start_ms        = int(time.time() * 1000)
        updated_rows[i] = row.model_copy(update={"status": "PROCESSING"})

        try:
            data = row.mapped_data

            val = run_parallel_validation(
                user_id=state.user_id,
                bu_name=data.get("business_unit", ""),
                supplier_name=data.get("supplier_name", ""),
            )
            if val["errors"]:
                raise ValueError(" | ".join(val["errors"]))

            resolved = val["resolved"]
            if not resolved.get("bu_id"):
                raise ValueError(f"BU '{data.get('business_unit')}' not found")
            if not resolved.get("supplier_id"):
                raise ValueError(f"Supplier '{data.get('supplier_name')}' not found")
            if not resolved.get("site_id"):
                raise ValueError("No valid pay site found")

            result = create_invoice(
                user_id=state.user_id,
                invoice_number=data.get("invoice_number"),
                invoice_currency=data.get("currency", "AED"),
                invoice_amount=float(data.get("invoice_amount", 0)),
                invoice_date=data.get("invoice_date"),
                business_unit=resolved.get("bu_name", data.get("business_unit")),
                supplier_name=resolved.get("supplier_name", data.get("supplier_name")),
                supplier_site=resolved.get("site_name", ""),
                description=data.get("description", ""),
                invoice_type=data.get("invoice_type", "Standard"),
                po_number=data.get("po_number") or None,
            )

            if not result.get("success"):
                raise ValueError(result.get("humanMessage", "Creation failed"))

            elapsed         = int(time.time() * 1000) - start_ms
            updated_rows[i] = row.model_copy(update={
                "status":             "SUCCESS",
                "invoice_id":         result["invoiceId"],
                "invoice_number":     result["invoiceNumber"],
                "processing_time_ms": elapsed,
            })
            success += 1

        except Exception as e:
            elapsed         = int(time.time() * 1000) - start_ms
            updated_rows[i] = row.model_copy(update={
                "status":             "FAILED",
                "error":              str(e),
                "processing_time_ms": elapsed,
            })
            failed += 1
            monitor.error("batch_processor", "ROW_FAILED", str(e))

    monitor.node_end("batch_processor")
    return {
        "batch_rows":    updated_rows,
        "batch_success": success,
        "batch_failed":  failed,
        "current_node":  "batch_processor",
    }


# -----------------------------------------------------------------------------
# NODE 10 — SESSION WRITER
# -----------------------------------------------------------------------------

def _serialize_messages_for_storage(messages: list) -> list:
    serialized = []
    for m in messages:
        if isinstance(m, dict):
            serialized.append(m)
            continue
        if not (hasattr(m, "type") and hasattr(m, "content")):
            continue
        d = {"type": m.type, "content": m.content or ""}
        if hasattr(m, "tool_calls") and m.tool_calls:
            d["tool_calls"] = m.tool_calls
        if hasattr(m, "additional_kwargs") and m.additional_kwargs.get("tool_calls"):
            d.setdefault("tool_calls", m.additional_kwargs["tool_calls"])
        if hasattr(m, "tool_call_id") and m.tool_call_id:
            d["tool_call_id"] = m.tool_call_id
        if hasattr(m, "name") and m.name:
            d["name"] = m.name
        serialized.append(d)
    return serialized


def session_writer_node(state: InvoiceState) -> dict:
    try:
        serializable = state.model_dump(mode="json")
        serializable["messages"] = _serialize_messages_for_storage(state.messages)
        serializable.pop("file_base64", None)

        session_store.save(state.session_id, serializable)

        if state.status == InvoiceStatus.COMPLETED and state.oracle_invoice_id:
            session_store.save_completed_invoice(state)

        if state.org_id and state.lines:
            for line in state.lines:
                gl = line.account_combination
                if gl:
                    session_store.save_gl_pattern(state.org_id, gl)

    except Exception:
        pass

    return {"current_node": "session_writer"}


# -----------------------------------------------------------------------------
# ROUTING
# -----------------------------------------------------------------------------

def route_after_intent(state: InvoiceState) -> str:
    intent = state.detected_intent
    if intent == AgentIntent.SCAN_DOCUMENT:
        return "document_extractor"
    if intent == AgentIntent.BULK_PROCESS:
        return "batch_processor"
    if intent in (AgentIntent.QUERY_STATUS, AgentIntent.MANAGE_HOLDS,
                  AgentIntent.CANCEL_INVOICE, AgentIntent.GENERAL_QUERY):
        return "agent"
    return "field_extractor"


def route_after_extraction(state: InvoiceState) -> str:
    import logging
    _log = logging.getLogger("invoice.routing")
    _log.warning(
        f"[route_after_extraction] user_confirmed={state.user_confirmed} "
        f"status={state.status} decision_action={state.decision_action} "
        f"po_decision_made={state.po_decision_made}"
    )

    if (
        state.po_decision_made
        and state.status == InvoiceStatus.AWAITING_PO_DECISION
    ):
        _log.warning("[route_after_extraction] -> field_validator (PO decision made)")
        return "field_validator"

    if (
        state.user_confirmed
        and state.status == InvoiceStatus.AWAITING_CONFIRM
        and state.decision_action == "AUTO_CREATE"
    ):
        _log.warning("[route_after_extraction] -> field_validator (AUTO_CREATE shortcut)")
        return "field_validator"

    has_something = (
        state.business_unit
        or state.supplier.supplier_name
        or (state.invoice_mode == "PO" and state.po.po_number)
    )
    all_validated = (
        state.bu_info.validated
        and state.supplier.validated
        and state.supplier.site_validated
    )
    if has_something and not all_validated:
        return "parallel_validator"
    if not state.get_missing_required():
        return "field_validator"
    return "agent"


def route_after_parallel_validator(state: InvoiceState) -> str:
    if state.errors:
        return "agent"
    if not state.get_missing_required() and state.supplier.site_validated:
        return "field_validator"
    return "agent"


def route_after_field_validator(state: InvoiceState) -> str:
    import os as _os
    import logging
    _log = logging.getLogger("invoice.routing")
    _log.warning(
        f"[route_after_field_validator] user_confirmed={state.user_confirmed} "
        f"status={state.status} decision_action={state.decision_action} "
        f"po_decision_made={state.po_decision_made}"
    )

    if _os.getenv("DRY_RUN_MODE", "false").lower() == "true":
        return "agent"

    if (
        state.status == InvoiceStatus.AWAITING_CONFIRM
        and state.user_confirmed
        and state.decision_action == "AUTO_CREATE"
    ):
        _log.warning("[route_after_field_validator] -> auto_create")
        return "auto_create"

    if state.status == InvoiceStatus.AWAITING_PO_DECISION:
        _log.warning("[route_after_field_validator] -> agent (PO decision pending)")
        return "agent"

    return "agent"


def route_after_agent(state: InvoiceState) -> str:
    last = state.messages[-1] if state.messages else None
    if last and isinstance(last, AIMessage):
        tool_calls = getattr(last, "tool_calls", None)
        if not tool_calls:
            tool_calls = last.additional_kwargs.get("tool_calls")
        if tool_calls:
            return "tools"
    return "session_writer"


def route_after_tools(state: InvoiceState) -> str:
    return "monitor"


def route_after_monitor(state: InvoiceState) -> str:
    if state.status == InvoiceStatus.COMPLETED:
        return "session_writer"
    if state.status == InvoiceStatus.FAILED:
        return "agent"
    return "agent"


def route_after_batch(state: InvoiceState) -> str:
    return "agent"


# -----------------------------------------------------------------------------
# TOOL NODE WRAPPER
# -----------------------------------------------------------------------------

_tool_node = ToolNode(ALL_TOOLS)

def tool_node_wrapper(state: InvoiceState) -> dict:
    import logging
    import json
    from langchain_core.messages import ToolMessage, AIMessage

    _log = logging.getLogger("invoice.tools")

    original_messages = list(state.messages)
    last_msg = original_messages[-1] if original_messages else None

    # ✅ Safety: ensure tool call exists
    if not (last_msg and isinstance(last_msg, AIMessage) and getattr(last_msg, "tool_calls", None)):
        _log.warning(
            f"[tool_node_wrapper] called without AIMessage+tool_calls — "
            f"last_msg type={type(last_msg).__name__}"
        )
        return {"messages": original_messages, "current_node": "tools"}

    tool_call_id   = last_msg.tool_calls[0].get("id", "call_unknown")
    tool_call_name = last_msg.tool_calls[0].get("name", "unknown_tool")

    _log.warning(
        f"[tool_node_wrapper] executing tool={tool_call_name} id={tool_call_id}"
    )

    try:
        tool_input = {"messages": original_messages}
        result     = _tool_node.invoke(tool_input)
        returned   = result.get("messages", [])

        # ✅ FIX 1: accept ANY returned messages (not length-based)
        if returned:
            _log.warning(
                f"[tool_node_wrapper] Tool executed successfully. "
                f"messages_count={len(returned)}"
            )
            return {"messages": returned, "current_node": "tools"}

        # ✅ FIX 2: no crash — fallback safely
        _log.warning("[tool_node_wrapper] No messages returned from ToolNode")

        fallback_msg = ToolMessage(
            content=json.dumps({
                "success": False,
                "humanMessage": "Tool executed but returned no response."
            }),
            tool_call_id=tool_call_id,
            name=tool_call_name,
        )

        return {
            "messages": original_messages + [fallback_msg],
            "current_node": "tools",
        }

    except Exception as e:
        _log.error(f"[tool_node_wrapper] ToolNode FAILED: {e}", exc_info=True)

        # ✅ FIX 3: always return ToolMessage (never crash graph)
        error_result = json.dumps({
            "success": False,
            "humanMessage": f"Tool execution failed: {e}",
            "error": str(e),
        })

        synthetic_tool_msg = ToolMessage(
            content=error_result,
            tool_call_id=tool_call_id,
            name=tool_call_name,
        )

        return {
            "messages": original_messages + [synthetic_tool_msg],
            "current_node": "tools",
        }

# -----------------------------------------------------------------------------
# GRAPH ASSEMBLY
# -----------------------------------------------------------------------------

def build_graph():
    graph = StateGraph(InvoiceState)

    graph.add_node("intent_classifier",  intent_classifier_node)
    graph.add_node("field_extractor",    field_extractor_node)
    graph.add_node("document_extractor", document_extractor_node)
    graph.add_node("parallel_validator", parallel_validator_node)
    graph.add_node("field_validator",    field_validator_node)
    graph.add_node("auto_create",        auto_create_node)
    graph.add_node("agent",              agent_node)
    graph.add_node("tools",              tool_node_wrapper)
    graph.add_node("monitor",            monitor_node)
    graph.add_node("batch_processor",    batch_processor_node)
    graph.add_node("session_writer",     session_writer_node)

    graph.set_entry_point("intent_classifier")

    graph.add_conditional_edges("intent_classifier", route_after_intent, {
        "document_extractor": "document_extractor",
        "batch_processor":    "batch_processor",
        "field_extractor":    "field_extractor",
        "agent":              "agent",
    })

    graph.add_conditional_edges("field_extractor", route_after_extraction, {
        "parallel_validator": "parallel_validator",
        "field_validator":    "field_validator",
        "agent":              "agent",
    })

    graph.add_conditional_edges("document_extractor", route_after_extraction, {
        "parallel_validator": "parallel_validator",
        "field_validator":    "field_validator",
        "agent":              "agent",
    })

    graph.add_conditional_edges("parallel_validator", route_after_parallel_validator, {
        "field_validator": "field_validator",
        "agent":           "agent",
    })

    graph.add_conditional_edges("field_validator", route_after_field_validator, {
        "auto_create": "auto_create",
        "agent":       "agent",
    })

    graph.add_edge("auto_create", "session_writer")

    graph.add_conditional_edges("agent", route_after_agent, {
        "tools":          "tools",
        "session_writer": "session_writer",
    })

    graph.add_conditional_edges("tools", route_after_tools, {
        "monitor": "monitor",
    })

    graph.add_conditional_edges("monitor", route_after_monitor, {
        "session_writer": "session_writer",
        "agent":          "agent",
    })

    graph.add_conditional_edges("batch_processor", route_after_batch, {
        "agent": "agent",
    })

    graph.add_edge("session_writer", END)

    return graph.compile()


invoice_graph = build_graph()