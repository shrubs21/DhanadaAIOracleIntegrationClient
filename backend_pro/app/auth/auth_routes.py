from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from jose import jwt
import os

from app.db.database import get_db
from app.auth.password import hash_password, verify_password
from app.dependencies import authenticate_token

router = APIRouter()

SECRET_KEY = os.getenv("JWT_SECRET", "supersecret")
ALGORITHM = "HS256"


# -----------------------------
# REQUEST MODELS
# -----------------------------
class RegisterRequest(BaseModel):
    first_name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


# -----------------------------
# REGISTER
# -----------------------------
@router.post("/register")
def register(data: RegisterRequest):

    conn = get_db()
    cursor = conn.cursor()

    try:

        # Check if user exists
        cursor.execute(
            "SELECT id FROM users WHERE email=%s",
            (data.email,)
        )

        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="User already exists")

        hashed_password = hash_password(data.password)

        cursor.execute(
            """
            INSERT INTO users (first_name, email, password)
            VALUES (%s, %s, %s)
            RETURNING id, email
            """,
            (data.first_name, data.email, hashed_password)
        )

        user = cursor.fetchone()

        conn.commit()

        token = jwt.encode(
            {"user_id": user[0], "email": user[1]},
            SECRET_KEY,
            algorithm=ALGORITHM
        )

        return {
            "user": {
                "id": user[0],
                "email": user[1]
            },
            "token": token
        }

    finally:
        cursor.close()
        conn.close()


# -----------------------------
# LOGIN
# -----------------------------
@router.post("/login")
def login(data: LoginRequest):

    conn = get_db()
    cursor = conn.cursor()

    try:

        cursor.execute(
            "SELECT id, email, password FROM users WHERE email=%s",
            (data.email,)
        )

        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not verify_password(data.password, user[2]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = jwt.encode(
            {"user_id": user[0], "email": user[1]},
            SECRET_KEY,
            algorithm=ALGORITHM
        )

        return {
            "user": {
                "id": user[0],
                "email": user[1]
            },
            "token": token
        }

    finally:
        cursor.close()
        conn.close()


# -----------------------------
# ME (JWT REQUIRED)
# -----------------------------
@router.get("/me")
def me(user=Depends(authenticate_token)):
    return {"user": user}