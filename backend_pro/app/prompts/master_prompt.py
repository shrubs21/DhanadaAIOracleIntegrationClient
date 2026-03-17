"""
prompts/master_prompt.py

Builds the system prompt dynamically from live state.
Every turn gets a fresh, accurate prompt — nothing stale.

v4.1 changes:
  - PO is OPTIONAL — user is asked after all required fields are complete
  - New flow: AWAITING_PO_DECISION state with ASK_PO_DECISION action
  - po_skipped flag: user chose not to provide PO
  - Confirmation summary shows PO or "No PO (standalone invoice)"
"""

from __future__ import annotations
import json
from app.schemas.state import InvoiceState


# ─────────────────────────────────────────────────────────────────────────────
# Core identity
# ─────────────────────────────────────────────────────────────────────────────

IDENTITY = """
You are an intelligent Oracle Fusion AP Invoice Assistant.
You help finance teams create and manage invoices in Oracle Fusion ERP.

PERSONALITY:
- Conversational, clear, warm — like a knowledgeable finance colleague
- Never robotic. Never list every field one by one
- Ask all missing info in one natural message
- Confirm before creating
- Explain Oracle errors in plain business language

NEVER SAY:
- "Please provide the invoice date"
- "Missing required field: supplier_name"
- "Step 3 of 7"
- "Certainly! I'd be happy to help!"
- "As an AI assistant"
- "I'll need to collect the following information"

ALWAYS SAY:
- "What date is on the invoice?"
- "Who's the supplier?"
- "Got it — which site, Dubai or Abu Dhabi?"
- "One more thing — what's the invoice number?"

TOOL USAGE RULES:
- Never call more than ONE tool per response turn
- Always wait for tool result before calling another tool
- Never inject a new SystemMessage mid conversation
- Never stream while tool_calls exist
- Use create_invoice_tool for ALL invoice creation (PO and non-PO)
"""


# ─────────────────────────────────────────────────────────────────────────────
# GL guide
# ─────────────────────────────────────────────────────────────────────────────

GL_GUIDE = """
GL ACCOUNT COMBINATION FORMAT:
Entity.CostCenter.Account.SubAccount.Project.Future1.Future2.Future3
Example: 101.05.1112.50111.513302.000.00000.00000

When asking for GL: "What's the GL account combination for this line?
It's a segment string like 101.05.1112.50111 — check with your finance team if unsure."

NEVER guess or invent a GL combination.
GL is only required for non-PO invoices. PO invoices inherit GL from the PO distributions.
"""


# ─────────────────────────────────────────────────────────────────────────────
# PO decision flow instructions
# ─────────────────────────────────────────────────────────────────────────────

PO_FLOW_GUIDE = """
PO DECISION FLOW (important — follow exactly):

1. Collect ALL required fields first (supplier, BU, invoice #, date, amount, lines, GL, payment terms, description).
2. Once all required fields are complete → ask the PO question ONCE:
   "Do you have a Purchase Order number for this invoice?
    ✅ Yes, add PO  |  ⏭ Skip — create without PO"
3. If user says YES or provides a PO number → store it, then proceed to confirmation. NO validation against Oracle.
4. If user says NO / Skip / Continue without PO → set po_skipped=true, proceed to confirmation.
5. NEVER ask for PO number again after the user has made their decision.
6. NEVER validate the PO number — just collect it and pass it through to OIC as-is.

When calling create_invoice_tool:
- If PO provided: set po_number to exactly what the user typed
- If PO skipped: set po_number to "" (empty string) — the payload will send "null" to OIC
"""


# ─────────────────────────────────────────────────────────────────────────────
# State builder
# ─────────────────────────────────────────────────────────────────────────────

def _state_summary(state: InvoiceState) -> str:
    parts = []

    parts.append(f"SESSION: {state.session_id}")
    parts.append(f"USER ID: {state.user_id}")
    parts.append(f"STATUS: {state.status}")

    # PO decision status
    if state.awaiting_po_decision:
        parts.append("PO DECISION: ⏳ Waiting for user to decide (yes/no)")
    elif state.po_decision_made:
        if state.po_skipped:
            parts.append("PO DECISION: ✓ User chose NO PO — standalone invoice")
        elif state.po.po_number:
            parts.append(f"PO DECISION: ✓ User provided PO — {state.po.po_number}")
        else:
            parts.append("PO DECISION: ✓ Made")
    else:
        parts.append("PO DECISION: Not asked yet")

    parts.append(f"INVOICE MODE: {state.invoice_mode}")

    if state.business_unit:
        validated = "✓ validated" if state.bu_info.validated else "not yet validated"
        parts.append(f"BU: {state.business_unit} ({validated})")

    if state.supplier.supplier_name:
        sup_status = "✓ validated" if state.supplier.validated else "not yet validated"
        site_status = f" | Site: {state.supplier.supplier_site_code} ✓" if state.supplier.site_validated else ""
        parts.append(f"Supplier: {state.supplier.supplier_name} ({sup_status}){site_status}")

    if state.po.po_number:
        parts.append(f"PO: {state.po.po_number} (pass-through — not validated)")

    if state.invoice_number:
        parts.append(f"Invoice #: {state.invoice_number}")
    if state.invoice_date:
        parts.append(f"Date: {state.invoice_date}")
    if state.invoice_amount is not None:
        parts.append(f"Amount: {state.currency} {state.invoice_amount:,.2f}")
    if state.invoice_type and state.invoice_type != "Standard":
        parts.append(f"Type: {state.invoice_type}")
    if state.payment_terms:
        parts.append(f"Payment Terms: {state.payment_terms}")
    if state.description:
        parts.append(f"Description: {state.description}")
    if state.invoice_group:
        parts.append(f"Invoice Group: {state.invoice_group}")

    if state.lines:
        parts.append(f"Lines: {len(state.lines)} line(s)")
        for l in state.lines:
            gl = l.account_combination or (
                l.distributions[0].distribution_combination
                if l.distributions else ("N/A (from PO)" if state.invoice_mode == "PO" else "NO GL")
            )
            parts.append(f"  Line {l.line_number} [{l.line_type}]: {state.currency} {l.line_amount:,.2f} | GL: {gl}")

    if state.installments:
        parts.append(f"Installments: {len(state.installments)}")
        for inst in state.installments:
            parts.append(f"  #{inst.installment_number}: {state.currency} {inst.gross_amount:,.2f} due {inst.due_date}")

    if state.tax.tax_amount:
        parts.append(f"Tax: {state.currency} {state.tax.tax_amount:,.2f}")

    if state.risk.score > 0:
        parts.append(f"Risk: {state.risk.level} (score {state.risk.score})")
        for f in state.risk.factors:
            parts.append(f"  ⚠ {f}")

    if state.errors:
        parts.append("ERRORS:")
        for e in state.errors:
            parts.append(f"  ✗ {e}")

    if state.warnings:
        parts.append("WARNINGS:")
        for w in state.warnings:
            parts.append(f"  ⚠ {w}")

    if state.field_validation.errors:
        parts.append("VALIDATION ERRORS:")
        for e in state.field_validation.errors:
            parts.append(f"  ✗ {e}")

    return "\n".join(parts)


def _missing_section(state: InvoiceState) -> str:
    missing = state.get_missing_required()
    if not missing:
        return ""
    parts = ["\nMISSING REQUIRED FIELDS:"]
    for f in missing:
        parts.append(f"  - {f}")

    # GL only needed for non-PO invoices
    if state.invoice_mode == "NON_PO" and state.lines:
        no_gl = [
            f"Line {l.line_number}"
            for l in state.lines
            if not l.account_combination and not l.distributions
        ]
        if no_gl:
            parts.append(f"  - GL combination for: {', '.join(no_gl)}")

    return "\n".join(parts)


def _decision_instructions(state: InvoiceState) -> str:
    from app.schemas.state import DecisionAction

    # ── PO decision pending ───────────────────────────────────────────────────
    if state.awaiting_po_decision:
        return (
            "\nACTION REQUIRED: ASK_PO_DECISION\n"
            "All required invoice fields are collected. Now ask the user ONE question:\n"
            "  'Do you have a Purchase Order number for this invoice?'\n"
            "Present two clear options:\n"
            "  ✅ Yes, I have a PO number — (they will type it)\n"
            "  ⏭ No PO — create as standalone invoice\n"
            "Be friendly. Explain briefly that PO invoices are matched to an existing PO "
            "in Oracle, while standalone invoices are created without a PO reference.\n"
            "Wait for their answer before doing anything else."
        )

    # ── Ready to ask PO question ──────────────────────────────────────────────
    if state.ready_for_po_question():
        return (
            "\nACTION REQUIRED: ASK_PO_DECISION\n"
            "All required fields are now complete. "
            "Ask the PO question now (see PO DECISION FLOW above)."
        )

    # ── Standard decision routing ─────────────────────────────────────────────
    errors = state.errors or state.field_validation.errors

    if errors:
        return (
            "\nACTION REQUIRED: EXPLAIN_ERRORS\n"
            "Explain these errors clearly and tell the user what to fix. Do NOT create:\n"
            + "\n".join(f"  - {e}" for e in errors)
        )

    missing = state.get_missing_required()
    if missing:
        return (
            "\nACTION REQUIRED: ASK_MISSING\n"
            "Ask for ALL missing fields in ONE message. Do not ask one at a time.\n"
            "Missing: " + ", ".join(missing)
        )

    if state.risk.level == "CRITICAL":
        return (
            "\nACTION REQUIRED: BLOCK\n"
            "Block this invoice. Risk level is CRITICAL. Explain why:\n"
            + "\n".join(f"  - {f}" for f in state.risk.factors)
        )

    if state.user_confirmed:
        po_info = f"po_number='{state.po.po_number}'" if state.po.po_number else "po_number='' (no PO)"
        return (
            f"\nACTION REQUIRED: AUTO_CREATE\n"
            f"User confirmed. Call create_invoice_tool NOW with all collected data.\n"
            f"Key params: {po_info}\n"
            f"Do not ask again. Create the invoice immediately."
        )

    if state.po_decision_made and state.all_required_complete():
        # Build confirmation summary
        po_line = (
            f"  Purchase Order: {state.po.po_number}"
            if state.po.po_number
            else "  Purchase Order: None (standalone invoice)"
        )
        lines_summary = "\n".join(
            f"  Line {l.line_number} [{l.line_type}]: {state.currency} {l.line_amount:,.2f}"
            + (f" | GL: {l.account_combination}" if l.account_combination else "")
            for l in state.lines
        ) if state.lines else "  (no lines)"

        installments_summary = (
            "\n".join(
                f"  Installment {i.installment_number}: {state.currency} {i.gross_amount:,.2f} due {i.due_date}"
                for i in state.installments
            ) if state.installments else ""
        )

        risk_section = (
            "\n".join(f"  ⚠ {f}" for f in state.risk.factors)
            if state.risk.score > 0 else "  None"
        )

        return (
            "\nACTION REQUIRED: ASK_CONFIRMATION\n"
            "Show the user a clear confirmation summary and ask them to confirm.\n"
            "Use this structure:\n"
            "─────────────────────────────────\n"
            "📋 Invoice Summary\n"
            f"  Invoice #: {state.invoice_number}\n"
            f"  Date: {state.invoice_date}\n"
            f"  Amount: {state.currency} {state.invoice_amount:,.2f}\n"
            f"  Type: {state.invoice_type}\n"
            f"  Supplier: {state.supplier.supplier_name} ({state.supplier.supplier_site_code})\n"
            f"  Business Unit: {state.business_unit}\n"
            f"  Description: {state.description}\n"
            f"  Payment Terms: {state.payment_terms}\n"
            f"{po_line}\n"
            f"  Lines:\n{lines_summary}\n"
            + (f"  Installments:\n{installments_summary}\n" if installments_summary else "")
            + f"  Risk Factors:\n{risk_section}\n"
            "─────────────────────────────────\n"
            "Ask: 'Does everything look correct? Reply **Confirm** to create or let me know what to change.'"
        )

    return ""


def _extraction_review_section(state: InvoiceState) -> str:
    if not state.awaiting_review:
        return ""

    conf  = state.extraction.confidence
    low   = state.extraction.low_confidence_fields
    parts = ["\nDOCUMENT EXTRACTION REVIEW NEEDED:"]
    parts.append("Show the user what was extracted and ask them to confirm or correct.")

    if low:
        parts.append(f"Low confidence fields (user must verify): {low}")
    if state.extraction.has_variance:
        parts.append(f"Amount variance detected: {state.extraction.variance_detail}")

    parts.append("\nExtracted confidence scores:")
    for field, score in conf.items():
        emoji = "✓" if score >= 0.85 else ("⚠" if score >= 0.5 else "✗")
        parts.append(f"  {emoji} {field}: {int(score * 100)}%")

    return "\n".join(parts)


def _org_memory_section(state: InvoiceState) -> str:
    if not state.org_memory.common_gl_combinations:
        return ""
    gls = state.org_memory.common_gl_combinations[:5]
    return (
        "\nCOMMON GL COMBINATIONS FOR THIS ORG (suggest these to user):\n"
        + "\n".join(f"  - {gl}" for gl in gls)
    )


def _po_status_section(state: InvoiceState) -> str:
    """PO validation is skipped — PO number is passed through as-is."""
    if not state.po.po_number:
        return ""
    return f"\nPO: {state.po.po_number} (pass-through — not validated against Oracle)"


# ─────────────────────────────────────────────────────────────────────────────
# Main builder
# ─────────────────────────────────────────────────────────────────────────────

def build_system_prompt(state: InvoiceState) -> str:
    sections = [
        IDENTITY,
        GL_GUIDE,
        PO_FLOW_GUIDE,
        "\n--- CURRENT STATE ---",
        _state_summary(state),
        _missing_section(state),
        _extraction_review_section(state),
        _org_memory_section(state),
        _po_status_section(state),
        _decision_instructions(state),
        "\n--- END STATE ---",
    ]

    return "\n".join(s for s in sections if s).strip()