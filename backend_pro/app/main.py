import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv


load_dotenv()

PORT = int(os.getenv("PORT", 4000))

app = FastAPI(title="Dhanada AI Oracle Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.auth.auth_routes import router as auth_router

from app.routes.invoice_ai_routes import router as invoice_ai_router
from app.routes.oracle_routes import router as oracle_router

from app.routes.oracle_erp_credentials import router as erp_router
app.include_router(erp_router, prefix="/api")
app.include_router(oracle_router, prefix="/api", tags=["Oracle"])

app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])


app.include_router(invoice_ai_router, prefix="/api/invoice-ai", tags=["Invoice AI"])

@app.get("/")
def health_check():
    return {"status": "Backend is running "}