"""
engine/missing_fields_engine.py

Detects ALL missing fields in a single pass.
Generates one natural language message asking for everything at once.
Never interrogates field by field.
"""

from __future__ import annotations
from typing import List
from schemas.state import InvoiceState


FIELD_QUESTIONS = {
    "business_unit":  "Which **business unit** is this invoice for?",
    "supplier_name":  "Who is the **supplier**?",
    "supplier_site":  "Which **supplier site** should be used?",
    "invoice_number": "What is the **invoice number**?",
    "invoice_date":   "What is the **invoice date**? (format: YYYY-MM-DD)",
    "invoice_amount": "What is the **total invoice amount**?",
    "invoice_type":   "What is the **invoice type**? (Standard, Credit Memo, Prepayment, or Debit Memo — default is Standard)",
    "payment_terms":  "What are the **payment terms**? (e.g. NET30, NET45, IMMEDIATE)",
    "description":    "What is the **description** for this invoice? (brief note on what it's for)",
    "invoice_lines":  "Please provide the **line items** — each needs a description, amount, and GL account combination (e.g. 101.05.1112.50111.513302.000.00000.00000).",
    "po_number":      "What is the **PO number** for this invoice?",
}

GL_GUIDE = (
    "The GL account combination follows the format:\n"
    "`Entity.CostCenter.Account.SubAccount.Project.Future1.Future2.Future3`\n"
    "Example: `101.05.1112.50111.513302.000.00000.00000`\n"
    "Check with your finance team if unsure."
)


def build_missing_message(state: InvoiceState) -> str:
    """
    Returns a natural language message listing ALL missing info at once.
    If only one thing is missing, asks it directly without a list.
    """
    missing = state.get_missing_required()

    # Also check GL combinations
    needs_gl = (
        state.invoice_mode == "NON_PO"
        and state.lines
        and not state.distributions_valid()
    )

    if not missing and not needs_gl:
        return ""

    if len(missing) == 1 and not needs_gl:
        field = missing[0]
        return FIELD_QUESTIONS.get(field, f"Can you provide the {field}?")

    if needs_gl and not missing:
        lines_missing = [
            l.line_number for l in state.lines
            if not l.account_combination
            and not any(d.distribution_combination for d in l.distributions)
        ]
        return (
            f"Almost there! I just need the **GL account combination** for "
            f"line{'s' if len(lines_missing) > 1 else ''} {lines_missing}.\n\n"
            f"{GL_GUIDE}"
        )

    # Multiple missing — list them all
    lines = ["I still need a few things to create this invoice:\n"]
    for field in missing:
        q = FIELD_QUESTIONS.get(field, f"• {field}")
        lines.append(f"• {q}")

    if needs_gl:
        lines.append(f"• {FIELD_QUESTIONS['invoice_lines']}")

    return "\n".join(lines)


def get_missing_summary(state: InvoiceState) -> dict:
    """
    Returns structured missing field info for the agent prompt.
    """
    missing  = state.get_missing_required()
    needs_gl = (
        state.invoice_mode == "NON_PO"
        and state.lines
        and not state.distributions_valid()
    )
    gl_lines = []
    if needs_gl:
        gl_lines = [
            l.line_number for l in state.lines
            if not l.account_combination
            and not any(d.distribution_combination for d in l.distributions)
        ]

    return {
        "missing_fields":     missing,
        "needs_gl":           needs_gl,
        "gl_missing_lines":   gl_lines,
        "count":              len(missing) + (len(gl_lines) if needs_gl else 0),
        "natural_message":    build_missing_message(state),
    }