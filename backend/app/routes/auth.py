from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pymongo.errors import DuplicateKeyError
from app.database import get_db, safe_object_id
from app.auth import hash_password, verify_password, create_access_token, get_current_user_id
from app.models.schemas import SignupBody, LoginBody

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup")
async def signup(body: SignupBody):
    db = get_db()
    clean_email = body.email.lower().strip()
    clean_name = body.name.strip()
    existing = await db.users.find_one({"email": clean_email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered.")
    doc = {
        "name": clean_name,
        "email": clean_email,
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "streak": 0,
        "last_active_date": None,
        "completed_topics": [],
    }
    try:
        result = await db.users.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Email already registered.")
    user_id = str(result.inserted_id)
    token = create_access_token(user_id, doc["email"])
    return {
        "token": token,
        "user": {"id": user_id, "name": doc["name"], "email": doc["email"], "created_at": doc["created_at"]},
    }

@router.post("/login")
async def login(body: LoginBody):
    db = get_db()
    clean_email = body.email.lower().strip()
    user = await db.users.find_one({"email": clean_email})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    user_id = str(user["_id"])
    token = create_access_token(user_id, user["email"])
    
    # Update user activity for streak
    now_date = datetime.now(timezone.utc).date().isoformat()
    last_active = user.get("last_active_date")
    streak = user.get("streak", 0)
    
    if last_active:
        last_date = datetime.fromisoformat(last_active).date()
        today = datetime.now(timezone.utc).date()
        diff = (today - last_date).days
        if diff == 1:
            streak += 1
        elif diff > 1:
            streak = 1
        # if diff == 0, keep streak as is
    else:
        streak = 1
        
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"streak": streak, "last_active_date": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "token": token,
        "user": {"id": user_id, "name": user["name"], "email": user["email"], "created_at": user.get("created_at", ""), "streak": streak},
    }

@router.get("/me")
async def me(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(user_id)
    user = await db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return {
        "id": user_id,
        "name": user["name"],
        "email": user["email"],
        "created_at": user.get("created_at", ""),
        "streak": user.get("streak", 0),
        "completed_topics": user.get("completed_topics", [])
    }
