import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConfigurationError, ServerSelectionTimeoutError
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException
from app.config import settings

logger = logging.getLogger("studymind.database")

_client = None
_active_url = None
_last_error = None


def get_client() -> AsyncIOMotorClient:
    global _client, _active_url, _last_error
    if _client is not None:
        return _client

    primary_url = settings.MONGO_URL or "mongodb://localhost:27017"
    try:
        # Attempt primary connection (e.g. Atlas or configured URI)
        _client = AsyncIOMotorClient(primary_url, serverSelectionTimeoutMS=4000)
        _active_url = primary_url
        _last_error = None
    except (ConfigurationError, Exception) as e:
        _last_error = str(e)
        logger.warning(
            f"Failed to initialize MongoDB client with configured MONGO_URL ({primary_url[:35]}...): {e}. "
            "Falling back to local MongoDB at mongodb://localhost:27017"
        )
        _client = AsyncIOMotorClient("mongodb://localhost:27017", serverSelectionTimeoutMS=4000)
        _active_url = "mongodb://localhost:27017"

    return _client


def get_db():
    client = get_client()
    return client[settings.DB_NAME]


async def check_db_health() -> dict:
    """Verifies actual database responsiveness and returns connection telemetry."""
    global _client, _active_url, _last_error
    try:
        db = get_db()
        ping_res = await db.command("ping")
        collections = await db.list_collection_names()
        is_atlas = "mongodb.net" in (_active_url or "")
        return {
            "status": "healthy",
            "connected": True,
            "database": settings.DB_NAME,
            "mode": "MongoDB Atlas" if is_atlas else "Local MongoDB",
            "active_url_masked": (_active_url[:20] + "...") if _active_url else "unknown",
            "collections": collections,
            "ping": ping_res,
            "last_error": _last_error
        }
    except (ServerSelectionTimeoutError, ConfigurationError, Exception) as e:
        # If primary failed during ping, attempt local fallback if not already attempted
        if _active_url != "mongodb://localhost:27017":
            try:
                logger.warning(f"Database ping failed on {_active_url}: {e}. Retrying with local MongoDB.")
                _client = AsyncIOMotorClient("mongodb://localhost:27017", serverSelectionTimeoutMS=3000)
                _active_url = "mongodb://localhost:27017"
                db = _client[settings.DB_NAME]
                ping_res = await db.command("ping")
                collections = await db.list_collection_names()
                return {
                    "status": "healthy",
                    "connected": True,
                    "database": settings.DB_NAME,
                    "mode": "Local MongoDB (Fallback)",
                    "active_url_masked": "mongodb://localhost:27017",
                    "collections": collections,
                    "ping": ping_res,
                    "last_error": f"Primary connection failed: {str(e)}"
                }
            except Exception as fallback_err:
                return {
                    "status": "unhealthy",
                    "connected": False,
                    "database": settings.DB_NAME,
                    "error": f"Primary: {str(e)}; Fallback: {str(fallback_err)}"
                }
        return {
            "status": "unhealthy",
            "connected": False,
            "database": settings.DB_NAME,
            "error": str(e)
        }


async def init_db():
    """Initializes collections and required unique indexes on startup."""
    try:
        db = get_db()
        await db.users.create_index("email", unique=True, sparse=True)
    except Exception as e:
        logger.warning(f"Could not initialize database index: {e}")


def safe_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid id.")


def fmt_id(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc
