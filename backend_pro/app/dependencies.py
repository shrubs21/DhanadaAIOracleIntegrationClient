from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer
from jose import jwt
from app.config import settings

security = HTTPBearer(auto_error=False)


def authenticate_token(request: Request, credentials=Depends(security)):

    token = None

    if credentials:
        token = credentials.credentials

    if not token:
        token = request.query_params.get("token")

    if not token:
        raise HTTPException(status_code=401, detail="Access token required")

    try:
        decoded = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )

        user = {
            "id": decoded.get("user_id"),   # FIXED
            "email": decoded.get("email")
        }

        return user

    except:
        raise HTTPException(status_code=403, detail="Invalid or expired token")