"""
oracle/extractor.py

Document extraction pipeline.
PDF/Image → GPT-4o Vision → structured invoice JSON with confidence scores.
Excel → intelligent column mapping → structured rows.
"""

from __future__ import annotations
import base64
import json
import os
import re
from datetime import datetime
from typing import Optional
import httpx


EXTRACTION_PROMPT = """
You are an expert invoice data extraction system for Oracle Fusion AP.
Analyze this invoice and extract every field.
Return ONLY a valid JSON object — no markdown, no explanation, just JSON.

{
  "supplier_name": "exact company name as printed",
  "supplier_tax_number": "TRN or VAT number or null",
  "invoice_number": "invoice reference number",
  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD or null",
  "po_number": "PO number if present, null if not",
  "currency": "3-letter ISO (AED, USD, etc.)",
  "subtotal": number,
  "tax_rate": number (percentage, e.g. 5),
  "tax_amount": number,
  "total_amount": number,
  "payment_terms": "e.g. Net 30 or null",
  "lines": [
    {
      "line_number": integer,
      "description": "item description",
      "quantity": number or null,
      "unit_price": number or null,
      "amount": number,
      "tax_amount": number or null
    }
  ],
  "confidence": {
    "supplier_name": 0.0-1.0,
    "invoice_number": 0.0-1.0,
    "invoice_date": 0.0-1.0,
    "total_amount": 0.0-1.0,
    "po_number": 0.0-1.0,
    "tax_amount": 0.0-1.0,
    "lines": 0.0-1.0
  },
  "extraction_notes": "any issues or ambiguities"
}

Rules:
- Dates must be YYYY-MM-DD
- Amounts must be plain numbers (no symbols, no commas)
- If total does not match subtotal+tax, note it in extraction_notes
- For Arabic/English mixed invoices, prefer English values
- confidence 1.0=clear, 0.5=estimated, 0.0=guessed
- GL account combinations are NOT extracted from invoices — user must provide them
- If PO number appears anywhere on document, capture it
"""


class DocumentExtractor:

    def __init__(self):
        self.api_key    = os.getenv("OPENAI_API_KEY", "")
        self.vision_url = "https://api.openai.com/v1/chat/completions"

    def extract_from_file(self, file_bytes: bytes, file_type: str) -> dict:
        file_b64 = base64.b64encode(file_bytes).decode()
        if file_type == "pdf":
            return self._extract_pdf(file_b64)
        mime = f"image/{'jpeg' if file_type in ('jpg', 'jpeg') else file_type}"
        return self._extract_vision(file_b64, mime)

    def _extract_pdf(self, file_b64: str) -> dict:
        try:
            text = self._pdf_to_text(file_b64)
            if text and len(text.strip()) > 100:
                result = self._extract_from_text(text)
                result["extraction_method"] = "text"
                return result
        except Exception:
            pass
        result = self._extract_vision(file_b64, "application/pdf")
        result["extraction_method"] = "vision"
        return result

    def _pdf_to_text(self, file_b64: str) -> str:
        import io
        from pypdf import PdfReader
        pdf_bytes = base64.b64decode(file_b64)
        reader    = PdfReader(io.BytesIO(pdf_bytes))
        return "".join(p.extract_text() or "" for p in reader.pages)

    def _extract_from_text(self, text: str) -> dict:
        prompt = f"{EXTRACTION_PROMPT}\n\nInvoice text:\n\n{text[:8000]}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type":  "application/json",
        }
        payload = {
            "model":       "gpt-4o",
            "messages":    [{"role": "user", "content": prompt}],
            "max_tokens":  2000,
            "temperature": 0.1,
        }
        r = httpx.post(self.vision_url, json=payload, headers=headers, timeout=60)
        r.raise_for_status()
        return self._parse(r.json()["choices"][0]["message"]["content"])

    def _extract_vision(self, file_b64: str, mime: str) -> dict:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type":  "application/json",
        }
        payload = {
            "model": "gpt-4o",
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": EXTRACTION_PROMPT},
                    {"type": "image_url", "image_url": {
                        "url":    f"data:{mime};base64,{file_b64}",
                        "detail": "high",
                    }},
                ],
            }],
            "max_tokens":  2000,
            "temperature": 0.1,
        }
        r = httpx.post(self.vision_url, json=payload, headers=headers, timeout=90)
        r.raise_for_status()
        return self._parse(r.json()["choices"][0]["message"]["content"])

    def _parse(self, raw: str) -> dict:
        cleaned = re.sub(r'^```json\s*|^```\s*|\s*```$', '', raw.strip())
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r'\{[\s\S]+\}', cleaned)
            if match:
                try:
                    data = json.loads(match.group())
                except Exception:
                    return self._empty("JSON parse failed")
            else:
                return self._empty("No JSON found")

        # Validate amounts
        subtotal = data.get("subtotal") or 0
        tax      = data.get("tax_amount") or 0
        total    = data.get("total_amount") or 0
        if subtotal and tax and total:
            expected = round(subtotal + tax, 2)
            if abs(expected - total) > 0.10:
                note = (
                    f"Amount variance: {subtotal} + {tax} = {expected} "
                    f"but total is {total}"
                )
                data["extraction_notes"] = (
                    f"{data.get('extraction_notes', '')} | {note}".strip(" |")
                )
                data["has_variance"] = True
            else:
                data["has_variance"] = False
        return data

    def _empty(self, reason: str) -> dict:
        return {
            "supplier_name": None, "invoice_number": None,
            "invoice_date": None, "total_amount": None,
            "po_number": None, "currency": "AED",
            "lines": [], "confidence": {},
            "extraction_notes": reason,
            "extraction_method": "failed",
            "has_variance": False,
        }


# ─────────────────────────────────────────────────────────────────────────────
# EXCEL BULK PARSER
# ─────────────────────────────────────────────────────────────────────────────

COLUMN_ALIASES = {
    "supplier_name":  ["supplier", "vendor", "supplier name", "vendor name",
                       "company", "supplier_name"],
    "invoice_number": ["invoice number", "invoice no", "invoice #", "inv no",
                       "inv number", "invoice_number", "bill number"],
    "invoice_date":   ["invoice date", "date", "inv date", "bill date",
                       "invoice_date"],
    "invoice_amount": ["amount", "total", "invoice amount", "total amount",
                       "grand total", "invoice_amount"],
    "currency":       ["currency", "curr", "ccy"],
    "po_number":      ["po number", "po no", "po #", "purchase order",
                       "po_number"],
    "description":    ["description", "desc", "narration", "particulars"],
    "tax_amount":     ["tax", "vat", "tax amount", "vat amount", "tax_amount"],
    "payment_terms":  ["payment terms", "terms", "pay terms"],
    "business_unit":  ["business unit", "bu", "legal entity", "business_unit"],
    "supplier_site":  ["site", "supplier site", "vendor site", "supplier_site"],
    "gl_account":     ["account", "gl account", "account code", "gl_account",
                       "distribution combination", "gl combination",
                       "distribution_combination"],
    "invoice_type":   ["invoice type", "type", "doc type", "invoice_type"],
}


class ExcelParser:

    def parse(self, file_bytes: bytes, file_name: str) -> dict:
        import io
        if file_name.lower().endswith(".csv"):
            rows, raw_headers = self._parse_csv(file_bytes)
        else:
            rows, raw_headers = self._parse_excel(file_bytes)

        col_map, unmapped = self._map_columns(raw_headers)
        mapped_rows = []
        errors      = []

        for i, row in enumerate(rows, start=2):
            try:
                mapped               = self._map_row(row, col_map)
                mapped["source_row"] = i
                row_errors           = self._validate_row(mapped, i)
                mapped["row_errors"] = row_errors
                mapped["row_valid"]  = len(row_errors) == 0
                mapped_rows.append(mapped)
            except Exception as e:
                errors.append({"row": i, "error": str(e)})

        return {
            "status":           "OK",
            "total":            len(mapped_rows),
            "valid_rows":       sum(1 for r in mapped_rows if r["row_valid"]),
            "invalid_rows":     sum(1 for r in mapped_rows if not r["row_valid"]),
            "rows":             mapped_rows,
            "unmapped_columns": unmapped,
            "parse_errors":     errors,
        }

    def _parse_excel(self, file_bytes: bytes):
        import openpyxl, io
        wb      = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
        ws      = wb.active
        all_rows = list(ws.iter_rows(values_only=True))
        if not all_rows:
            return [], []
        headers = [str(h).strip().lower() if h else "" for h in all_rows[0]]
        rows    = [
            dict(zip(headers, row))
            for row in all_rows[1:]
            if any(v is not None for v in row)
        ]
        return rows, headers

    def _parse_csv(self, file_bytes: bytes):
        import csv, io
        text    = file_bytes.decode("utf-8-sig", errors="replace")
        reader  = csv.DictReader(io.StringIO(text))
        headers = [h.strip().lower() for h in (reader.fieldnames or [])]
        rows    = [{k.strip().lower(): v for k, v in row.items()} for row in reader]
        return rows, headers

    def _map_columns(self, raw_headers: list) -> tuple:
        col_map  = {}
        unmapped = []
        for raw in raw_headers:
            raw_lower = raw.lower().strip()
            found     = False
            for field, aliases in COLUMN_ALIASES.items():
                if raw_lower in aliases or raw_lower == field:
                    col_map[raw_lower] = field
                    found = True
                    break
            if not found and raw_lower:
                unmapped.append(raw)
        return col_map, unmapped

    def _map_row(self, row: dict, col_map: dict) -> dict:
        mapped = {field: None for field in COLUMN_ALIASES}
        for raw_col, value in row.items():
            standard = col_map.get(raw_col.lower().strip())
            if standard:
                mapped[standard] = self._clean_value(standard, value)
        mapped["currency"] = mapped.get("currency") or "AED"
        return mapped

    def _clean_value(self, field: str, value) -> any:
        if value is None:
            return None
        if field in {"invoice_amount", "tax_amount"}:
            if isinstance(value, (int, float)):
                return float(value)
            cleaned = re.sub(r"[^\d.]", "", str(value))
            return float(cleaned) if cleaned else None
        if field == "invoice_date":
            return self._parse_date(value)
        return str(value).strip() if value else None

    def _parse_date(self, value) -> Optional[str]:
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d")
        s = str(value).strip()
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y",
                    "%d-%m-%Y", "%d %b %Y", "%d %B %Y"):
            try:
                return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return s

    def _validate_row(self, row: dict, row_num: int) -> list:
        errors   = []
        required = ["supplier_name", "invoice_number", "invoice_date", "invoice_amount"]
        for f in required:
            if not row.get(f):
                errors.append(f"Row {row_num}: missing {f}")
        if row.get("invoice_amount") and row["invoice_amount"] <= 0:
            errors.append(f"Row {row_num}: invoice_amount must be positive")
        return errors