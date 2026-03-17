"""
engine/risk_engine.py

Risk scoring engine + Decision engine.
Separates safe automation from risky operations.
"""

from __future__ import annotations
from schemas.state import InvoiceState, RiskScore, DecisionAction


AUTO_THRESHOLD    = 20
CONFIRM_THRESHOLD = 60
BLOCK_THRESHOLD   = 80


def calculate_risk(state: InvoiceState) -> RiskScore:
    score   = 0
    factors = []

    if state.supplier.on_hold:
        score += 40
        factors.append("Supplier has an active payment hold")

    if state.invoice_amount:
        if state.invoice_amount > 500_000:
            score += 30
            factors.append(f"Very high value: {state.currency} {state.invoice_amount:,.2f}")
        elif state.invoice_amount > 100_000:
            score += 15
            factors.append(f"High value: {state.currency} {state.invoice_amount:,.2f}")

    if state.has_amount_variance():
        score += 20
        factors.append("Line amounts do not match invoice total")

    if state.po.amount_exceeded:
        score += 25
        factors.append(
            f"Invoice exceeds PO remaining amount by "
            f"{state.currency} {(state.po.excess_amount or 0):,.2f}"
        )

    if state.invoice_type == "Credit Memo":
        score += 10
        factors.append("Credit Memo — negative amount invoice")

    if state.invoice_mode == "NON_PO" and not state.distributions_valid():
        score += 35
        factors.append("Missing GL account combination on one or more lines")

    if score < AUTO_THRESHOLD:
        level = "LOW"
    elif score < CONFIRM_THRESHOLD:
        level = "MEDIUM"
    elif score < BLOCK_THRESHOLD:
        level = "HIGH"
    else:
        level = "CRITICAL"

    return RiskScore(
        score=score,
        level=level,
        factors=factors,
        auto_create_ok=(score < AUTO_THRESHOLD),
    )


def decide_action(state: InvoiceState) -> str:
    if state.errors or not state.field_validation.passed:
        return DecisionAction.EXPLAIN_ERRORS

    missing = state.get_missing_required()
    if missing:
        return DecisionAction.ASK_MISSING

    if state.invoice_mode == "NON_PO" and not state.distributions_valid():
        return DecisionAction.ASK_MISSING

    risk = calculate_risk(state)

    if risk.level == "CRITICAL":
        return DecisionAction.BLOCK

    if risk.level in ("HIGH", "MEDIUM"):
        return DecisionAction.ASK_CONFIRMATION

    if state.user_confirmed:
        return DecisionAction.AUTO_CREATE

    return DecisionAction.ASK_CONFIRMATION


ERROR_TRANSLATION_MAP = {
    "BU_NOT_FOUND":       "That business unit doesn't exist in Oracle. Check the name.",
    "SUPPLIER_NOT_FOUND": "I couldn't find that supplier in the selected BU.",
    "SITE_NOT_FOUND":     "No active pay site found for that supplier in this BU.",
    "PO_NOT_FOUND":       "That PO number doesn't exist in Oracle.",
    "PO_CLOSED":          "That PO is closed — invoices can't be matched to it.",
    "AMOUNT_MISMATCH":    "Invoice amount doesn't match the sum of line amounts.",
    "GL_INVALID":         "That GL combination is invalid. Check each segment.",
    "PERIOD_CLOSED":      "The GL date falls in a closed period. Use a current open date.",
    "DUPLICATE":          "An invoice with that number already exists for this supplier.",
    "SUPPLIER_HOLD":      "Supplier has a hold — invoice will create but won't pay until cleared.",
}


def translate_error(error_key: str, fallback: str = "") -> str:
    return ERROR_TRANSLATION_MAP.get(error_key, fallback or error_key)