"""
tools/tools.py

LangGraph tool definitions for Oracle Invoice AI.

v4.1 changes:
  - create_invoice_tool: unified tool for both PO and non-PO invoices
  - po_number is optional — when blank/null, creates a non-PO invoice
  - Legacy tools kept for backward compatibility

SECURITY RULES:
  1. No credentials in source
  2. No direct HTTP calls — delegate to oracle/invoice_service.py
  3. All tools return plain dicts
  4. Never raise — always return {"success": False, "humanMessage": "..."}
"""

from __future__ import annotations
import json
from langchain_core.tools import tool

from app.oracle.invoice_service import (
    create_invoice,
    create_non_po_invoice,
    create_po_invoice,
    get_invoice_status,
)


# ─────────────────────────────────────────────────────────────────────────────
# UNIFIED INVOICE CREATION TOOL
# ─────────────────────────────────────────────────────────────────────────────

@tool
def create_invoice_tool(
    user_id:               int,
    invoice_number:        str,
    invoice_currency:      str,
    invoice_amount:        float,
    invoice_date:          str,
    business_unit:         str,
    supplier_name:         str,
    supplier_site:         str,
    description:           str  = "",
    invoice_type:          str  = "Standard",
    payment_terms:         str  = "",
    invoice_group:         str  = "",
    gl_date:               str  = "",
    conversion_rate:       str  = "",
    invoice_received_date: str  = "",
    po_number:             str  = "",      # Optional — empty string = non-PO invoice
    lines_json:            str  = "[]",
    installments_json:     str  = "[]",
    tax_amount:            float = 0.0,
) -> dict:
    """
    Create an invoice in Oracle Fusion AP via OIC.

    Works for BOTH PO and non-PO invoices:
    - If po_number is provided: creates a PO-matched invoice
    - If po_number is empty/blank: creates a non-PO invoice
      (PurchaseOrderNumber will be sent as "null" in the OIC payload)

    lines_json: JSON array of line objects:
      [{
        "line_number": 1,
        "line_type": "Item",          // or "Freight", "Tax", "Miscellaneous"
        "line_amount": 2112.75,
        "description": "Office Supplies",
        "prorate_across_all_items": false,
        "po_line_number": null,       // set for PO-matched lines
        "account_combination": "101.05.1112.50111.513302.000.00000.00000",
        "distributions": [            // optional — if omitted, account_combination is used
          {
            "distribution_line_number": 1,
            "distribution_line_type": "Item",
            "distribution_amount": 2112.75,
            "distribution_combination": "101.05.1112.50111.513302.000.00000.00000"
          }
        ]
      }]

    installments_json: JSON array of installment objects:
      [{
        "installment_number": 1,
        "due_date": "2024-02-10",
        "gross_amount": 1100.00,
        "hold_reason": null,
        "first_discount_amount": null
      }]
    """
    try:
        lines = json.loads(lines_json) if lines_json and lines_json != "[]" else []
    except json.JSONDecodeError as e:
        return {"success": False, "humanMessage": f"Invalid lines_json: {e}"}

    try:
        installments = json.loads(installments_json) if installments_json and installments_json != "[]" else []
    except json.JSONDecodeError as e:
        return {"success": False, "humanMessage": f"Invalid installments_json: {e}"}

    # Normalize lines
    normalized_lines = [
        {
            "line_number":              l.get("line_number", i + 1),
            "line_type":                l.get("line_type", "Item"),
            "line_amount":              l.get("line_amount", 0),
            "description":              l.get("description", description),
            "prorate_across_all_items": l.get("prorate_across_all_items", False),
            "po_line_number":           l.get("po_line_number"),
            "account_combination":      l.get("account_combination", ""),
            "distributions":            l.get("distributions", []),
            "quantity":                 l.get("quantity"),
            "unit_price":               l.get("unit_price"),
        }
        for i, l in enumerate(lines)
    ] if lines else None

    return create_invoice(
        user_id=user_id,
        invoice_number=invoice_number,
        invoice_currency=invoice_currency,
        invoice_amount=invoice_amount,
        invoice_date=invoice_date,
        business_unit=business_unit,
        supplier_name=supplier_name,
        supplier_site=supplier_site,
        description=description,
        invoice_type=invoice_type or "Standard",
        payment_terms=payment_terms or None,
        invoice_group=invoice_group or None,
        gl_date=gl_date or None,
        conversion_rate=float(conversion_rate) if conversion_rate else None,
        invoice_received_date=invoice_received_date or None,
        po_number=po_number.strip() if po_number and po_number.strip() else None,
        lines=normalized_lines,
        installments=installments or None,
        tax_amount=tax_amount if tax_amount else None,
    )


# ─────────────────────────────────────────────────────────────────────────────
# LEGACY TOOLS — kept for backward compatibility
# ─────────────────────────────────────────────────────────────────────────────

@tool
def create_non_po_invoice_tool(
    user_id:          int,
    invoice_number:   str,
    invoice_currency: str,
    invoice_amount:   float,
    invoice_date:     str,
    business_unit:    str,
    supplier_name:    str,
    supplier_site:    str,
    description:      str  = "",
    payment_terms:    str  = "",
    lines_json:       str  = "[]",
) -> dict:
    """Create a Non-PO invoice. Use create_invoice_tool instead for new code."""
    try:
        lines = json.loads(lines_json) if lines_json else []
    except json.JSONDecodeError as e:
        return {"success": False, "humanMessage": f"Invalid lines_json: {e}"}

    normalized_lines = [
        {
            "line_number":         l.get("line_number", i + 1),
            "line_type":           l.get("line_type", "Item"),
            "line_amount":         l.get("line_amount", 0),
            "description":         l.get("description", description),
            "account_combination": l.get("account_combination", ""),
        }
        for i, l in enumerate(lines)
    ]

    return create_non_po_invoice(
        user_id=user_id, invoice_number=invoice_number,
        invoice_currency=invoice_currency, invoice_amount=invoice_amount,
        invoice_date=invoice_date, business_unit=business_unit,
        supplier_name=supplier_name, supplier_site=supplier_site,
        description=description, payment_terms=payment_terms or None,
        lines=normalized_lines or None,
    )


@tool
def create_po_invoice_tool(
    user_id:          int,
    invoice_number:   str,
    invoice_currency: str,
    invoice_amount:   float,
    invoice_date:     str,
    business_unit:    str,
    supplier_name:    str,
    supplier_site:    str,
    po_number:        str,
    description:      str  = "",
    payment_terms:    str  = "",
    lines_json:       str  = "[]",
) -> dict:
    """Create a PO-matched invoice. Use create_invoice_tool instead for new code."""
    try:
        lines = json.loads(lines_json) if lines_json else []
    except json.JSONDecodeError as e:
        return {"success": False, "humanMessage": f"Invalid lines_json: {e}"}

    return create_po_invoice(
        user_id=user_id, invoice_number=invoice_number,
        invoice_currency=invoice_currency, invoice_amount=invoice_amount,
        invoice_date=invoice_date, business_unit=business_unit,
        supplier_name=supplier_name, supplier_site=supplier_site,
        po_number=po_number, description=description,
        payment_terms=payment_terms or None, lines=lines or None,
    )


# ─────────────────────────────────────────────────────────────────────────────
# STATUS QUERY
# ─────────────────────────────────────────────────────────────────────────────

@tool
def get_invoice_status_tool(
    user_id:        int,
    invoice_number: str,
) -> dict:
    """Query the status of an existing Oracle Fusion AP invoice."""
    return get_invoice_status(user_id=user_id, invoice_number=invoice_number)


# ─────────────────────────────────────────────────────────────────────────────
# ALL_TOOLS — imported by graph.py and bound to the LLM
# ─────────────────────────────────────────────────────────────────────────────

ALL_TOOLS = [
    create_invoice_tool,          # Primary — handles PO and non-PO
    create_non_po_invoice_tool,   # Legacy
    create_po_invoice_tool,       # Legacy
    get_invoice_status_tool,
]