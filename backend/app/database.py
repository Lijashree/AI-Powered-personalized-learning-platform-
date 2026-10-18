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
    is_atlas = "mongodb.net" in primary_url or "mongodb+srv://" in primary_url
    
    # Resilient connection settings for cloud hosting, DNS SRV resolution & cold starts
    options = {
        "serverSelectionTimeoutMS": 10000,
        "connectTimeoutMS": 10000,
        "socketTimeoutMS": 20000,
    }
    if is_atlas:
        options["maxIdleTimeMS"] = 45000  # Recycle idle sockets before Atlas proxy terminates them
        options["retryWrites"] = True

    try:
        _client = AsyncIOMotorClient(primary_url, **options)
        _active_url = primary_url
        _last_error = None
    except (ConfigurationError, Exception) as e:
        _last_error = str(e)
        logger.warning(
            f"Failed to initialize MongoDB client with configured MONGO_URL ({primary_url[:35]}...): {e}."
        )
        if not is_atlas:
            _client = AsyncIOMotorClient("mongodb://localhost:27017", serverSelectionTimeoutMS=4000)
            _active_url = "mongodb://localhost:27017"
        else:
            raise

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
            "last_error": None
        }
    except Exception as e:
        _last_error = str(e)
        logger.error(f"Database health check failed: {e}")
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
