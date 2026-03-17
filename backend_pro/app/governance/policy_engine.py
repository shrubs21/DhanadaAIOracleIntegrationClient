"""
governance/policy_engine.py

Enterprise policy decision engine.
Separated from audit layer.
"""

from dataclasses import dataclass


@dataclass
class PolicyDecision:
    action: str
    reason: str


def evaluate_policy(
    tenant_id: str,
    user_id: int,
    invoice_amount: float,
    invoice_type: str,
    risk_level: str,
    supplier_on_hold: bool,
    is_po: bool,
) -> PolicyDecision:
    """
    Evaluate invoice against enterprise policy rules.
    """

    # Missing amount
    if invoice_amount is None:
        return PolicyDecision(
            action="BLOCK",
            reason="Missing invoice amount"
        )

    # Supplier on hold
    if supplier_on_hold:
        return PolicyDecision(
            action="BLOCK",
            reason="Supplier is on hold"
        )

    # High value invoice
    if float(invoice_amount) > 100000:
        return PolicyDecision(
            action="REVIEW",
            reason="High-value invoice"
        )

    # High risk invoice
    if risk_level and risk_level.upper() == "HIGH":
        return PolicyDecision(
            action="REVIEW",
            reason="High risk invoice"
        )

    # Default allow
    return PolicyDecision(
        action="ALLOW",
        reason="Within auto-approval threshold"
    )


# Optional stubs for API endpoints
def get_policy(tenant_id: str) -> dict:
    return {
        "tenant_id": tenant_id,
        "max_auto_approval_amount": 100000,
        "supplier_hold_blocks": True,
        "high_risk_requires_review": True,
    }


def set_user_role(user_id: int, tenant_id: str, role: str) -> None:
    # Extend later if needed
    return