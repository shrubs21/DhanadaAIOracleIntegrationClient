import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_NAME = "Dhanada AI Oracle Backend"

    JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
    JWT_ALGORITHM = "HS256"

    PORT = int(os.getenv("PORT", 5000))

settings = Settings()