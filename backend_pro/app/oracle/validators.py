"""
oracle/validators.py

Python equivalents of your JS validation modules:
  - validateBusinessUnit   (from businessUnit.js)
  - getSuppliersByBusinessUnit (from suppliersByBU.js)
  - validateSupplierSite   (from supplierSite.js)

These call the Oracle REST API using the user's credentials stored in Redis.
All matching logic mirrors your JS implementation exactly.
"""

from __future__ import annotations

import json
import re
import os
from typing import Optional
import httpx
import redis as redis_lib

_redis = redis_lib.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0,
    decode_responses=True,
)

BU_CACHE_TTL = 3600  # 1 hour


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _normalize(s: str) -> str:
    return re.sub(r"\s+", " ", str(s).lower()).strip()


def _is_match(name: str, query: str) -> bool:
    """
    ERP-style smart matching:
      - Case insensitive
      - Direct contains
      - Word-start matching
    Mirrors the JS isMatch() function exactly.
    """
    n = _normalize(name)
    q = _normalize(query)
    if not n or not q:
        return False
    if q in n:
        return True
    name_words  = n.split()
    query_words = q.split()
    return all(
        any(nw.startswith(qw) for nw in name_words)
        for qw in query_words
    )


def _get_oracle_config(user_id: int, product: str = "ERP") -> dict:
    """Load Oracle credentials from Redis (same key format as oracle.client.js)."""
    key = f"user:{user_id}:oracle:{product}"
    raw = _redis.get(key)
    if not raw:
        raise ValueError(f"Oracle {product} config not found for user {user_id}")
    config = json.loads(raw)
    if not all(k in config for k in ("username", "password", "baseUrl")):
        raise ValueError(f"Incomplete Oracle config for user {user_id}")
    return config


def _oracle_get(user_id: int, endpoint: str, params: dict = None) -> dict:
    """Raw Oracle REST GET with Basic Auth."""
    cfg     = _get_oracle_config(user_id)
    base    = cfg["baseUrl"].rstrip("/")
    api     = "/fscmRestApi/resources/11.13.18.05"
    url     = f"{base}{api}{endpoint}"
    auth    = (cfg["username"], cfg["password"])
    headers = {"Accept": "application/json"}

    r = httpx.get(url, params=params or {}, auth=auth,
                  headers=headers, timeout=30)
    r.raise_for_status()
    return r.json()


# ─────────────────────────────────────────────────────────────────────────────
# Business Unit Validation
# Mirrors validateBusinessUnit() from businessUnit.js
# ─────────────────────────────────────────────────────────────────────────────

def _load_business_units(user_id: int) -> list[dict]:
    """
    Load Procurement BUs from Oracle supplier sites (source of truth).
    Cached in Redis for 1 hour per user — same strategy as your JS version.
    """
    cache_key = f"oracle:businessUnits:{user_id}"
    cached    = _redis.get(cache_key)
    if cached:
        return json.loads(cached)

    res       = _oracle_get(user_id, "/suppliers", {
        "expand": "sites",
        "onlyData": True,
        "limit": 500,
    })
    suppliers = res.get("items", [])
    bu_map: dict[int, str] = {}

    for supplier in suppliers:
        for site in supplier.get("sites", []):
            bu_id   = site.get("ProcurementBUId")
            bu_name = site.get("ProcurementBU")
            if bu_id and bu_name:
                bu_map[int(bu_id)] = bu_name

    mapped = [{"id": bid, "name": bname} for bid, bname in bu_map.items()]
    _redis.setex(cache_key, BU_CACHE_TTL, json.dumps(mapped))
    return mapped


def validate_business_unit(user_id: int, business_unit_name: str) -> dict:
    """
    Validate a business unit name against Oracle Procurement BUs.

    Returns:
      { "status": "NONE" }
      { "status": "SINGLE",   "businessUnit": { "id": int, "name": str } }
      { "status": "MULTIPLE", "options":       [{ "id": int, "name": str }] }
      { "status": "ERROR",    "message": str }
    """
    if not user_id or not business_unit_name:
        return {"status": "NONE"}

    try:
        units   = _load_business_units(user_id)
        matches = [u for u in units if _is_match(u["name"], business_unit_name)]

        if not matches:
            return {"status": "NONE"}
        if len(matches) == 1:
            return {"status": "SINGLE", "businessUnit": matches[0]}
        return {"status": "MULTIPLE", "options": matches}

    except Exception as e:
        return {"status": "ERROR", "message": str(e)}


def get_all_business_units(user_id: int) -> dict:
    """Return all available Procurement BUs for a user."""
    if not user_id:
        return {"status": "ERROR", "message": "userId required"}
    try:
        units = _load_business_units(user_id)
        return {"status": "ALL", "options": units}
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Supplier Validation by Business Unit
# Mirrors getSuppliersByBusinessUnit() from suppliersByBU.js
# ─────────────────────────────────────────────────────────────────────────────

def get_suppliers_by_business_unit(user_id: int, business_unit_id: int) -> dict:
    """
    Get all active suppliers with pay sites in the given BU.
    Mirrors your JS getSuppliersByBusinessUnit() exactly.

    Returns:
      { "status": "NONE" }
      { "status": "SUCCESS", "suppliers": [{ "id": int, "name": str }] }
      { "status": "ERROR",   "message": str }
    """
    if not user_id or not business_unit_id:
        return {"status": "ERROR", "message": "userId and businessUnitId required"}

    try:
        res       = _oracle_get(user_id, "/suppliers", {
            "expand": "sites",
            "onlyData": True,
            "limit": 500,
        })
        suppliers = res.get("items", [])

        matched = []
        for supplier in suppliers:
            sites = supplier.get("sites", [])
            if any(
                str(site.get("ProcurementBUId")) == str(business_unit_id)
                and site.get("Status") == "ACTIVE"
                and site.get("SitePurposePayFlag") is True
                for site in sites
            ):
                matched.append({
                    "id":   supplier["SupplierId"],
                    "name": supplier["Supplier"],
                })

        if not matched:
            return {"status": "NONE"}
        return {"status": "SUCCESS", "suppliers": matched}

    except Exception as e:
        return {"status": "ERROR", "message": str(e)}


def find_supplier_by_name(user_id: int, business_unit_id: int,
                           supplier_name: str) -> dict:
    """
    Find a specific supplier within a BU by name (smart matching).

    Returns:
      { "status": "NOT_FOUND" }
      { "status": "SINGLE",   "supplier": { "id": int, "name": str } }
      { "status": "MULTIPLE", "options": [...] }
    """
    result = get_suppliers_by_business_unit(user_id, business_unit_id)
    if result["status"] != "SUCCESS":
        return {"status": "NOT_FOUND"}

    matches = [
        s for s in result["suppliers"]
        if _is_match(s["name"], supplier_name)
    ]

    if not matches:
        return {"status": "NOT_FOUND"}
    if len(matches) == 1:
        return {"status": "SINGLE", "supplier": matches[0]}
    return {"status": "MULTIPLE", "options": matches}


# ─────────────────────────────────────────────────────────────────────────────
# Supplier Site Validation
# Mirrors validateSupplierSite() from supplierSite.js
# ─────────────────────────────────────────────────────────────────────────────

def validate_supplier_site(user_id: int, supplier_id: int,
                            business_unit_id: int) -> dict:
    """
    Get valid pay sites for a supplier in the given BU.

    Validation criteria (mirrors your JS exactly):
      - site.Status == "ACTIVE"
      - site.SitePurposePayFlag == True
      - site.assignments contains one with BillToBUId == business_unit_id AND Status == "ACTIVE"

    Returns:
      { "status": "NONE" }
      { "status": "SINGLE", "site": { "id": int, "name": str } }   ← auto-select
      { "status": "SUCCESS", "sites": [{ "id": int, "name": str }] }
      { "status": "ERROR",   "message": str }
    """
    if not user_id or not supplier_id or not business_unit_id:
        return {"status": "ERROR", "message": "userId, supplierId, businessUnitId required"}

    try:
        res      = _oracle_get(user_id,
                               f"/suppliers/{supplier_id}/child/sites",
                               {"expand": "assignments", "onlyData": True})
        all_sites = res.get("items", [])

        if not all_sites:
            return {"status": "NONE"}

        valid = [
            site for site in all_sites
            if site.get("Status") == "ACTIVE"
            and site.get("SitePurposePayFlag") is True
            and any(
                str(a.get("BillToBUId")) == str(business_unit_id)
                and a.get("Status") == "ACTIVE"
                for a in site.get("assignments", [])
            )
        ]

        if not valid:
            return {"status": "NONE"}

        sites = [
            {"id": s["SupplierSiteId"], "name": s["SupplierSite"]}
            for s in valid
        ]

        # Auto-select if only one site
        if len(sites) == 1:
            return {"status": "SINGLE", "site": sites[0]}

        return {"status": "SUCCESS", "sites": sites}

    except Exception as e:
        return {"status": "ERROR", "message": str(e)}