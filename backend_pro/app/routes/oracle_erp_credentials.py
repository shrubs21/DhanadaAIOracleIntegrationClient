from fastapi import APIRouter, Depends
from pydantic import BaseModel
import redis
import os
import json

from app.routes.invoice_ai_routes import _get_user_id_from_request

router = APIRouter()


# ---------------- MODEL ----------------
class ERPCredentials(BaseModel):
    base_url: str
    username: str
    password: str


# ---------------- REDIS CONNECTION ----------------
def get_redis():
    return redis.Redis(
        host=os.getenv("REDIS_HOST", "dhanada-redis-cache"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        db=0,
        decode_responses=True
    )


# ---------------- SAVE ERP ----------------
@router.post("/oracle/erp")
def save_erp_credentials(
    data: ERPCredentials,
    user_id: int = Depends(_get_user_id_from_request)
):
    r = get_redis()

    key = f"user:{user_id}:oracle:ERP"

    r.set(key, json.dumps({
        "baseUrl": data.base_url,
        "username": data.username,
        "password": data.password
    }))

    return {"success": True, "message": "ERP credentials saved"}


# ---------------- GET ERP ----------------
@router.get("/oracle/erp")
def get_erp_credentials(
    user_id: int = Depends(_get_user_id_from_request)
):
    r = get_redis()

    key = f"user:{user_id}:oracle:ERP"
    raw = r.get(key)

    if not raw:
        return {"connected": False}

    data = json.loads(raw)

    return {
        "connected": True,
        "base_url": data.get("baseUrl"),
        "username": data.get("username")
    }


# ---------------- DELETE ERP ----------------
@router.delete("/oracle/erp")
def delete_erp_credentials(
    user_id: int = Depends(_get_user_id_from_request)
):
    r = get_redis()
    r.delete(f"user:{user_id}:oracle:ERP")

    return {"success": True, "message": "ERP credentials removed"}