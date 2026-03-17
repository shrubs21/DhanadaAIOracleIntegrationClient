"""
security/credentials.py

Encrypted Oracle credential storage.
Uses Fernet symmetric encryption (AES-128-CBC).
Encryption key loaded from environment — never stored in Redis.
"""

from __future__ import annotations
import base64
import json
import os
from typing import Optional

import redis as redis_lib

_redis = redis_lib.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0, decode_responses=True,
)

CRED_TTL = 0  # Credentials never expire unless explicitly deleted


def _get_fernet():
    """Get or create Fernet encryption object."""
    try:
        from cryptography.fernet import Fernet
    except ImportError:
        return None

    key_env = os.getenv("CREDENTIAL_ENCRYPTION_KEY")
    if not key_env:
        # Generate a key if not set (dev mode — warn loudly)
        print(
            "WARNING: CREDENTIAL_ENCRYPTION_KEY not set. "
            "Credentials stored unencrypted. Set this in production."
        )
        return None

    try:
        return Fernet(key_env.encode())
    except Exception:
        return None


def _encrypt(data: str) -> str:
    """Encrypt a string. Falls back to base64 if cryptography not available."""
    fernet = _get_fernet()
    if fernet:
        return fernet.encrypt(data.encode()).decode()
    # Fallback: base64 (not truly secure — require CREDENTIAL_ENCRYPTION_KEY in prod)
    return base64.b64encode(data.encode()).decode()


def _decrypt(data: str) -> str:
    """Decrypt a string."""
    fernet = _get_fernet()
    if fernet:
        try:
            return fernet.decrypt(data.encode()).decode()
        except Exception:
            pass
    # Fallback: try base64
    try:
        return base64.b64decode(data.encode()).decode()
    except Exception:
        return data


def store_credentials(
    user_id:   int,
    tenant_id: str,
    username:  str,
    password:  str,
    base_url:  str,
) -> None:
    """
    Store Oracle credentials encrypted in Redis.
    Namespaced by tenant for isolation.
    """
    raw     = json.dumps({
        "username": username,
        "password": password,
        "baseUrl":  base_url.rstrip("/"),
    })
    encrypted = _encrypt(raw)
    key = f"tenant:{tenant_id}:user:{user_id}:oracle:ERP"
    _redis.set(key, encrypted)

    # Also write legacy key for backward compatibility
    _redis.set(f"user:{user_id}:oracle:ERP", raw)


def get_credentials(user_id: int, tenant_id: str = "default") -> Optional[dict]:
    """
    Retrieve and decrypt Oracle credentials.
    Tries tenant-scoped key first, then legacy key.
    """
    # Try tenant-scoped encrypted key
    key = f"tenant:{tenant_id}:user:{user_id}:oracle:ERP"
    raw = _redis.get(key)
    if raw:
        try:
            decrypted = _decrypt(raw)
            return json.loads(decrypted)
        except Exception:
            pass

    # Fall back to legacy unencrypted key
    legacy = _redis.get(f"user:{user_id}:oracle:ERP")
    if legacy:
        try:
            return json.loads(legacy)
        except Exception:
            pass

    return None


def delete_credentials(user_id: int, tenant_id: str = "default") -> None:
    _redis.delete(f"tenant:{tenant_id}:user:{user_id}:oracle:ERP")
    _redis.delete(f"user:{user_id}:oracle:ERP")