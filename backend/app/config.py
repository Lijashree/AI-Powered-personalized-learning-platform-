import os
from pathlib import Path
from dotenv import load_dotenv

# Ensure backend/.env is located even if cwd is project root or another directory
backend_dir = Path(__file__).resolve().parent.parent
env_candidates = [
    backend_dir / ".env",
    backend_dir.parent / ".env",
    Path.cwd() / ".env",
]
for env_path in env_candidates:
    if env_path.is_file():
        load_dotenv(dotenv_path=env_path)

load_dotenv()


class Settings:
    MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    DB_NAME = os.environ.get("DB_NAME", "studymind_db")
    JWT_SECRET = os.environ.get("JWT_SECRET", "studymind_secure_jwt_secret_key_2026")
    JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_DAYS = int(os.environ.get("JWT_EXPIRE_DAYS", "7"))
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
    OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
    AI_MODEL = os.environ.get(
        "AI_MODEL",
        "google/gemini-2.5-flash"
    )


settings = Settings()