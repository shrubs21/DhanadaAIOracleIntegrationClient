from fastapi import APIRouter, Depends
from pydantic import BaseModel
import psycopg2
import os
import httpx

from app.routes.invoice_ai_routes import _get_user_id_from_request

router = APIRouter()

DATABASE_URL = os.getenv("DATABASE_URL")


class OracleCredentials(BaseModel):
    oic_url: str
    username: str
    password: str


# SAVE CREDENTIALS
@router.post("/oracle/credentials")
def save_oracle_credentials(
    data: OracleCredentials,
    user_id: int = Depends(_get_user_id_from_request)
):
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO oracle_user_credentials (user_id, oic_url, username, password)
        VALUES (%s,%s,%s,%s)
        ON CONFLICT (user_id)
        DO UPDATE SET
            oic_url = EXCLUDED.oic_url,
            username = EXCLUDED.username,
            password = EXCLUDED.password
        """,
        (user_id, data.oic_url, data.username, data.password),
    )

    conn.commit()
    cur.close()
    conn.close()

    return {"success": True, "message": "Oracle credentials saved"}


# GET SAVED CONNECTIONS
@router.get("/oracle/credentials")
def get_oracle_credentials(
    user_id: int = Depends(_get_user_id_from_request)
):
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, oic_url, username, created_at
        FROM oracle_user_credentials
        WHERE user_id=%s
        """,
        (user_id,)
    )

    rows = cur.fetchall()

    cur.close()
    conn.close()

    instances = []

    for r in rows:
        instances.append({
            "id": r[0],
            "oic_url": r[1],
            "username": r[2],
            "status": "connected",
            "connectedAt": r[3]
        })

    return {"instances": instances}


# DELETE CONNECTION
@router.delete("/oracle/credentials/{instance_id}")
def delete_oracle_credentials(
    instance_id: int,
    user_id: int = Depends(_get_user_id_from_request)
):
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    cur.execute(
        """
        DELETE FROM oracle_user_credentials
        WHERE id=%s AND user_id=%s
        """,
        (instance_id, user_id)
    )

    conn.commit()
    cur.close()
    conn.close()

    return {"success": True}


# TEST CONNECTION
@router.post("/oracle/test")
def test_oracle_connection(data: OracleCredentials):

    try:
        r = httpx.get(
            data.oic_url,
            auth=(data.username, data.password),
            timeout=10
        )

        if r.status_code in [200, 401]:
            return {"success": True}

        return {"success": False, "message": "Connection failed"}

    except Exception as e:
        return {"success": False, "message": str(e)}