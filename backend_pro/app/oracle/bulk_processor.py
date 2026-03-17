"""
oracle/bulk_processor.py

Expert bulk invoice processor.

Pipeline:
  Excel rows + PDFs
      ↓  InvoiceFieldExtractor  (expert field normaliser)
      ↓  InvoiceMerger          (PDF overwrites blank Excel fields)
      ↓  MultiLineGrouper       (same invoice_number → one invoice, N lines)
      ↓  OICPayloadBuilder      (builds EXACT OIC array — no validation)
      ↓  _oic_post()            (separate HTTP calls for PO and Non-PO batches)
      ↓  ResultMapper           (maps OIC response array back to rows)

Key design decisions:
  - Zero validation calls before posting — OIC is the authority
  - PO invoice detected when PurchaseOrderNumber is non-null/non-empty
  - All OIC field names match the payload spec exactly
  - Every field has a fallback so nothing crashes on missing data
  - invoiceLines + invoiceDistributions always present (OIC requires them)
  - invoiceInstallments included when due dates / installment amounts are found
  - PO and Non-PO invoices are split and sent to their respective OIC endpoints
"""

from __future__ import annotations
import json
import logging
import re
from collections import OrderedDict
from datetime import datetime
from typing import Optional

_log = logging.getLogger("oracle.bulk")

# ─────────────────────────────────────────────────────────────────────────────
# EXPERT PDF EXTRACTION PROMPT
# ─────────────────────────────────────────────────────────────────────────────

BULK_EXTRACTION_PROMPT = """
You are an expert Oracle Fusion AP invoice extraction system.
Extract EVERY field from this invoice document.
Return ONLY valid JSON — no markdown, no explanation, just the JSON object.

{
  "InvoiceNumber":        "invoice reference number",
  "InvoiceDate":          "YYYY-MM-DD",
  "InvoiceAmount":        <number>,
  "InvoiceCurrency":      "3-letter ISO code e.g. AED",
  "InvoiceType":          "Standard | Credit Memo | Prepayment | Debit Memo",
  "InvoiceGroup":         "group or batch label if visible, else format date as DDMmmYYYY",
  "InvoiceReceivedDate":  "YYYY-MM-DD — date stamp received, or same as invoice date",
  "BusinessUnit":         "legal entity or business unit name on document",
  "Supplier":             "full exact supplier/vendor company name",
  "SupplierSite":         "supplier site / branch / address label if present, else null",
  "Description":          "invoice description or subject",
  "PurchaseOrderNumber":  "PO number if present anywhere, else null",
  "PaymentTerms":         "e.g. Net 30, or null",
  "ConversionRate":       <number or null>,
  "TaxControlAmount":     <number or null>,
  "GlDate":               "YYYY-MM-DD or null",
  "ImageName":            null,

  "invoiceInstallments": [
    {
      "InstallmentNumber": <integer>,
      "DueDate": "YYYY-MM-DD",
      "GrossAmount": <number>
    }
  ],

  "invoiceLines": [
    {
      "LineNumber": <integer>,
      "LineType": "Item | Freight | Tax | Miscellaneous",
      "LineAmount": <number>,
      "Description": "line description",
      "ProrateAcrossAllItemsFlag": true,
      "PurchaseOrderLineNumber": <integer or null>,
      "Quantity": <number or null>,
      "UnitPrice": <number or null>,
      "invoiceDistributions": [
        {
          "DistributionLineNumber": <integer>,
          "DistributionLineType": "Item | Freight | Tax",
          "DistributionAmount": <number>,
          "DistributionCombination": "GL combination string or null"
        }
      ]
    }
  ],

  "confidence": {
    "InvoiceNumber": 0.0-1.0,
    "Supplier": 0.0-1.0,
    "InvoiceAmount": 0.0-1.0,
    "InvoiceDate": 0.0-1.0
  },
  "extraction_notes": "any issues or ambiguities"
}

Rules:
- Dates MUST be YYYY-MM-DD
- Amounts MUST be plain numbers (no currency symbols, no commas)
- If PO number appears ANYWHERE on document, capture it in PurchaseOrderNumber
- If multiple payment due dates shown, populate invoiceInstallments for each
- If only one payment date shown, use it as a single installment
- For each invoice line, always include at least one invoiceDistribution
- If GL account combination not shown, set DistributionCombination to null
- confidence 1.0=clearly visible, 0.5=inferred, 0.0=guessed
- For Arabic/English mixed documents, prefer English values
"""


# ─────────────────────────────────────────────────────────────────────────────
# EXCEL COLUMN ALIASES — maps any human column header → standard OIC field name
# ─────────────────────────────────────────────────────────────────────────────

COLUMN_ALIASES: dict[str, list[str]] = {
    # Core
    "InvoiceNumber":       ["invoice number", "invoice no", "invoice #", "inv no",
                            "inv number", "invoice_number", "invoicenumber",
                            "bill number", "bill no", "reference", "ref no"],
    "InvoiceDate":         ["invoice date", "date", "inv date", "bill date",
                            "invoice_date", "invoicedate", "doc date"],
    "InvoiceAmount":       ["amount", "total", "invoice amount", "total amount",
                            "grand total", "invoice_amount", "invoiceamount",
                            "net amount", "gross amount", "invoice total"],
    "InvoiceCurrency":     ["currency", "curr", "ccy", "invoice currency",
                            "invoicecurrency", "currency code"],
    # Supplier
    "Supplier":            ["supplier", "vendor", "supplier name", "vendor name",
                            "company", "supplier_name", "suppliername",
                            "party name", "payee"],
    "SupplierSite":        ["site", "supplier site", "vendor site", "supplier_site",
                            "suppliersite", "pay site", "payment site",
                            "branch", "supplier branch", "remit to"],
    # Business
    "BusinessUnit":        ["business unit", "bu", "legal entity", "business_unit",
                            "businessunit", "org", "organization", "entity",
                            "operating unit", "ledger"],
    # Invoice details
    "InvoiceType":         ["invoice type", "type", "doc type", "invoice_type",
                            "invoicetype", "document type", "transaction type"],
    "InvoiceGroup":        ["invoice group", "invoicegroup", "group",
                            "batch", "invoice_group", "batch name"],
    "InvoiceReceivedDate": ["received date", "receipt date", "receive date",
                            "invoice received date", "invoice_received_date",
                            "invoicereceiveddate", "date received"],
    "Description":         ["description", "desc", "narration", "particulars",
                            "remarks", "notes", "memo", "subject", "purpose"],
    "PurchaseOrderNumber": ["po number", "po no", "po #", "purchase order",
                            "po_number", "ponumber", "purchase order number",
                            "po ref", "order number", "po reference"],
    "PaymentTerms":        ["payment terms", "terms", "pay terms",
                            "payment_terms", "paymentterms", "credit terms"],
    "ConversionRate":      ["conversion rate", "exchange rate", "fx rate",
                            "conversion_rate", "conversionrate", "rate"],
    "GlDate":              ["gl date", "accounting date", "gl_date",
                            "gldate", "accounting_date", "posting date"],
    "TaxControlAmount":    ["tax", "vat", "tax amount", "vat amount", "tax_amount",
                            "taxamount", "tax control amount", "vat total",
                            "tax control"],
    "ImageName":           ["image name", "image_name", "imagename",
                            "attachment", "document name", "filename",
                            "file name", "pdf name"],
    # Line fields (for one-row-per-line Excel layouts)
    "LineNumber":          ["line number", "line_number", "linenumber",
                            "line no", "line #", "item no"],
    "LineType":            ["line type", "line_type", "linetype",
                            "item type", "charge type"],
    "LineAmount":          ["line amount", "line_amount", "lineamount",
                            "net line", "item amount", "line total"],
    "LineDescription":     ["line description", "line_description", "item description",
                            "item desc", "line detail", "line narration"],
    "ProrateAcrossAllItemsFlag": ["prorate", "prorate flag", "prorate_flag",
                                  "prorate across all items"],
    "DistributionCombination": ["account", "gl account", "account code", "gl_account",
                                "distribution combination", "gl combination",
                                "distribution_combination", "glaccount",
                                "cost center", "account combination",
                                "distribution account", "charge account"],
    "DistributionAmount":  ["distribution amount", "dist amount",
                            "distribution_amount"],
    "DistributionLineType": ["distribution type", "dist type",
                             "distribution_type"],
    # Installment fields (flat layout for installments as columns)
    "DueDate":             ["due date", "due_date", "duedate", "payment due",
                            "maturity date", "payment date"],
    "GrossAmount":         ["installment amount", "installment_amount",
                            "instalment amount", "inst amount",
                            "gross amount", "payment amount"],
    "InstallmentNumber":   ["installment number", "installment_number",
                            "installment no", "inst no", "inst number"],
}


# ─────────────────────────────────────────────────────────────────────────────
# FIELD NORMALISER
# Converts any raw value to the correct Python type for OIC
# ─────────────────────────────────────────────────────────────────────────────

class FieldNormaliser:

    NUMERIC_FIELDS = {
        "InvoiceAmount", "TaxControlAmount", "ConversionRate",
        "LineAmount", "DistributionAmount", "GrossAmount",
    }
    DATE_FIELDS = {
        "InvoiceDate", "InvoiceReceivedDate", "GlDate", "DueDate",
    }
    INT_FIELDS = {
        "LineNumber", "InstallmentNumber", "DistributionLineNumber",
    }
    BOOL_FIELDS = {
        "ProrateAcrossAllItemsFlag",
    }

    @classmethod
    def normalise(cls, field: str, value) -> any:
        if value is None or (isinstance(value, str) and not value.strip()):
            return None
        if field in cls.NUMERIC_FIELDS:
            return cls._to_float(value)
        if field in cls.DATE_FIELDS:
            return cls._to_date(value)
        if field in cls.INT_FIELDS:
            return cls._to_int(value)
        if field in cls.BOOL_FIELDS:
            return cls._to_bool(value)
        v = str(value).strip()
        return v if v else None

    @staticmethod
    def _to_float(value) -> Optional[float]:
        if isinstance(value, (int, float)):
            return float(value)
        cleaned = re.sub(r"[^\d.\-]", "", str(value))
        try:
            return float(cleaned)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _to_date(value) -> Optional[str]:
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d")
        s = str(value).strip()
        for fmt in (
            "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y",
            "%d-%m-%Y", "%d %b %Y", "%d %B %Y",
            "%Y/%m/%d", "%d.%m.%Y",
        ):
            try:
                return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return s  # return as-is if can't parse

    @staticmethod
    def _to_int(value) -> Optional[int]:
        try:
            return int(float(str(value).strip()))
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _to_bool(value) -> bool:
        if isinstance(value, bool):
            return value
        return str(value).strip().lower() in ("true", "yes", "1", "y")


# ─────────────────────────────────────────────────────────────────────────────
# EXCEL PARSER  — maps any column layout → OIC field names
# ─────────────────────────────────────────────────────────────────────────────

class ExcelBulkParser:
    """
    Parses Excel/CSV files with any column naming convention.
    Returns rows with keys matching OIC field names exactly.
    """

    def parse(self, file_bytes: bytes, file_name: str) -> dict:
        if file_name.lower().endswith(".csv"):
            raw_rows, headers = self._parse_csv(file_bytes)
        else:
            raw_rows, headers = self._parse_xlsx(file_bytes)

        col_map, unmapped = self._build_col_map(headers)

        rows = []
        for i, raw in enumerate(raw_rows, start=2):
            mapped = self._map_row(raw, col_map)
            mapped["_source_row"] = i
            rows.append(mapped)

        # Filter completely empty rows
        rows = [r for r in rows if any(
            v for k, v in r.items() if not k.startswith("_")
        )]

        return {"rows": rows, "unmapped_columns": unmapped}

    def _parse_xlsx(self, data: bytes):
        import openpyxl, io
        wb   = openpyxl.load_workbook(io.BytesIO(data), data_only=True)
        ws   = wb.active
        all_rows = list(ws.iter_rows(values_only=True))
        if not all_rows:
            return [], []
        headers = [str(h).strip() if h else "" for h in all_rows[0]]
        rows    = [
            dict(zip([h.lower() for h in headers], row))
            for row in all_rows[1:]
            if any(v is not None for v in row)
        ]
        return rows, headers

    def _parse_csv(self, data: bytes):
        import csv, io
        text    = data.decode("utf-8-sig", errors="replace")
        reader  = csv.DictReader(io.StringIO(text))
        headers = list(reader.fieldnames or [])
        rows    = [{k.strip().lower(): v for k, v in r.items()} for r in reader]
        return rows, headers

    def _build_col_map(self, headers: list) -> tuple[dict, list]:
        """Returns {raw_lower → OIC_field_name} and list of unmapped headers."""
        col_map  = {}
        unmapped = []
        for h in headers:
            h_lower = h.lower().strip()
            matched = False
            for field, aliases in COLUMN_ALIASES.items():
                if h_lower in aliases or h_lower == field.lower():
                    col_map[h_lower] = field
                    matched = True
                    break
            if not matched and h_lower:
                unmapped.append(h)
        return col_map, unmapped

    def _map_row(self, raw: dict, col_map: dict) -> dict:
        mapped = {}
        for raw_key, raw_val in raw.items():
            oic_field = col_map.get(raw_key.lower().strip())
            if oic_field:
                mapped[oic_field] = FieldNormaliser.normalise(oic_field, raw_val)
        # Defaults
        mapped.setdefault("InvoiceCurrency", "AED")
        mapped.setdefault("InvoiceType", "Standard")
        return mapped


# ─────────────────────────────────────────────────────────────────────────────
# PDF EXTRACTOR — uses GPT-4o with OIC-aware prompt
# ─────────────────────────────────────────────────────────────────────────────

class PDFBulkExtractor:

    def __init__(self):
        import os, httpx as _httpx
        self.api_key    = os.getenv("OPENAI_API_KEY", "")
        self.vision_url = "https://api.openai.com/v1/chat/completions"

    def extract(self, file_bytes: bytes, file_type: str, filename: str = "") -> dict:
        """Extract invoice fields from PDF/image → OIC-named fields."""
        import base64
        b64 = base64.b64encode(file_bytes).decode()
        try:
            if file_type == "pdf":
                text = self._pdf_to_text(file_bytes)
                if text and len(text.strip()) > 80:
                    result = self._call_llm_text(text)
                    result["_extraction_method"] = "text"
                    result["_filename"] = filename
                    return result
            mime = {
                "pdf": "application/pdf",
                "jpg": "image/jpeg", "jpeg": "image/jpeg",
                "png": "image/png",
            }.get(file_type, "image/jpeg")
            result = self._call_llm_vision(b64, mime)
            result["_extraction_method"] = "vision"
            result["_filename"] = filename
            return result
        except Exception as e:
            _log.error(f"[PDFBulkExtractor] failed for {filename}: {e}")
            return {"_filename": filename, "_error": str(e)}

    def _pdf_to_text(self, data: bytes) -> str:
        import io
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(data))
            return "".join(p.extract_text() or "" for p in reader.pages)
        except Exception:
            return ""

    def _call_llm_text(self, text: str) -> dict:
        import httpx
        payload = {
            "model":       "gpt-4o",
            "messages":    [{"role": "user", "content": f"{BULK_EXTRACTION_PROMPT}\n\nInvoice text:\n\n{text[:8000]}"}],
            "max_tokens":  2500,
            "temperature": 0.0,
        }
        r = httpx.post(
            self.vision_url,
            json=payload,
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            timeout=90,
        )
        r.raise_for_status()
        return self._parse_response(r.json()["choices"][0]["message"]["content"])

    def _call_llm_vision(self, b64: str, mime: str) -> dict:
        import httpx
        payload = {
            "model": "gpt-4o",
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": BULK_EXTRACTION_PROMPT},
                    {"type": "image_url", "image_url": {
                        "url": f"data:{mime};base64,{b64}", "detail": "high"
                    }},
                ],
            }],
            "max_tokens":  2500,
            "temperature": 0.0,
        }
        r = httpx.post(
            self.vision_url,
            json=payload,
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            timeout=120,
        )
        r.raise_for_status()
        return self._parse_response(r.json()["choices"][0]["message"]["content"])

    def _parse_response(self, raw: str) -> dict:
        cleaned = re.sub(r'^```json\s*|^```\s*|\s*```$', '', raw.strip(), flags=re.MULTILINE)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            m = re.search(r'\{[\s\S]+\}', cleaned)
            if m:
                try:
                    return json.loads(m.group())
                except Exception:
                    pass
        return {"_error": "JSON parse failed", "_raw": raw[:500]}


# ─────────────────────────────────────────────────────────────────────────────
# MERGER — combines Excel row + PDF extracted fields
# Rule: Excel wins on fields it has; PDF fills in blanks
# ─────────────────────────────────────────────────────────────────────────────

# All top-level OIC header fields that can come from either source
OIC_HEADER_FIELDS = [
    "InvoiceNumber", "InvoiceDate", "InvoiceAmount", "InvoiceCurrency",
    "InvoiceType", "InvoiceGroup", "InvoiceReceivedDate",
    "BusinessUnit", "Supplier", "SupplierSite",
    "Description", "PurchaseOrderNumber", "PaymentTerms",
    "ConversionRate", "TaxControlAmount", "GlDate", "ImageName",
]


def merge_pdf_into_row(row: dict, pdf: dict) -> dict:
    """
    Merge PDF extracted fields into an Excel row.
    Excel values take priority; PDF fills blanks.
    Also imports invoiceLines and invoiceInstallments from PDF when Excel has none.
    """
    merged = dict(row)

    for field in OIC_HEADER_FIELDS:
        if not merged.get(field) and pdf.get(field):
            merged[field] = pdf[field]

    # Pull lines from PDF if Excel has none
    if not merged.get("_lines") and pdf.get("invoiceLines"):
        merged["_lines_from_pdf"] = pdf["invoiceLines"]

    # Pull installments from PDF if Excel has none
    if not merged.get("_installments") and pdf.get("invoiceInstallments"):
        merged["_installments_from_pdf"] = pdf["invoiceInstallments"]

    # Record which PDF was matched
    merged["_pdf_file"] = pdf.get("_filename")
    merged["_pdf_matched"] = True

    return merged


# ─────────────────────────────────────────────────────────────────────────────
# MULTI-LINE GROUPER
# Handles Excel layout where one row = one invoice LINE
# Groups rows with the same InvoiceNumber into one invoice
# ─────────────────────────────────────────────────────────────────────────────

def group_invoice_lines(rows: list[dict]) -> list[dict]:
    """
    Input:  list of Excel rows (possibly one per line for multi-line invoices)
    Output: list of invoice dicts, each with _lines and _installments populated
    """
    groups: OrderedDict[str, dict] = OrderedDict()

    for i, row in enumerate(rows):
        key = str(row.get("InvoiceNumber") or f"__ROW_{i}__").strip().upper()

        if key not in groups:
            groups[key] = dict(row)
            groups[key]["_lines"]        = []
            groups[key]["_installments"] = []

        grp = groups[key]

        # ── Collect line data ──────────────────────────────────────────────
        has_line_data = any(row.get(f) for f in (
            "LineAmount", "LineType", "LineDescription",
            "DistributionCombination", "LineNumber"
        ))

        if has_line_data:
            # LineAmount: explicit column wins; fall back to InvoiceAmount so it's never 0
            line_amount = (
                FieldNormaliser.normalise("LineAmount", row.get("LineAmount"))
                or FieldNormaliser.normalise("InvoiceAmount", row.get("InvoiceAmount"))
                or 0
            )
            # DistributionAmount: use explicit column, else mirror line amount
            dist_amount = (
                FieldNormaliser.normalise("DistributionAmount", row.get("DistributionAmount"))
                or line_amount
            )
            line = {
                "LineNumber":               row.get("LineNumber") or (len(grp["_lines"]) + 1),
                "LineType":                 row.get("LineType") or "Item",
                "LineAmount":               line_amount,
                "Description":              row.get("LineDescription") or row.get("Description") or "",
                "ProrateAcrossAllItemsFlag": FieldNormaliser.normalise("ProrateAcrossAllItemsFlag", row.get("ProrateAcrossAllItemsFlag")) if row.get("ProrateAcrossAllItemsFlag") is not None else True,
                "PurchaseOrderLineNumber":  None,
                "_dist_combination":        row.get("DistributionCombination"),
                "_dist_amount":             dist_amount,
                "_dist_type":               row.get("DistributionLineType") or row.get("LineType") or "Item",
            }
            grp["_lines"].append(line)

        # ── Collect installment data ───────────────────────────────────────
        if row.get("DueDate") and row.get("GrossAmount"):
            grp["_installments"].append({
                "InstallmentNumber": row.get("InstallmentNumber") or (len(grp["_installments"]) + 1),
                "DueDate":           FieldNormaliser.normalise("DueDate", row["DueDate"]),
                "GrossAmount":       FieldNormaliser.normalise("GrossAmount", row["GrossAmount"]),
            })

    return list(groups.values())


# ─────────────────────────────────────────────────────────────────────────────
# OIC PAYLOAD BUILDER
# Converts a merged, grouped invoice dict → exact OIC invoice object
# ─────────────────────────────────────────────────────────────────────────────

class OICPayloadBuilder:

    def build_invoice(self, inv: dict, idx: int, default_bu: str = "") -> dict:
        """
        Build ONE OIC invoice object from a merged invoice dict.
        Matches the exact payload structure your team provided.
        """
        inv_num    = str(inv.get("InvoiceNumber") or f"BULK-{idx+1:04d}")
        inv_date   = str(inv.get("InvoiceDate") or "")
        inv_amount = FieldNormaliser.normalise("InvoiceAmount", inv.get("InvoiceAmount")) or 0
        currency   = str(inv.get("InvoiceCurrency") or "AED")
        inv_type   = str(inv.get("InvoiceType") or "Standard")
        bu         = str(inv.get("BusinessUnit") or default_bu or "")
        supplier   = str(inv.get("Supplier") or "")
        site       = str(inv.get("SupplierSite") or "")
        desc       = str(inv.get("Description") or "")
        po_num     = inv.get("PurchaseOrderNumber") or None

        # PO invoice if PurchaseOrderNumber present and non-empty
        is_po = bool(po_num and str(po_num).strip())

        # ── invoiceLines ─────────────────────────────────────────────────────
        oic_lines = self._build_lines(inv, inv_amount, desc)

        # ── invoiceInstallments ──────────────────────────────────────────────
        oic_insts = self._build_installments(inv)

        # ── Core invoice object ──────────────────────────────────────────────
        obj = {
            "InvoiceNumber":       inv_num,
            "InvoiceCurrency":     currency,
            "InvoiceAmount":       inv_amount,
            "InvoiceDate":         inv_date,
            "BusinessUnit":        bu,
            "Supplier":            supplier,
            "SupplierSite":        site,
            "InvoiceType":         inv_type,
            "Description":         desc,
            "ConversionRate":      inv.get("ConversionRate") or None,
            "InvoiceReceivedDate": inv.get("InvoiceReceivedDate") or inv_date,
            "InvoiceGroup":        inv.get("InvoiceGroup") or self._date_to_group(inv_date),
            "PurchaseOrderNumber": po_num,
            "invoiceLines":        oic_lines,
        }

        # ── Optional fields ──────────────────────────────────────────────────
        if inv.get("PaymentTerms"):
            obj["PaymentTerms"] = inv["PaymentTerms"]
        if inv.get("GlDate"):
            obj["GlDate"] = inv["GlDate"]
        if inv.get("TaxControlAmount"):
            obj["TaxControlAmount"] = FieldNormaliser.normalise("TaxControlAmount", inv["TaxControlAmount"])
        if oic_insts:
            obj["invoiceInstallments"] = oic_insts
        if inv.get("ImageName") or inv.get("_pdf_file"):
            obj["ImageName"] = inv.get("ImageName") or inv.get("_pdf_file")

        return obj, is_po

    def _build_lines(self, inv: dict, inv_amount: float, desc: str) -> list:
        """
        Build invoiceLines array.
        Priority:
          1. _lines (collected from multi-row Excel)
          2. _lines_from_pdf (extracted by GPT-4o)
          3. Single fallback line from invoice header amount
        """
        raw_lines = inv.get("_lines") or inv.get("_lines_from_pdf") or []

        if raw_lines:
            return [self._build_one_line(line, i+1, inv) for i, line in enumerate(raw_lines)]

        # Fallback: single line
        tax_amt    = FieldNormaliser.normalise("TaxControlAmount", inv.get("TaxControlAmount")) or 0
        line_amt   = inv_amount - tax_amt
        dist_combo = inv.get("DistributionCombination")

        line = {
            "LineNumber":               1,
            "LineType":                 "Item",
            "LineAmount":               line_amt,
            "Description":              desc or "Invoice Line",
            "ProrateAcrossAllItemsFlag": True if not dist_combo else False,
            "PurchaseOrderLineNumber":  None,
        }
        if dist_combo:
            line["invoiceDistributions"] = [{
                "DistributionLineNumber":  1,
                "DistributionLineType":    "Item",
                "DistributionAmount":      line_amt,
                "DistributionCombination": dist_combo,
            }]
            line["ProrateAcrossAllItemsFlag"] = False
        return [line]

    def _build_one_line(self, line: dict, line_num: int, inv: dict) -> dict:
        """Convert a raw line dict → OIC line object with distributions."""
        line_amount = (
            FieldNormaliser.normalise("LineAmount", line.get("LineAmount"))
            or FieldNormaliser.normalise("LineAmount", line.get("line_amount"))
            or FieldNormaliser.normalise("LineAmount", line.get("amount"))
            or 0
        )
        line_type = (
            line.get("LineType") or line.get("line_type") or "Item"
        )
        line_desc = (
            line.get("Description") or line.get("description")
            or line.get("LineDescription") or inv.get("Description") or ""
        )
        po_line_num = line.get("PurchaseOrderLineNumber") or line.get("po_line_number")
        prorate = line.get("ProrateAcrossAllItemsFlag")
        if prorate is None:
            prorate = True  # default

        oic_line = {
            "LineNumber":               line.get("LineNumber") or line.get("line_number") or line_num,
            "LineType":                 line_type,
            "LineAmount":               line_amount,
            "Description":              line_desc,
            "ProrateAcrossAllItemsFlag": FieldNormaliser._to_bool(prorate),
            "PurchaseOrderLineNumber":  po_line_num,
        }

        # Quantity / UnitPrice (PO lines)
        if line.get("Quantity") or line.get("quantity"):
            oic_line["Quantity"]  = line.get("Quantity") or line.get("quantity")
            oic_line["UnitPrice"] = line.get("UnitPrice") or line.get("unit_price")

        # Distributions
        dists = self._build_distributions(line, line_amount, line_type, inv)
        if dists:
            oic_line["invoiceDistributions"] = dists
            oic_line["ProrateAcrossAllItemsFlag"] = False

        return oic_line

    def _build_distributions(self, line: dict, line_amount: float, line_type: str, inv: dict) -> list:
        """Build invoiceDistributions for a line."""
        # Check if line already has distributions (from PDF extraction)
        raw_dists = (
            line.get("invoiceDistributions")
            or line.get("distributions")
            or []
        )
        if raw_dists:
            result = []
            for di, d in enumerate(raw_dists, start=1):
                result.append({
                    "DistributionLineNumber":  d.get("DistributionLineNumber") or di,
                    "DistributionLineType":    d.get("DistributionLineType") or d.get("distribution_line_type") or line_type,
                    "DistributionAmount":      FieldNormaliser.normalise("DistributionAmount",
                        d.get("DistributionAmount") or d.get("distribution_amount") or line_amount),
                    "DistributionCombination": (
                        d.get("DistributionCombination")
                        or d.get("distribution_combination")
                        or line.get("_dist_combination")
                        or inv.get("DistributionCombination")
                    ),
                })
            return result

        # Build from line's _dist_ private fields (set by ExcelBulkParser)
        dist_combo = (
            line.get("_dist_combination")
            or inv.get("DistributionCombination")
        )
        if not dist_combo:
            return []  # No GL account — OIC will prorate

        dist_amount = (
            FieldNormaliser.normalise("DistributionAmount", line.get("_dist_amount"))
            or line_amount
        )
        dist_type = line.get("_dist_type") or line_type

        return [{
            "DistributionLineNumber":  1,
            "DistributionLineType":    dist_type,
            "DistributionAmount":      dist_amount,
            "DistributionCombination": dist_combo,
        }]

    def _build_installments(self, inv: dict) -> list:
        """Build invoiceInstallments array from any available source."""
        raw = (
            inv.get("_installments")
            or inv.get("_installments_from_pdf")
            or []
        )
        if not raw:
            return []

        result = []
        for i, inst in enumerate(raw, start=1):
            result.append({
                "InstallmentNumber": (
                    inst.get("InstallmentNumber")
                    or inst.get("installment_number")
                    or i
                ),
                "DueDate": (
                    FieldNormaliser.normalise("DueDate", inst.get("DueDate"))
                    or FieldNormaliser.normalise("DueDate", inst.get("due_date"))
                ),
                "GrossAmount": (
                    FieldNormaliser.normalise("GrossAmount", inst.get("GrossAmount"))
                    or FieldNormaliser.normalise("GrossAmount", inst.get("gross_amount"))
                    or 0
                ),
            })
        return result

    @staticmethod
    def _date_to_group(date_str: str) -> str:
        """Convert YYYY-MM-DD → DDMmmYYYY (OIC InvoiceGroup format)."""
        try:
            d = datetime.strptime(date_str, "%Y-%m-%d")
            return d.strftime("%d%b%Y")
        except Exception:
            return date_str


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ENTRY POINT
# Called by server.py /upload/bulk endpoint
# ─────────────────────────────────────────────────────────────────────────────

async def process_bulk(
    excel_bytes:   bytes,
    excel_name:    str,
    pdf_uploads:   list,           # list of (filename, bytes, extension)
    user_id:       int,
    tenant_id:     str,
    default_bu:    str,
    session_id:    str,
) -> dict:
    """
    Full pipeline:
      1. Parse Excel
      2. Extract all PDFs (concurrent)
      3. Match PDF → Excel row
      4. Merge fields (Excel priority, PDF fills blanks)
      5. Group multi-line rows by InvoiceNumber
      6. Build OIC payload array
      7. POST to OIC — PO invoices and Non-PO invoices sent to separate endpoints
      8. Map response → per-row results

    Returns:
      {
        total, success, failed, skipped, pdfs_processed,
        rows: [{row, invoice_number, supplier, amount, bu, status, oracle_id, error, pdf_file}],
        oic_payload_sent: [...],
        unmapped_columns: [...]
      }
    """
    import asyncio as _asyncio
    from .invoice_service import _oic_post

    # ── Step 1: Parse Excel ──────────────────────────────────────────────────
    parser = ExcelBulkParser()
    parsed = parser.parse(excel_bytes, excel_name)
    rows   = parsed["rows"]

    if not rows:
        return {"error": "No rows found in Excel file", "rows": []}

    # ── Step 2: Extract PDFs concurrently ────────────────────────────────────
    extractor = PDFBulkExtractor()

    async def _extract_one(fname: str, fbytes: bytes, fext: str) -> dict:
        try:
            result = await _asyncio.to_thread(extractor.extract, fbytes, fext, fname)
            return result
        except Exception as e:
            return {"_filename": fname, "_error": str(e)}

    pdf_results = await _asyncio.gather(*[
        _extract_one(fname, fbytes, fext) for fname, fbytes, fext in pdf_uploads
    ]) if pdf_uploads else []

    # ── Step 3: Match PDF → row ───────────────────────────────────────────────
    # Primary: InvoiceNumber match; Fallback: row order
    pdf_by_invnum = {}
    for pdf in pdf_results:
        key = str(pdf.get("InvoiceNumber") or "").strip().upper()
        if key:
            pdf_by_invnum[key] = pdf

    for i, row in enumerate(rows):
        row_key = str(row.get("InvoiceNumber") or "").strip().upper()
        matched_pdf = (
            pdf_by_invnum.get(row_key)
            or (pdf_results[i] if i < len(pdf_results) else None)
        )
        if matched_pdf and not matched_pdf.get("_error"):
            row = merge_pdf_into_row(row, matched_pdf)
            rows[i] = row
        else:
            rows[i]["_pdf_file"]   = None
            rows[i]["_pdf_matched"] = False

        # Apply default BU
        if not rows[i].get("BusinessUnit") and default_bu:
            rows[i]["BusinessUnit"] = default_bu

    # ── Step 4: Group multi-line rows ────────────────────────────────────────
    invoices = group_invoice_lines(rows)

    # ── Step 5: Build OIC payload ─────────────────────────────────────────────
    builder     = OICPayloadBuilder()
    oic_payload = []
    valid_inv   = []

    for idx, inv in enumerate(invoices):
        try:
            oic_obj, is_po = builder.build_invoice(inv, idx, default_bu)
            oic_payload.append(oic_obj)
            valid_inv.append((idx, inv, is_po))
        except Exception as e:
            valid_inv.append((idx, inv, False))
            oic_payload.append({"_build_error": str(e), "_idx": idx})

    _log.warning(
        f"[bulk] Sending {len(oic_payload)} invoices to OIC:\n"
        f"{json.dumps(oic_payload, indent=2, default=str)}"
    )

    # ── Step 6: POST to OIC ──────────────────────────────────────────────────
    # Filter out any payload objects that failed to build
    clean_payload = [o for o in oic_payload if "_build_error" not in o]
    build_failed  = [o for o in oic_payload if "_build_error" in o]

    result_rows = []

    # Pre-add build failures
    for o in build_failed:
        idx = o["_idx"]
        inv = invoices[idx] if idx < len(invoices) else {}
        result_rows.append({
            "row":            inv.get("_source_row", idx + 2),
            "invoice_number": inv.get("InvoiceNumber"),
            "supplier":       inv.get("Supplier"),
            "amount":         inv.get("InvoiceAmount"),
            "currency":       inv.get("InvoiceCurrency", "AED"),
            "bu":             inv.get("BusinessUnit") or default_bu,
            "pdf_file":       inv.get("_pdf_file"),
            "status":         "FAILED",
            "oracle_id":      None,
            "error":          o["_build_error"],
        })

    # ── Split invoices into PO and Non-PO batches ────────────────────────────
    # Each list holds tuples of (oic_obj, inv, is_po) for invoices that built ok
    po_payload     = []
    non_po_payload = []

    for obj in clean_payload:
        po = obj.get("PurchaseOrderNumber")
        if po and str(po).strip():
            po_payload.append(obj)
        else:
            non_po_payload.append(obj)

    _log.warning(
        f"[bulk] Routing: {len(po_payload)} PO invoices, "
        f"{len(non_po_payload)} Non-PO invoices"
    )

    # Collect all OIC responses in a flat list aligned to clean_payload order.
    # We preserve order: PO responses first, then Non-PO, matching how we split.
    oic_response_list = []

    try:
        # POST PO invoices
        if po_payload:
            _log.warning(f"[bulk] Sending {len(po_payload)} PO invoices to OIC")
            resp = await _asyncio.to_thread(
                _oic_post, user_id, po_payload, tenant_id
            )
            if isinstance(resp, list):
                oic_response_list.extend(resp)
            else:
                oic_response_list.append(resp)

        # POST Non-PO invoices
        if non_po_payload:
            _log.warning(f"[bulk] Sending {len(non_po_payload)} Non-PO invoices to OIC")
            resp = await _asyncio.to_thread(
                _oic_post, user_id, non_po_payload, tenant_id
            )
            if isinstance(resp, list):
                oic_response_list.extend(resp)
            else:
                oic_response_list.append(resp)

    except Exception as e:
        _log.error(f"[bulk] OIC call failed: {e}")
        # Mark all remaining clean invoices as failed
        for idx, inv, is_po in valid_inv:
            if "_build_error" not in oic_payload[idx]:
                result_rows.append({
                    "row":            inv.get("_source_row", idx + 2),
                    "invoice_number": inv.get("InvoiceNumber"),
                    "supplier":       inv.get("Supplier"),
                    "amount":         inv.get("InvoiceAmount"),
                    "currency":       inv.get("InvoiceCurrency", "AED"),
                    "bu":             inv.get("BusinessUnit") or default_bu,
                    "pdf_file":       inv.get("_pdf_file"),
                    "is_po":          is_po,
                    "status":         "FAILED",
                    "oracle_id":      None,
                    "error":          str(e),
                })
        oic_response_list = []

    # ── Step 7: Map OIC response → per-row results ───────────────────────────
    # oic_response_list is aligned to: PO invoices first, then Non-PO invoices.
    # Map by positional index — Oracle returns generated invoice numbers that
    # don't match our input numbers, so index mapping is the only safe approach.
    ordered_clean = po_payload + non_po_payload  # same order as oic_response_list

    resp_by_index: dict[int, dict] = {}
    for i, obj in enumerate(ordered_clean):
        resp_by_index[i] = oic_response_list[i] if i < len(oic_response_list) else {}

    # Build a reverse lookup: InvoiceNumber → position in ordered_clean
    invnum_to_clean_idx: dict[str, int] = {}
    for i, obj in enumerate(ordered_clean):
        key = str(obj.get("InvoiceNumber") or "").strip().upper()
        if key:
            invnum_to_clean_idx[key] = i

    if oic_response_list or resp_by_index:
        for idx, inv, is_po in valid_inv:
            if "_build_error" in oic_payload[idx]:
                continue  # already recorded in build failures

            inv_key    = str(inv.get("InvoiceNumber") or "").strip().upper()
            clean_idx  = invnum_to_clean_idx.get(inv_key)
            resp       = resp_by_index.get(clean_idx, {}) if clean_idx is not None else {}

            oracle_id = (
                resp.get("InvoiceId") or resp.get("invoiceId")
                or resp.get("InvoiceNumber") or resp.get("invoiceNumber")
            )
            raw_txt   = resp.get("raw_response") or resp.get("_raw", "")
            row_error = _extract_oic_error(resp)

            oic_status_msg = str(resp.get("Status") or resp.get("status") or "")

            if row_error:
                status    = "FAILED"
                oracle_id = None
            else:
                status = "SUCCESS"
                if not oracle_id and raw_txt:
                    m = re.search(r"[A-Z0-9_\-]{4,}", raw_txt)
                    oracle_id = m.group(0) if m else inv.get("InvoiceNumber")
                if not oracle_id:
                    oracle_id = inv.get("InvoiceNumber")

            # GL account from first distribution
            gl_account = None
            oic_lines  = oic_payload[idx].get("invoiceLines") or []
            if oic_lines:
                dists = oic_lines[0].get("invoiceDistributions") or []
                if dists:
                    gl_account = dists[0].get("DistributionCombination")
            if not gl_account:
                gl_account = inv.get("DistributionCombination")

            result_rows.append({
                "row":            inv.get("_source_row", idx + 2),
                "invoice_number": inv.get("InvoiceNumber"),
                "invoice_date":   inv.get("InvoiceDate"),
                "supplier":       inv.get("Supplier"),
                "supplier_site":  inv.get("SupplierSite"),
                "amount":         inv.get("InvoiceAmount"),
                "currency":       inv.get("InvoiceCurrency", "AED"),
                "bu":             inv.get("BusinessUnit") or default_bu,
                "payment_terms":  inv.get("PaymentTerms"),
                "gl_account":     gl_account,
                "pdf_file":       inv.get("_pdf_file"),
                "is_po":          is_po,
                "status":         status,
                "oracle_id":      oracle_id,
                "oracle_status":  oic_status_msg if status == "SUCCESS" else None,
                "error":          row_error,
                "oic_payload":    oic_payload[idx],
            })

    # Sort by row number
    result_rows.sort(key=lambda r: r.get("row", 9999))

    success = sum(1 for r in result_rows if r["status"] == "SUCCESS")
    failed  = sum(1 for r in result_rows if r["status"] == "FAILED")

    return {
        "total":            len(result_rows),
        "success":          success,
        "failed":           failed,
        "skipped":          0,
        "pdfs_processed":   len([p for p in pdf_results if not p.get("_error")]),
        "rows":             result_rows,
        "oic_payload_sent": clean_payload,
        "unmapped_columns": parsed.get("unmapped_columns", []),
    }


def _extract_oic_error(resp: dict) -> Optional[str]:
    """
    Pull any error message from an OIC response object.

    Handles OIC's actual error format:
      {"Status": "Failed - <![CDATA[You must provide a different number...]]>", "invoiceNumber": ...}
    Also handles:
      {"Status": "Invoice Created Successfully", ...}  → not an error
    """
    if not resp:
        return None

    # Standard error fields
    err = (
        resp.get("errorMessage")
        or resp.get("FaultMessage")
        or resp.get("faultMessage")
        or resp.get("error")
    )
    if err:
        return str(err)

    # OIC's own Status field — check for "Failed" prefix (case-insensitive)
    raw_status = str(resp.get("Status") or resp.get("status") or "")
    if raw_status.lower().startswith("failed"):
        # Strip "Failed - " prefix and clean up CDATA wrapper if present
        msg = raw_status
        # Remove leading "Failed - " or "Failed -"
        msg = re.sub(r'^[Ff]ailed\s*-\s*', '', msg).strip()
        # Strip CDATA wrapper: <![CDATA[...]]>
        cdata = re.search(r'<!\[CDATA\[(.*?)(?:\]\]>|$)', msg, re.DOTALL)
        if cdata:
            msg = cdata.group(1).strip()
        # Extract just the first sentence / Oracle error code for brevity
        short = msg.split('\n')[0].strip()
        if len(short) > 200:
            short = short[:200].rsplit('.', 1)[0] + '.'
        return short if short else "OIC creation failed"

    # Generic status check
    if raw_status.upper() in ("ERROR", "FAULT"):
        return resp.get("message") or resp.get("detail") or "OIC returned error status"

    return None