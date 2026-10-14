from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db, safe_object_id, fmt_id
from app.auth import get_current_user_id
from app.services.gemini import generate_coding_practice, get_leetcode_recommendations
from app.models.schemas import CodingGenerateBody, CodeExecutionRequest, CodeSaveBody
from app.services.code_executor import execute_python, execute_java

router = APIRouter(prefix="/coding", tags=["Coding Practice"])

@router.post("/generate")
async def create_coding_endpoint(body: CodingGenerateBody, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    
    try:
        coding_data = await generate_coding_practice(body.topic)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI coding practice generation failed: {str(e)}")
        
    doc = {
        "user_id": user_id,
        "topic": body.topic,
        "challenges": coding_data.get("challenges", []),
        "leetcode_recommendations": coding_data.get("leetcode_recommendations") or get_leetcode_recommendations(body.topic),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    result = await db.coding_challenges.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    
    # Track completed topic
    await db.users.update_one(
        {"_id": safe_object_id(user_id)},
        {"$addToSet": {"completed_topics": body.topic}}
    )
    
    return doc

@router.post("/run")
async def run_code(body: CodeExecutionRequest, user_id: str = Depends(get_current_user_id)):
    if body.language == "python":
        result = execute_python(body.code, body.stdin)
    elif body.language == "java":
        result = execute_java(body.code, body.stdin)
    else:
        raise HTTPException(status_code=400, detail="Unsupported language")
    
    return result

@router.post("/save")
async def save_code(body: CodeSaveBody, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    doc = {
        "user_id": user_id,
        "language": body.language,
        "code": body.code,
        "stdin": body.stdin,
        "topic": body.topic or "Saved Code",
        "title": body.title or "Untitled",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.saved_codes.insert_one(doc)
    return {"id": str(result.inserted_id), "status": "saved"}

@router.get("/history")
async def get_coding_history(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    docs = await db.coding_challenges.find({"user_id": user_id}).sort("created_at", -1).to_list(length=50)
    for d in docs:
        if "leetcode_recommendations" not in d or not d["leetcode_recommendations"]:
            d["leetcode_recommendations"] = get_leetcode_recommendations(d.get("topic", ""))
    return [fmt_id(d) for d in docs]

@router.get("/{coding_id}")
async def get_coding_set(coding_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(coding_id)
    doc = await db.coding_challenges.find_one({"_id": oid, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Coding practice set not found.")
    if "leetcode_recommendations" not in doc or not doc["leetcode_recommendations"]:
        doc["leetcode_recommendations"] = get_leetcode_recommendations(doc.get("topic", ""))
    return fmt_id(doc)

@router.delete("/{coding_id}")
async def delete_coding_set(coding_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(coding_id)
    result = await db.coding_challenges.delete_one({"_id": oid, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coding practice set not found.")
    return {"deleted": True}
