
from __future__ import annotations
import datetime
import json
import logging
import os
from typing import List, Optional

import httpx
import redis as redis_lib

_redis = redis_lib.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0,
    decode_responses=True,
)


# -----------------------------------------------------------------------------
# Credential resolution — DB only, no .env fallback
# -----------------------------------------------------------------------------

def _get_oic_config(user_id: int, tenant_id: str = "default") -> dict:
    """
    Credential resolution order:
      1. Redis cache  (TTL 300s — avoids hitting DB on every OIC call)
      2. PostgreSQL   (user saved credentials via Integration Settings page)

    There is NO .env fallback. If credentials are not found in Redis or
    PostgreSQL, a ValueError is raised with a clear message telling the user
    to configure their credentials in Integration Settings.

    This ensures every API call always uses the correct per-user credentials
    and prevents any shared / environment-level credential leaking across users.
    """
    _log = logging.getLogger("invoice.oic")

    # -------------------------------------------------------------------------
    # 1. Redis cache (TTL 300s)
    # -------------------------------------------------------------------------
    cache_key = f"user:{user_id}:oracle:oic_config"
    try:
        raw = _redis.get(cache_key)
        if raw:
            _log.info(f"[_get_oic_config] credentials from Redis cache for user {user_id}")
            return json.loads(raw)
    except Exception as e:
        _log.warning(f"[_get_oic_config] Redis cache read failed: {e}")

    # -------------------------------------------------------------------------
    # 2. PostgreSQL — credentials saved from Integration Settings page
    #    Table: oracle_user_credentials (user_id, oic_url, username, password)
    # -------------------------------------------------------------------------
    try:
        import psycopg2

        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cur  = conn.cursor()
        cur.execute(
            """
            SELECT oic_url, username, password
            FROM   oracle_user_credentials
            WHERE  user_id = %s
            LIMIT  1
            """,
            (user_id,),
        )
        row = cur.fetchone()
        cur.close()
        conn.close()

        if row and row[0] and row[1] and row[2]:
            creds = {
                "oic_url":  row[0],
                "username": row[1],
                "password": row[2],
            }
            _log.warning(f"[_get_oic_config] ✅ DB credentials found for user {user_id}")

            # Write back to Redis cache (5-minute TTL)
            try:
                _redis.setex(cache_key, 300, json.dumps(creds))
            except Exception as e:
                _log.warning(f"[_get_oic_config] Redis cache write failed: {e}")

            return creds

        # Row exists but one or more fields are blank
        _log.warning(
            f"[_get_oic_config] ⚠️ Incomplete DB credentials for user {user_id} "
            f"(row found but field(s) empty)"
        )

    except Exception as e:
        _log.warning(f"[_get_oic_config] PostgreSQL credential lookup failed: {e}")

    # -------------------------------------------------------------------------
    # No credentials found — raise a clear, user-facing error.
    # NO .env fallback. This is intentional.
    # -------------------------------------------------------------------------
    raise ValueError(
        f"Oracle OIC credentials not configured for user {user_id}. "
        "Please go to Integration Settings and save your Oracle OIC URL, "
        "username, and password before creating invoices."
    )
def _extract_oic_error(result: dict) -> str:
    raw = str(result.get("Status") or result.get("status") or "")

    import re
    match = re.search(r"\[\!\[CDATA\[(.*?)\]\]\]", raw)
    if match:
        return match.group(1)

    return raw or "Oracle error occurred"

# -----------------------------------------------------------------------------
# HTTP helpers
# -----------------------------------------------------------------------------

def _oic_post(user_id: int, payload: list, tenant_id: str = "default") -> dict:
    _log = logging.getLogger("invoice.oic")

    def _do_post():
        cfg = _get_oic_config(user_id, tenant_id)
        url = cfg["oic_url"]

        # Only append ?PO_NUMBER= when a real PO was provided.
        # None / missing must NOT be appended — OIC treats any value here as
        # a PO-matched invoice and tries to fetch PoHeaderId, causing CASDK-0041.
        po_number_from_payload = None
        try:
            po_val = payload[0].get("PurchaseOrderNumber")
            if po_val and str(po_val).strip() not in ("", "null"):
                po_number_from_payload = str(po_val).strip()
        except Exception:
            pass

        if po_number_from_payload:
            sep = "&" if "?" in url else "?"
            url = f"{url}{sep}PO_NUMBER={po_number_from_payload}"
            _log.warning(f"[_oic_post] PO invoice -> POST {url}")
        else:
            _log.warning(f"[_oic_post] Non-PO invoice -> POST {url}")

        r = httpx.post(
            url,
            json=payload,
            auth=(cfg["username"], cfg["password"]),
            headers={"Content-Type": "application/json"},
            timeout=60,
        )
        _log.warning(f"[_oic_post] status={r.status_code} body={r.text[:500]!r}")
        r.raise_for_status()
        try:
            return r.json()
        except Exception:
            return {"status": "SUCCESS", "raw_response": r.text}

    try:
        from security.circuit_breaker import (
            allow_request, record_success, record_failure, CircuitOpenError,
        )
        from security.retry import with_retry

        if not allow_request(tenant_id):
            raise CircuitOpenError("OIC is temporarily unavailable. Circuit breaker is open.")

        try:
            result = with_retry(_do_post, max_retries=3)
            record_success(tenant_id)
            return result
        except Exception as e:
            record_failure(tenant_id, str(e))
            raise

    except ImportError:
        _log.warning("[_oic_post] security modules not found, calling OIC directly")
        return _do_post()


def _oracle_get(
    user_id:   int,
    endpoint:  str,
    params:    dict = None,
    tenant_id: str  = "default",
) -> dict:
    from security.circuit_breaker import (
        allow_request, record_success, record_failure, CircuitOpenError,
    )
    from security.retry import with_retry

    if not allow_request(tenant_id):
        raise CircuitOpenError("Oracle API circuit breaker is open.")

    def _do_get():
        try:
            from security.credentials import get_credentials
            creds = get_credentials(user_id, tenant_id)
        except ImportError:
            creds = None

        if not creds:
            key = f"user:{user_id}:oracle:ERP"
            raw = _redis.get(key)
            if not raw:
                raise ValueError(
                    f"Oracle ERP credentials not found for user {user_id}. "
                    "Please configure them in Integration Settings."
                )
            creds = json.loads(raw)

        base = (creds.get("baseUrl") or "").rstrip("/")
        url  = f"{base}/fscmRestApi/resources/11.13.18.05{endpoint}"
        r    = httpx.get(
            url,
            params=params or {},
            auth=(creds["username"], creds["password"]),
            headers={"Accept": "application/json"},
            timeout=30,
        )
        r.raise_for_status()
        return r.json()

    try:
        result = with_retry(_do_get, max_retries=3)
        record_success(tenant_id)
        return result
    except Exception as e:
        record_failure(tenant_id, str(e))
        raise


# -----------------------------------------------------------------------------
# Error translation
# -----------------------------------------------------------------------------

def _translate_oracle_error(error_text: str) -> str:
    err = str(error_text).upper()
    if "DUPLICATE" in err or "ALREADY EXISTS" in err:
        return "An invoice with that number already exists for this supplier."
    if "CLOSED PERIOD" in err or "PERIOD" in err:
        return "The invoice date falls in a closed GL period. Use a more recent date."
    if "SUPPLIER" in err and "HOLD" in err:
        return "Supplier has a payment hold. Invoice created but payment is blocked."
    if "GL" in err or "COMBINATION" in err:
        return "Invalid GL account combination. Check each segment."
    if "AMOUNT" in err:
        return "Invoice amount mismatch. Verify lines total matches header."
    if "CURRENCY" in err:
        return "Currency code invalid or not enabled for this business unit."
    if "SITE" in err:
        return "Supplier site is not active or not configured for payments."
    if "circuit" in str(error_text).lower():
        return "Oracle is temporarily unavailable. Please try again in 60 seconds."
    if "credentials not configured" in str(error_text).lower():
        # Pass the user-facing message through unchanged
        return str(error_text)
    return f"Oracle error: {error_text}"


# -----------------------------------------------------------------------------
# Payload builder — canonical OIC format
# -----------------------------------------------------------------------------

def _build_payload(
    invoice_number:        str,
    invoice_currency:      str,
    invoice_amount:        float,
    invoice_date:          str,
    business_unit:         str,
    supplier_name:         str,
    supplier_site:         str,
    description:           str             = "",
    invoice_type:          str             = "Standard",
    payment_terms:         Optional[str]   = None,
    invoice_group:         Optional[str]   = None,
    gl_date:               Optional[str]   = None,
    conversion_rate:       Optional[float] = None,
    invoice_received_date: Optional[str]   = None,
    po_number:             Optional[str]   = None,
    lines:                 list            = None,
    installments:          list            = None,
    tax_amount:            Optional[float] = None,
) -> list:
    """
    Builds the canonical OIC payload array.

    PO:  When po_number is None/empty, PurchaseOrderNumber is sent as null
         (not the string "null") per OIC API requirements for non-PO invoices.
         Sending the string "null" causes OIC to attempt PO matching and
         raises CASDK-0041.
    """
    # -- Lines ----------------------------------------------------------------
    invoice_lines = []
    if lines:
        for i, line in enumerate(lines, start=1):
            dists = []
            if line.get("distributions"):
                for j, d in enumerate(line["distributions"], start=1):
                    dists.append({
                        "DistributionLineNumber":  j,
                        "DistributionLineType":    d.get("distribution_line_type", "Item"),
                        "DistributionAmount":      d.get("distribution_amount", 0),
                        "DistributionCombination": d.get("distribution_combination"),
                    })
            elif line.get("account_combination"):
                dists.append({
                    "DistributionLineNumber":  1,
                    "DistributionLineType":    line.get("line_type", "Item"),
                    "DistributionAmount":      line.get("line_amount", 0),
                    "DistributionCombination": line["account_combination"],
                })

            po_line_num = line.get("po_line_number") or line.get("PurchaseOrderLineNumber")
            if po_number:
                po_line_num = po_line_num or 1
            else:
                po_line_num = None

            line_obj = {
                "LineNumber":               i,
                "LineType":                 line.get("line_type", "Item"),
                "LineAmount":               line.get("line_amount", 0),
                "Description":              line.get("description") or description,
                "ProrateAcrossAllItemsFlag": line.get("prorate_across_all_items", False),
                "PurchaseOrderLineNumber":  po_line_num,
                "invoiceDistributions":     dists if dists else [],
            }

            if line.get("quantity"):
                line_obj["Quantity"]  = line["quantity"]
                line_obj["UnitPrice"] = line.get("unit_price")

            invoice_lines.append(line_obj)
    else:
        invoice_lines.append({
            "LineNumber":               1,
            "LineType":                 "Item",
            "LineAmount":               invoice_amount - (tax_amount or 0),
            "Description":              description or "Invoice Line",
            "ProrateAcrossAllItemsFlag": True,
            "PurchaseOrderLineNumber":  None,
            "invoiceDistributions":     [],
        })

    # -- Installments ---------------------------------------------------------
    invoice_installments = []
    if installments:
        for inst in installments:
            invoice_installments.append({
                "InstallmentNumber":   inst.get("installment_number", 1),
                "DueDate":             inst.get("due_date"),
                "GrossAmount":         inst.get("gross_amount", 0),
                "HoldReason":          inst.get("hold_reason", None),
                "FirstDiscountAmount": inst.get("first_discount_amount", None),
            })

    # -- Invoice object -------------------------------------------------------
    invoice_obj = {
        "InvoiceNumber":       invoice_number,
        "InvoiceCurrency":     invoice_currency,
        "InvoiceAmount":       invoice_amount,
        "InvoiceDate":         invoice_date,
        "BusinessUnit":        business_unit,
        "Supplier":            supplier_name,
        "SupplierSite":        supplier_site,
        "InvoiceGroup":        invoice_group or invoice_date,
        "Description":         description,
        # Send actual null (None), NOT the string "null".
        # Sending "null" as a string causes CASDK-0041.
        "ConversionRate":      conversion_rate if conversion_rate else None,
        "InvoiceReceivedDate": invoice_received_date if invoice_received_date else None,
        "InvoiceType":         invoice_type if invoice_type else None,
        "PurchaseOrderNumber": po_number if po_number else None,
        "invoiceLines":        invoice_lines,
    }

    if payment_terms:
        invoice_obj["PaymentTerms"] = payment_terms
    if gl_date:
        invoice_obj["GlDate"] = gl_date
    if tax_amount:
        invoice_obj["TaxControlAmount"] = tax_amount
    if invoice_installments:
        invoice_obj["invoiceInstallments"] = invoice_installments

    return [invoice_obj]


# -----------------------------------------------------------------------------
# UNIFIED INVOICE CREATION  (PO optional)
# -----------------------------------------------------------------------------

def create_invoice(
    user_id:               int,
    invoice_number:        str,
    invoice_currency:      str,
    invoice_amount:        float,
    invoice_date:          str,
    business_unit:         str,
    supplier_name:         str,
    supplier_site:         str,
    description:           str             = "",
    invoice_type:          str             = "Standard",
    payment_terms:         Optional[str]   = None,
    invoice_group:         Optional[str]   = None,
    gl_date:               Optional[str]   = None,
    conversion_rate:       Optional[float] = None,
    invoice_received_date: Optional[str]   = None,
    po_number:             Optional[str]   = None,
    lines:                 list            = None,
    installments:          list            = None,
    tax_amount:            Optional[float] = None,
    tenant_id:             str             = "default",
    session_id:            str             = "",
    supplier_id:           int             = 0,
) -> dict:
    """
    Unified invoice creation — handles both PO and non-PO invoices.

    Credentials are always loaded from Redis cache or PostgreSQL.
    There is no .env fallback — if no credentials are found for the user,
    a clear error is returned immediately before any OIC call is attempted.

    If po_number is provided, the invoice is matched to the PO.
    If po_number is None/empty, a standard non-PO invoice is created.
    """
    try:
        # -- Early credential check -------------------------------------------
        # Verify credentials exist BEFORE doing any other work.
        # This gives a clear, immediate error message rather than a cryptic
        # OIC HTTP error if Integration Settings haven't been configured yet.
        try:
            _get_oic_config(user_id, tenant_id)
        except ValueError as cred_error:
            return {
                "success":      False,
                "humanMessage": str(cred_error),
            }

        # -- Idempotency check ------------------------------------------------
        register_invoice = None
        try:
            from security.idempotency import check_duplicate, register_invoice
            dup = check_duplicate(
                tenant_id=tenant_id,
                supplier_id=supplier_id,
                invoice_number=invoice_number,
                invoice_amount=invoice_amount,
                business_unit=business_unit,
            )
            if dup["is_duplicate"]:
                return {
                    "success":      False,
                    "isDuplicate":  True,
                    "humanMessage": (
                        f"Invoice {invoice_number} was already created "
                        f"(ID: {dup.get('existing_invoice_id')}). "
                        "Duplicate creation blocked."
                    ),
                    "existingId": dup.get("existing_invoice_id"),
                }
        except ImportError:
            pass

        # -- PO validation gate (inlined — zero external dependencies) --------
        #
        # Catches garbage LLM extractions before they reach OIC.
        #
        # "ber", "null", "n/a", or anything under 8 characters:
        #     -> po_number = None  (clean non-PO invoice, no error shown)
        #
        # Long value that doesn't match PO pattern (e.g. "ABCDE-12345-XYZ"):
        #     -> returns human-readable error, OIC is never called
        #
        # Valid value (e.g. "101-PO-25008859"):
        #     -> normalised to uppercase and passed through to OIC
        #
        if po_number:
            import re as _re
            _po_blocklist = {
                "null", "none", "n/a", "na", "po", "po#",
                "ber", "no", "num", "number", "purchase order",
            }
            _po_clean = po_number.strip().upper()
            if _po_clean.lower() in _po_blocklist or len(_po_clean) < 8:
                # Noise word or truncated extraction — treat as non-PO invoice
                po_number = None
            elif not _re.match(r'^\d{3}-PO-\d{6,}$', _po_clean):
                return {
                    "success":      False,
                    "humanMessage": (
                        f"PO number '{po_number}' looks incorrect or incomplete. "
                        "Please provide the full PO number (e.g. 101-PO-25008859)."
                    ),
                }
            else:
                po_number = _po_clean
        # ---------------------------------------------------------------------

        # -- Build payload ----------------------------------------------------
        payload = _build_payload(
            invoice_number=invoice_number,
            invoice_currency=invoice_currency,
            invoice_amount=invoice_amount,
            invoice_date=invoice_date,
            business_unit=business_unit,
            supplier_name=supplier_name,
            supplier_site=supplier_site,
            description=description,
            invoice_type=invoice_type,
            payment_terms=payment_terms,
            invoice_group=invoice_group,
            gl_date=gl_date,
            conversion_rate=conversion_rate,
            invoice_received_date=invoice_received_date,
            po_number=po_number or None,
            lines=lines,
            installments=installments,
            tax_amount=tax_amount,
        )

        import logging as _logging
        _logging.getLogger("invoice.oic").warning(
            f"[create_invoice] po={'YES: ' + po_number if po_number else 'NO'} | "
            f"Full payload:\n{json.dumps(payload, indent=2, default=str)}"
        )

        # -- POST to OIC ------------------------------------------------------
        result = _oic_post(user_id, payload, tenant_id)

        if isinstance(result, list):
            result = result[0] if result else {}
        status_text = str(result.get("Status") or result.get("status") or "")
        if "failed" in status_text.lower():
            error_msg = _extract_oic_error(result)
            return {
              "success": False,
              "error": error_msg,
              "humanMessage": error_msg }
        

        oracle_id = (
            result.get("InvoiceId")
            or result.get("invoiceId")
            or result.get("invoiceNumber")
            or result.get("InvoiceNumber")
        )

        raw_text = result.get("raw_response", "")
        if not oracle_id and raw_text:
            import re as _re
            _match = _re.search(r"[A-Z0-9_\-]{6,}", raw_text)
            oracle_id = _match.group(0) if _match else invoice_number

        # -- Register idempotency ---------------------------------------------
        if oracle_id and register_invoice:
            try:
                register_invoice(
                    tenant_id=tenant_id,
                    supplier_id=supplier_id,
                    invoice_number=invoice_number,
                    invoice_amount=invoice_amount,
                    business_unit=business_unit,
                    invoice_id=oracle_id,
                    created_at=datetime.datetime.utcnow().isoformat(),
                )
            except Exception:
                pass

        mode_label = f"PO-matched ({po_number})" if po_number else "Non-PO"
        return {
            "success":       True,
            "invoiceId":     oracle_id,
            "invoiceNumber": result.get("InvoiceNumber") or result.get("invoiceNumber") or oracle_id,
            "status":        result.get("WfStatus") or result.get("status") or "CREATED",
            "message":       f"{mode_label} invoice {invoice_number} created successfully.",
            "oicResponse":   raw_text or None,
        }

    except Exception as e:
        error_msg = str(e)
        human_msg = _translate_oracle_error(error_msg)

        try:
            from security.retry import is_transient_error
            if is_transient_error(error_msg) and session_id:
                from queue.dead_letter import push_failed_invoice
                push_failed_invoice(
                    tenant_id=tenant_id,
                    session_id=session_id,
                    user_id=user_id,
                    invoice_data={
                        "invoice_number":   invoice_number,
                        "invoice_currency": invoice_currency,
                        "invoice_amount":   invoice_amount,
                        "invoice_date":     invoice_date,
                        "business_unit":    business_unit,
                        "supplier_name":    supplier_name,
                        "supplier_site":    supplier_site,
                        "po_number":        po_number,
                    },
                    error=error_msg,
                    retry_count=3,
                )
        except Exception:
            pass

        return {
            "success":      False,
            "error":        error_msg,
            "humanMessage": human_msg,
        }


# -----------------------------------------------------------------------------
# Legacy wrappers — kept for backward compatibility
# -----------------------------------------------------------------------------

def create_non_po_invoice(
    user_id: int, invoice_number: str, invoice_currency: str,
    invoice_amount: float, invoice_date: str, business_unit: str,
    supplier_name: str, supplier_site: str, description: str = "",
    invoice_type: str = "Standard", payment_terms: Optional[str] = None,
    invoice_group: Optional[str] = None, gl_date: Optional[str] = None,
    lines: list = None, installments: list = None,
    tax_amount: Optional[float] = None, tenant_id: str = "default",
    session_id: str = "", supplier_id: int = 0,
) -> dict:
    return create_invoice(
        user_id=user_id, invoice_number=invoice_number,
        invoice_currency=invoice_currency, invoice_amount=invoice_amount,
        invoice_date=invoice_date, business_unit=business_unit,
        supplier_name=supplier_name, supplier_site=supplier_site,
        description=description, invoice_type=invoice_type,
        payment_terms=payment_terms, invoice_group=invoice_group,
        gl_date=gl_date, lines=lines, installments=installments,
        tax_amount=tax_amount, tenant_id=tenant_id, session_id=session_id,
        supplier_id=supplier_id, po_number=None,
    )


def create_po_invoice(
    user_id: int, invoice_number: str, invoice_currency: str,
    invoice_amount: float, invoice_date: str, business_unit: str,
    supplier_name: str, supplier_site: str, po_number: str,
    description: str = "", invoice_type: str = "Standard",
    payment_terms: Optional[str] = None, lines: list = None,
    tenant_id: str = "default", session_id: str = "", supplier_id: int = 0,
) -> dict:
    return create_invoice(
        user_id=user_id, invoice_number=invoice_number,
        invoice_currency=invoice_currency, invoice_amount=invoice_amount,
        invoice_date=invoice_date, business_unit=business_unit,
        supplier_name=supplier_name, supplier_site=supplier_site,
        description=description, invoice_type=invoice_type,
        payment_terms=payment_terms, lines=lines,
        tenant_id=tenant_id, session_id=session_id,
        supplier_id=supplier_id, po_number=po_number,
    )


# -----------------------------------------------------------------------------
# STATUS QUERY
# -----------------------------------------------------------------------------

def get_invoice_status(
    user_id:        int,
    invoice_number: str,
    tenant_id:      str = "default",
) -> dict:
    try:
        res   = _oracle_get(
            user_id,
            "/invoices",
            {
                "q":      f"InvoiceNumber={invoice_number}",
                "fields": "InvoiceId,InvoiceNumber,WfStatus,InvoiceAmount,DueDate,InvoiceDate",
                "limit":  5,
            },
            tenant_id,
        )
        items = res.get("items", [])
        if not items:
            return {"found": False, "message": f"Invoice '{invoice_number}' not found."}
        inv = items[0]
        return {
            "found":         True,
            "invoiceId":     inv.get("InvoiceId"),
            "invoiceNumber": inv.get("InvoiceNumber"),
            "status":        inv.get("WfStatus"),
            "amount":        inv.get("InvoiceAmount"),
            "invoiceDate":   inv.get("InvoiceDate"),
            "dueDate":       inv.get("DueDate"),
        }
    except Exception as e:
        return {"found": False, "error": str(e)}