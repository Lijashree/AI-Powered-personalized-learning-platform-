from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db, safe_object_id, fmt_id
from app.auth import get_current_user_id
from app.services.gemini import generate_interview_prep, get_leetcode_recommendations
from app.models.schemas import InterviewGenerateBody

router = APIRouter(prefix="/interview", tags=["Interview Prep"])

@router.post("/generate")
async def create_interview_endpoint(body: InterviewGenerateBody, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    
    try:
        prep_data = await generate_interview_prep(body.topic, body.level)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI interview prep generation failed: {str(e)}")
        
    doc = {
        "user_id": user_id,
        "topic": body.topic,
        "level": body.level,
        "questions": prep_data.get("questions", []),
        "leetcode_recommendations": prep_data.get("leetcode_recommendations") or get_leetcode_recommendations(body.topic),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    result = await db.interviews.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    
    # Track completed topic
    await db.users.update_one(
        {"_id": safe_object_id(user_id)},
        {"$addToSet": {"completed_topics": body.topic}}
    )
    
    return doc

@router.get("/history")
async def get_interview_history(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    docs = await db.interviews.find({"user_id": user_id}).sort("created_at", -1).to_list(length=50)
    for d in docs:
        if "leetcode_recommendations" not in d or not d["leetcode_recommendations"]:
            d["leetcode_recommendations"] = get_leetcode_recommendations(d.get("topic", ""))
    return [fmt_id(d) for d in docs]

@router.get("/{interview_id}")
async def get_interview_set(interview_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(interview_id)
    doc = await db.interviews.find_one({"_id": oid, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview prep set not found.")
    if "leetcode_recommendations" not in doc or not doc["leetcode_recommendations"]:
        doc["leetcode_recommendations"] = get_leetcode_recommendations(doc.get("topic", ""))
    return fmt_id(doc)

@router.delete("/{interview_id}")
async def delete_interview_set(interview_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(interview_id)
    result = await db.interviews.delete_one({"_id": oid, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Interview prep set not found.")
    return {"deleted": True}
