"""
engine/parallel_validator.py

Validates BU + Supplier + Site + PO in a SINGLE parallel pass.
No sequential routing. One call, full validation result.
"""

from __future__ import annotations
import json
import os
import re
from typing import Optional
import httpx
import redis as redis_lib

_redis = redis_lib.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0, decode_responses=True,
)
BU_CACHE_TTL = 3600


def _normalize(s: str) -> str:
    return re.sub(r"\s+", " ", str(s).lower()).strip()


def _is_match(name: str, query: str) -> bool:
    n = _normalize(name)
    q = _normalize(query)
    if not n or not q:
        return False
    # FIX: bidirectional containment — lets "mawarid holding" match
    # "Mawarid Holding Investment LLC" and vice versa.
    if q in n or n in q:
        return True
    nw = n.split()
    qw = q.split()
    return all(any(nword.startswith(qword) for nword in nw) for qword in qw)


def _get_config(user_id: int) -> dict:
    key = f"user:{user_id}:oracle:ERP"
    raw = _redis.get(key)
    if not raw:
        raise ValueError(f"Oracle credentials not found for user {user_id}. "
                         "Set them in Redis under key: user:{user_id}:oracle:ERP")
    return json.loads(raw)


def _oracle_get(user_id: int, endpoint: str, params: dict = None) -> dict:
    cfg  = _get_config(user_id)
    base = cfg["baseUrl"].rstrip("/")
    url  = f"{base}/fscmRestApi/resources/11.13.18.05{endpoint}"
    r = httpx.get(
        url, params=params or {},
        auth=(cfg["username"], cfg["password"]),
        headers={"Accept": "application/json"},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


# ── BU ────────────────────────────────────────────────────────────────────────

def _load_business_units(user_id: int) -> list:
    cache_key = f"oracle:businessUnits:{user_id}"
    cached    = _redis.get(cache_key)
    if cached:
        return json.loads(cached)

    res       = _oracle_get(user_id, "/suppliers", {"expand": "sites", "onlyData": True, "limit": 500})
    suppliers = res.get("items", [])
    bu_map: dict = {}
    for sup in suppliers:
        for site in sup.get("sites", []):
            bid   = site.get("ProcurementBUId")
            bname = site.get("ProcurementBU")
            if bid and bname:
                bu_map[int(bid)] = bname

    mapped = [{"id": bid, "name": bname} for bid, bname in bu_map.items()]
    _redis.setex(cache_key, BU_CACHE_TTL, json.dumps(mapped))
    return mapped


def _validate_bu(user_id: int, bu_name: str) -> dict:
    units   = _load_business_units(user_id)
    matches = [u for u in units if _is_match(u["name"], bu_name)]
    if not matches:
        return {"status": "NONE"}
    if len(matches) == 1:
        return {"status": "SINGLE", "businessUnit": matches[0]}
    return {"status": "MULTIPLE", "options": matches}


# ── Supplier ──────────────────────────────────────────────────────────────────

def _find_supplier(user_id: int, bu_id: int, supplier_name: str) -> dict:
    res       = _oracle_get(user_id, "/suppliers", {"expand": "sites", "onlyData": True, "limit": 500})
    suppliers = res.get("items", [])
    matched   = []
    for sup in suppliers:
        sites = sup.get("sites", [])
        in_bu = any(
            str(s.get("ProcurementBUId")) == str(bu_id)
            and s.get("Status") == "ACTIVE"
            and s.get("SitePurposePayFlag") is True
            for s in sites
        )
        if in_bu and _is_match(sup.get("Supplier", ""), supplier_name):
            matched.append({"id": sup["SupplierId"], "name": sup["Supplier"]})

    if not matched:
        return {"status": "NOT_FOUND"}
    if len(matched) == 1:
        return {"status": "SINGLE", "supplier": matched[0]}
    return {"status": "MULTIPLE", "options": matched}


# ── Site ──────────────────────────────────────────────────────────────────────

def _validate_site(user_id: int, supplier_id: int, bu_id: int) -> dict:
    res       = _oracle_get(user_id, f"/suppliers/{supplier_id}/child/sites",
                            {"expand": "assignments", "onlyData": True})
    all_sites = res.get("items", [])
    valid = [
        s for s in all_sites
        if s.get("Status") == "ACTIVE"
        and s.get("SitePurposePayFlag") is True
        and any(
            str(a.get("BillToBUId")) == str(bu_id) and a.get("Status") == "ACTIVE"
            for a in s.get("assignments", [])
        )
    ]
    if not valid:
        return {"status": "NONE"}
    sites = [{"id": s["SupplierSiteId"], "name": s["SupplierSite"]} for s in valid]
    if len(sites) == 1:
        return {"status": "SINGLE", "site": sites[0]}
    return {"status": "SUCCESS", "sites": sites}


# ── PO ────────────────────────────────────────────────────────────────────────

def _validate_po(user_id: int, po_number: str) -> dict:
    try:
        res   = _oracle_get(user_id, "/purchaseOrders", {
            "q":      f"PONumber={po_number}",
            "fields": "POHeaderId,PONumber,SupplierId,OrderAmount,BilledAmount,Currency,Status",
            "limit":  5,
        })
        items = res.get("items", [])
        if not items:
            return {"status": "NOT_FOUND"}
        po = items[0]
        if po.get("Status") not in ("OPEN", "APPROVED"):
            return {"status": "CLOSED", "poStatus": po.get("Status")}
        order_amount  = float(po.get("OrderAmount") or 0)
        billed_amount = float(po.get("BilledAmount") or 0)
        return {
            "status":          "OPEN",
            "poHeaderId":      po["POHeaderId"],
            "poNumber":        po["PONumber"],
            "orderAmount":     order_amount,
            "billedAmount":    billed_amount,
            "remainingAmount": round(order_amount - billed_amount, 2),
            "currency":        po.get("Currency", "AED"),
        }
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}


# ── PUBLIC: Full Parallel Validation ─────────────────────────────────────────

def run_parallel_validation(
    user_id:        int,
    bu_name:        Optional[str] = None,
    supplier_name:  Optional[str] = None,
    po_number:      Optional[str] = None,
    bu_id:          Optional[int] = None,
    supplier_id:    Optional[int] = None,
    bu_validated:   bool          = False,
    sup_validated:  bool          = False,
    site_validated: bool          = False,
) -> dict:
    """
    Validates BU + Supplier + Site + PO in one shot.
    Returns full result dict with resolved IDs + errors + warnings.
    """
    result = {
        "bu": None, "supplier": None, "site": None, "po": None,
        "errors": [], "warnings": [], "resolved": {},
    }
    resolved_bu_id       = bu_id
    resolved_supplier_id = supplier_id

    # BU
    if bu_name and not bu_validated:
        try:
            bu_res      = _validate_bu(user_id, bu_name)
            result["bu"] = bu_res
            if bu_res["status"] == "SINGLE":
                resolved_bu_id = bu_res["businessUnit"]["id"]
                result["resolved"]["bu_id"]   = resolved_bu_id
                result["resolved"]["bu_name"] = bu_res["businessUnit"]["name"]
            elif bu_res["status"] == "MULTIPLE":
                names = [o["name"] for o in bu_res["options"]]
                result["warnings"].append(f"Multiple BUs match '{bu_name}': {names}. Which one?")
            elif bu_res["status"] == "NONE":
                result["errors"].append(
                    f"Business unit '{bu_name}' not found in Oracle. Check the name.")
        except Exception as e:
            result["errors"].append(f"BU validation error: {e}")
    elif bu_validated and bu_id:
        resolved_bu_id = bu_id

    # Supplier
    if supplier_name and resolved_bu_id and not sup_validated:
        try:
            sup_res = _find_supplier(user_id, resolved_bu_id, supplier_name)
            result["supplier"] = sup_res
            if sup_res["status"] == "SINGLE":
                resolved_supplier_id = sup_res["supplier"]["id"]
                result["resolved"]["supplier_id"]   = resolved_supplier_id
                result["resolved"]["supplier_name"] = sup_res["supplier"]["name"]
            elif sup_res["status"] == "MULTIPLE":
                names = [o["name"] for o in sup_res["options"]]
                result["warnings"].append(f"Multiple suppliers match '{supplier_name}': {names}. Which one?")
            elif sup_res["status"] == "NOT_FOUND":
                result["errors"].append(
                    f"Supplier '{supplier_name}' not found in '{bu_name}'. Check spelling.")
        except Exception as e:
            result["errors"].append(f"Supplier validation error: {e}")
    elif sup_validated and supplier_id:
        resolved_supplier_id = supplier_id

    # Site
    if resolved_supplier_id and resolved_bu_id and not site_validated:
        try:
            site_res = _validate_site(user_id, resolved_supplier_id, resolved_bu_id)
            result["site"] = site_res
            if site_res["status"] == "SINGLE":
                site = site_res["site"]
                result["resolved"]["site_id"]   = site["id"]
                result["resolved"]["site_name"] = site["name"]
            elif site_res["status"] == "SUCCESS":
                names = [s["name"] for s in site_res["sites"]]
                result["warnings"].append(f"Multiple sites available: {names}. Which site?")
            elif site_res["status"] == "NONE":
                result["errors"].append(
                    f"No active pay site for '{supplier_name}' in '{bu_name}'. "
                    "May need Oracle configuration.")
        except Exception as e:
            result["errors"].append(f"Site validation error: {e}")

    # PO
    if po_number and resolved_bu_id:
        try:
            po_res = _validate_po(user_id, po_number)
            result["po"] = po_res
            if po_res["status"] == "OPEN":
                result["resolved"]["po_header_id"]  = po_res["poHeaderId"]
                result["resolved"]["po_remaining"]   = po_res["remainingAmount"]
            elif po_res["status"] == "NOT_FOUND":
                result["errors"].append(f"PO '{po_number}' not found in Oracle.")
            elif po_res["status"] == "CLOSED":
                result["errors"].append(f"PO '{po_number}' is closed ({po_res['poStatus']}).")
        except Exception as e:
            result["errors"].append(f"PO validation error: {e}")

    return result


# ── Standalone helpers used by tools.py ──────────────────────────────────────

def validate_business_unit(user_id: int, bu_name: str) -> dict:
    return _validate_bu(user_id, bu_name)

def find_supplier_by_name(user_id: int, bu_id: int, supplier_name: str) -> dict:
    return _find_supplier(user_id, bu_id, supplier_name)

def validate_supplier_site(user_id: int, supplier_id: int, bu_id: int) -> dict:
    return _validate_site(user_id, supplier_id, bu_id)

def get_all_business_units(user_id: int) -> dict:
    try:
        units = _load_business_units(user_id)
        return {"status": "ALL", "options": units}
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}