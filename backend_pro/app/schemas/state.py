"""
schemas/state.py
Pure Pydantic v2.
Messages stored as List[Any] — avoids pydantic_v1/v2 BaseMessage conflict.
No add_messages reducer. Plain list append in every node.

v4.1 changes:
  - PO is now OPTIONAL — user is asked, not required
  - Added: awaiting_po_decision flag
  - Added: po_skipped flag
  - InvoiceStatus: added AWAITING_PO_DECISION
  - get_missing_required: PO fields removed from hard requirements
"""

from __future__ import annotations
import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


# ─────────────────────────────────────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────────────────────────────────────

class InvoiceType(str, Enum):
    STANDARD   = "Standard"
    CREDIT     = "Credit Memo"
    PREPAYMENT = "Prepayment"
    DEBIT      = "Debit Memo"
    MIXED      = "Mixed"


class InvoiceMode(str, Enum):
    PO     = "PO"
    NON_PO = "NON_PO"


class InvoiceStatus(str, Enum):
    DRAFT               = "DRAFT"
    EXTRACTING          = "EXTRACTING"
    EXTRACTED           = "EXTRACTED"
    VALIDATING          = "VALIDATING"
    VALIDATING_FIELDS   = "VALIDATING_FIELDS"
    AWAITING_CONFIRM    = "AWAITING_CONFIRM"
    AWAITING_PO_DECISION = "AWAITING_PO_DECISION"   # NEW — waiting for user PO yes/no
    CREATING            = "CREATING"
    ON_HOLD             = "ON_HOLD"
    COMPLETED           = "COMPLETED"
    FAILED              = "FAILED"
    CANCELLED           = "CANCELLED"


class InputMode(str, Enum):
    CHAT  = "CHAT"
    PDF   = "PDF"
    IMAGE = "IMAGE"
    EXCEL = "EXCEL"


class AgentIntent(str, Enum):
    CREATE_INVOICE = "CREATE_INVOICE"
    QUERY_STATUS   = "QUERY_STATUS"
    MANAGE_HOLDS   = "MANAGE_HOLDS"
    CANCEL_INVOICE = "CANCEL_INVOICE"
    BULK_PROCESS   = "BULK_PROCESS"
    SCAN_DOCUMENT  = "SCAN_DOCUMENT"
    GENERAL_QUERY  = "GENERAL_QUERY"
    CORRECT_FIELD  = "CORRECT_FIELD"
    CONFIRM        = "CONFIRM"
    REJECT         = "REJECT"


class DecisionAction(str, Enum):
    AUTO_CREATE      = "AUTO_CREATE"
    ASK_CONFIRMATION = "ASK_CONFIRMATION"
    EXPLAIN_ERRORS   = "EXPLAIN_ERRORS"
    ASK_MISSING      = "ASK_MISSING"
    ASK_PO_DECISION  = "ASK_PO_DECISION"   # NEW — prompt user to add PO or skip
    BLOCK            = "BLOCK"


# ─────────────────────────────────────────────────────────────────────────────
# Sub-models
# ─────────────────────────────────────────────────────────────────────────────

class BusinessUnitInfo(BaseModel):
    bu_id:     Optional[int]  = None
    bu_name:   Optional[str]  = None
    validated: Optional[bool] = False


class SupplierInfo(BaseModel):
    supplier_id:        Optional[int]  = None
    supplier_number:    Optional[str]  = None
    supplier_name:      Optional[str]  = None
    supplier_site_id:   Optional[int]  = None
    supplier_site_code: Optional[str]  = None
    payment_terms:      Optional[str]  = None
    currency:           Optional[str]  = None
    on_hold:            Optional[bool] = False
    hold_reason:        Optional[str]  = None
    all_sites:          List[Dict]     = Field(default_factory=list)
    validated:          Optional[bool] = False
    site_validated:     Optional[bool] = False


class POInfo(BaseModel):
    po_header_id:     Optional[int]   = None
    po_number:        Optional[str]   = None
    po_status:        Optional[str]   = None
    order_amount:     Optional[float] = None
    billed_amount:    Optional[float] = None
    remaining_amount: Optional[float] = None
    currency:         Optional[str]   = None
    lines:            List[Dict]      = Field(default_factory=list)
    # validated is always True — PO is not checked against Oracle, just passed through
    validated:        Optional[bool]  = True
    amount_exceeded:  Optional[bool]  = False
    excess_amount:    Optional[float] = None
    match_type:       Optional[str]   = "2-WAY"


class InvoiceDistribution(BaseModel):
    distribution_line_number: int           = 1
    distribution_line_type:   str           = "Item"
    distribution_amount:      float         = 0.0
    distribution_combination: Optional[str] = None


class InvoiceLine(BaseModel):
    line_number:              int                       = 1
    line_type:                str                       = "Item"
    line_amount:              float                     = 0.0
    description:              Optional[str]             = None
    quantity:                 Optional[float]           = None
    unit_price:               Optional[float]           = None
    prorate_across_all_items: Optional[bool]            = False
    account_combination:      Optional[str]             = None
    tax_amount:               Optional[float]           = None
    po_line_id:               Optional[int]             = None
    po_line_number:           Optional[int]             = None   # for PO-matched lines
    distributions:            List[InvoiceDistribution] = Field(default_factory=list)


class InvoiceInstallment(BaseModel):
    installment_number:    int             = 1
    due_date:              Optional[str]   = None
    gross_amount:          float           = 0.0
    hold_reason:           Optional[str]   = None
    first_discount_amount: Optional[float] = None


class TaxInfo(BaseModel):
    tax_amount:         Optional[float] = None
    tax_rate:           Optional[float] = None
    tax_classification: Optional[str]  = "UAE-VAT-STANDARD"
    tax_control_amount: Optional[float] = None
    calculate_flag:     str             = "Y"


class ValidationResult(BaseModel):
    passed:     Optional[bool] = False
    errors:     List[str]      = Field(default_factory=list)
    warnings:   List[str]      = Field(default_factory=list)
    checked_at: Optional[str]  = None


class RiskScore(BaseModel):
    score:          int       = 0
    level:          str       = "LOW"
    factors:        List[str] = Field(default_factory=list)
    auto_create_ok: bool      = True


class OracleHold(BaseModel):
    hold_name:   str
    hold_reason: Optional[str]  = None
    held_by:     Optional[str]  = None
    hold_date:   Optional[str]  = None
    releasable:  Optional[bool] = False
    released:    Optional[bool] = False


class ExtractionResult(BaseModel):
    method:                str       = "none"
    confidence:            Dict      = Field(default_factory=dict)
    raw_text:              Optional[str]  = None
    has_variance:          Optional[bool] = False
    variance_detail:       Optional[str]  = None
    extraction_notes:      Optional[str]  = None
    low_confidence_fields: List[str]      = Field(default_factory=list)


class BatchRow(BaseModel):
    row_number:         int
    source_data:        Dict          = Field(default_factory=dict)
    mapped_data:        Dict          = Field(default_factory=dict)
    status:             str           = "PENDING"
    invoice_id:         Optional[int] = None
    invoice_number:     Optional[str] = None
    error:              Optional[str] = None
    holds:              List[str]     = Field(default_factory=list)
    processing_time_ms: Optional[int] = None


class AuditEntry(BaseModel):
    timestamp:   str
    event:       str
    node:        Optional[str]  = None
    detail:      Optional[str]  = None
    duration_ms: Optional[int]  = None
    success:     Optional[bool] = True
    error:       Optional[str]  = None


class OrgMemory(BaseModel):
    common_gl_combinations: List[str]  = Field(default_factory=list)
    supplier_defaults:      Dict       = Field(default_factory=dict)
    bu_defaults:            Dict       = Field(default_factory=dict)
    recent_patterns:        List[Dict] = Field(default_factory=list)


# ─────────────────────────────────────────────────────────────────────────────
# Master State
# ─────────────────────────────────────────────────────────────────────────────

class InvoiceState(BaseModel):

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        use_enum_values=True,
    )

    # Messages — List[Any] prevents pydantic v1/v2 BaseMessage type conflict
    messages: List[Any] = Field(default_factory=list)

    # Request context
    user_id:    int           = 0
    session_id: str           = ""
    org_id:     Optional[str] = None
    tenant_id:  Optional[str] = None

    # Intent + mode
    detected_intent:  Optional[str] = None
    input_mode:       str           = "CHAT"
    raw_user_message: Optional[str] = None
    invoice_mode:     str           = "NON_PO"   # default: NON_PO; set to PO if user provides PO

    # Workflow
    status:          str           = "DRAFT"
    current_node:    Optional[str] = None
    decision_action: Optional[str] = None

    # ── PO decision flags (NEW) ───────────────────────────────────────────────
    # awaiting_po_decision: True when all required non-PO fields are collected
    #   and we're waiting for user to say yes/no to providing a PO number.
    # po_skipped: True when the user explicitly chose NOT to provide a PO number.
    # po_decision_made: True once user has answered the PO question either way.
    awaiting_po_decision: bool = False
    po_skipped:           bool = False
    po_decision_made:     bool = False

    # Business Unit
    business_unit:    Optional[str] = None
    business_unit_id: Optional[int] = None
    bu_info:          BusinessUnitInfo = Field(default_factory=BusinessUnitInfo)

    # Invoice header
    invoice_number:        Optional[str]   = None
    invoice_date:          Optional[str]   = None
    invoice_type:          str             = "Standard"
    description:           Optional[str]   = None
    currency:              str             = "AED"
    invoice_amount:        Optional[float] = None
    gl_date:               Optional[str]   = None
    payment_terms:         Optional[str]   = None
    invoice_group:         Optional[str]   = None
    conversion_rate:       Optional[float] = None
    invoice_received_date: Optional[str]   = None

    # Supplier
    supplier: SupplierInfo = Field(default_factory=SupplierInfo)

    # PO — entirely optional now
    po: POInfo = Field(default_factory=POInfo)

    # Lines + tax + installments
    lines:        List[InvoiceLine]        = Field(default_factory=list)
    installments: List[InvoiceInstallment] = Field(default_factory=list)
    tax:          TaxInfo                  = Field(default_factory=TaxInfo)

    # Validation + risk
    field_validation: ValidationResult = Field(default_factory=ValidationResult)
    risk:             RiskScore         = Field(default_factory=RiskScore)
    user_confirmed:   Optional[bool]    = False
    correction_mode:  Optional[bool]    = False
    awaiting_review:  Optional[bool]    = False

    # Oracle results
    oracle_invoice_id:     Optional[str]    = None
    oracle_invoice_number: Optional[str]    = None
    oracle_invoice_status: Optional[str]    = None
    holds:                 List[OracleHold] = Field(default_factory=list)
    posted:                Optional[bool]   = False
    due_date:              Optional[str]    = None

    # Document extraction
    extraction:  ExtractionResult = Field(default_factory=ExtractionResult)
    file_base64: Optional[str]    = None
    file_type:   Optional[str]    = None

    # Batch
    batch_rows:    List[BatchRow] = Field(default_factory=list)
    batch_total:   int            = 0
    batch_success: int            = 0
    batch_failed:  int            = 0
    is_batch_mode: Optional[bool] = False

    # Org memory
    org_memory: OrgMemory = Field(default_factory=OrgMemory)

    # Errors + audit
    errors:    List[str]        = Field(default_factory=list)
    warnings:  List[str]        = Field(default_factory=list)
    audit_log: List[AuditEntry] = Field(default_factory=list)

    # Tracking
    missing_required: List[str]     = Field(default_factory=list)
    retry_count:      int           = 0
    max_retries:      int           = 3
    last_tool:        Optional[str] = None
    tool_results:     Dict          = Field(default_factory=dict)

    # ─── Helpers ─────────────────────────────────────────────────────────────

    def get_missing_required(self) -> List[str]:
        """
        Returns list of hard-required fields that are missing.

        PO number is NOT in this list — it is optional.
        The flow asks the user if they want to add a PO number separately
        via the awaiting_po_decision / po_decision_made flags.
        """
        missing = []
        if not self.business_unit and not self.business_unit_id:
            missing.append("business_unit")
        if not self.supplier.supplier_name and not self.supplier.supplier_number:
            missing.append("supplier_name")
        if not self.supplier.supplier_site_code and not self.supplier.supplier_site_id:
            missing.append("supplier_site")
        if not self.invoice_number:
            missing.append("invoice_number")
        if not self.invoice_date:
            missing.append("invoice_date")
        if self.invoice_amount is None:
            missing.append("invoice_amount")
        if not self.invoice_type:
            missing.append("invoice_type")
        if not self.payment_terms:
            missing.append("payment_terms")
        if not self.description:
            missing.append("description")
        # Lines are required — but only GL combinations on non-PO invoices
        if not self.lines:
            missing.append("invoice_lines")
        # PO — NEVER listed here; handled by awaiting_po_decision flow
        return missing

    def all_required_complete(self) -> bool:
        """True when every hard-required field is present."""
        return len(self.get_missing_required()) == 0

    def ready_for_po_question(self) -> bool:
        """
        True when all non-PO required fields are complete
        and we haven't yet asked the PO question.
        """
        return (
            self.all_required_complete()
            and not self.po_decision_made
            and not self.awaiting_po_decision
        )

    def lines_sum(self) -> float:
        return round(sum(l.line_amount for l in self.lines), 2)

    def distributions_valid(self) -> bool:
        """GL distributions only required for NON_PO invoices."""
        if self.invoice_mode != "NON_PO":
            return True
        for line in self.lines:
            has = (
                line.account_combination
                or any(d.distribution_combination for d in line.distributions)
            )
            if not has:
                return False
        return True

    def has_amount_variance(self) -> bool:
        if self.invoice_amount and self.lines:
            diff = abs(self.lines_sum() - (self.invoice_amount - (self.tax.tax_amount or 0)))
            return diff > 0.10
        return False

    def add_audit(self, event: str, node: str = None, detail: str = None,
                  duration_ms: int = None, success: bool = True, error: str = None):
        self.audit_log.append(AuditEntry(
            timestamp=datetime.datetime.utcnow().isoformat(),
            event=event, node=node, detail=detail,
            duration_ms=duration_ms, success=success, error=error,
        ))

    # ── LangGraph compatibility ───────────────────────────────────────────────

    def get(self, key: str, default=None):
        try:
            val = getattr(self, key)
            return val if val is not None else default
        except AttributeError:
            return default

    def __getitem__(self, key: str):
        try:
            return getattr(self, key)
        except AttributeError:
            raise KeyError(key)

    def __setitem__(self, key: str, value):
        setattr(self, key, value)

    def keys(self):
        return self.model_fields.keys()

    def __contains__(self, key: str) -> bool:
        return key in self.model_fields