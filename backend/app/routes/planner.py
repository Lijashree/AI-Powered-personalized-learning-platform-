from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db, safe_object_id, fmt_id
from app.auth import get_current_user_id
from app.models.schemas import GoalCreateBody

router = APIRouter(prefix="/planner", tags=["Planner"])

@router.get("/goals")
async def get_goals(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    docs = await db.goals.find({"user_id": user_id}).sort("created_at", -1).to_list(length=100)
    return [fmt_id(d) for d in docs]

@router.post("/goals")
async def create_goal(body: GoalCreateBody, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    doc = {
        "user_id": user_id,
        "title": body.title.strip(),
        "description": body.description.strip() if body.description else "",
        "target_date": body.target_date,
        "is_completed": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.goals.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc

@router.put("/goals/{goal_id}")
async def toggle_goal_completed(goal_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(goal_id)
    doc = await db.goals.find_one({"_id": oid, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Goal not found.")
        
    new_state = not doc.get("is_completed", False)
    await db.goals.update_one({"_id": oid}, {"$set": {"is_completed": new_state}})
    return {"id": goal_id, "is_completed": new_state}

@router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(goal_id)
    result = await db.goals.delete_one({"_id": oid, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found.")
    return {"deleted": True}
