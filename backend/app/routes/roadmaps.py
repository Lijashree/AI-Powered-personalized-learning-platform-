from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.database import get_db, safe_object_id, fmt_id
from app.auth import get_current_user_id
from app.services.gemini import generate_roadmap, generate_module_details, get_youtube_recommendations, get_leetcode_recommendations
from app.models.schemas import RoadmapGenerateBody, RoadmapProgressBody

router = APIRouter(prefix="/roadmaps", tags=["Roadmaps"])

class ModuleDetailsBody(BaseModel):
    subject: str
    module_title: str
    description: str = ""

@router.post("/generate")
async def create_roadmap_endpoint(body: RoadmapGenerateBody, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    
    try:
        roadmap_data = await generate_roadmap(body.subject)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI roadmap generation failed: {str(e)}")
        
    doc = {
        "user_id": user_id,
        "subject": body.subject,
        "levels": roadmap_data.get("levels", []),
        "youtube_recommendations": roadmap_data.get("youtube_recommendations") or get_youtube_recommendations(body.subject),
        "leetcode_recommendations": roadmap_data.get("leetcode_recommendations") or get_leetcode_recommendations(body.subject),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    result = await db.roadmaps.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc

@router.post("/module-details")
async def get_module_details_endpoint(body: ModuleDetailsBody, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    # Check if cached module details exist in DB
    cached = await db.module_details.find_one({
        "user_id": user_id,
        "subject": body.subject,
        "module_title": body.module_title
    })
    if cached:
        if "youtube_recommendations" not in cached or not cached["youtube_recommendations"]:
            cached["youtube_recommendations"] = get_youtube_recommendations(f"{body.module_title} {body.subject}")
        if "leetcode_recommendations" not in cached or not cached["leetcode_recommendations"]:
            cached["leetcode_recommendations"] = get_leetcode_recommendations(body.module_title)
        return fmt_id(cached)

    try:
        details = await generate_module_details(body.subject, body.module_title, body.description)
        details["user_id"] = user_id
        details["created_at"] = datetime.now(timezone.utc).isoformat()
        if "youtube_recommendations" not in details or not details["youtube_recommendations"]:
            details["youtube_recommendations"] = get_youtube_recommendations(f"{body.module_title} {body.subject}")
        if "leetcode_recommendations" not in details or not details["leetcode_recommendations"]:
            details["leetcode_recommendations"] = get_leetcode_recommendations(body.module_title)
            
        res = await db.module_details.insert_one(details)
        details["id"] = str(res.inserted_id)
        details.pop("_id", None)
        return details
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate module details: {str(e)}")

@router.api_route("/{roadmap_id}/progress", methods=["PUT", "PATCH"])
async def toggle_roadmap_step(roadmap_id: str, body: RoadmapProgressBody, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(roadmap_id)
    doc = await db.roadmaps.find_one({"_id": oid, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Roadmap not found.")
        
    levels = doc.get("levels", [])
    lvl_idx = getattr(body, "level_index", getattr(body, "level_idx", 0))
    mod_idx = getattr(body, "module_index", getattr(body, "module_idx", 0))

    if lvl_idx < 0 or lvl_idx >= len(levels):
        raise HTTPException(status_code=400, detail="Invalid level index.")
        
    modules = levels[lvl_idx].get("modules", [])
    if mod_idx < 0 or mod_idx >= len(modules):
        raise HTTPException(status_code=400, detail="Invalid module index.")
        
    modules[mod_idx]["is_completed"] = body.is_completed
    await db.roadmaps.update_one({"_id": oid}, {"$set": {"levels": levels}})
    
    if body.is_completed:
        module_title = modules[mod_idx].get("title", "")
        await db.users.update_one(
            {"_id": safe_object_id(user_id)},
            {"$addToSet": {"completed_topics": module_title}}
        )
        
    return {"id": roadmap_id, "level_index": lvl_idx, "module_index": mod_idx, "is_completed": body.is_completed}

@router.get("/history")
async def get_roadmaps_history(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    docs = await db.roadmaps.find({"user_id": user_id}).sort("created_at", -1).to_list(length=50)
    for d in docs:
        if "youtube_recommendations" not in d or not d["youtube_recommendations"]:
            d["youtube_recommendations"] = get_youtube_recommendations(d.get("subject", ""))
        if "leetcode_recommendations" not in d or not d["leetcode_recommendations"]:
            d["leetcode_recommendations"] = get_leetcode_recommendations(d.get("subject", ""))
    return [fmt_id(d) for d in docs]

@router.get("/{roadmap_id}")
async def get_roadmap(roadmap_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(roadmap_id)
    doc = await db.roadmaps.find_one({"_id": oid, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Roadmap not found.")
    if "youtube_recommendations" not in doc or not doc["youtube_recommendations"]:
        doc["youtube_recommendations"] = get_youtube_recommendations(doc.get("subject", ""))
    if "leetcode_recommendations" not in doc or not doc["leetcode_recommendations"]:
        doc["leetcode_recommendations"] = get_leetcode_recommendations(doc.get("subject", ""))
    return fmt_id(doc)

@router.delete("/{roadmap_id}")
async def delete_roadmap(roadmap_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(roadmap_id)
    result = await db.roadmaps.delete_one({"_id": oid, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Roadmap not found.")
    return {"deleted": True}
