from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db, safe_object_id, fmt_id
from app.auth import get_current_user_id
from app.services.gemini import generate_notes, get_youtube_recommendations
from app.models.schemas import NotesGenerateBody

router = APIRouter(prefix="/notes", tags=["Notes"])

@router.post("/generate")
async def create_notes_endpoint(body: NotesGenerateBody, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    
    # Generate notes using OpenRouter AI
    try:
        notes_data = await generate_notes(body.topic, body.mode)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI notes generation failed: {str(e)}")
        
    doc = {
        "user_id": user_id,
        "topic": body.topic,
        "mode": body.mode,
        "title": notes_data.get("title", f"{body.topic} Notes"),
        "markdown_content": notes_data.get("markdown_content", ""),
        "youtube_recommendations": notes_data.get("youtube_recommendations") or get_youtube_recommendations(body.topic),
        "is_bookmarked": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    result = await db.notes.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    
    # Track completed topic for streak/progress
    await db.users.update_one(
        {"_id": safe_object_id(user_id)},
        {"$addToSet": {"completed_topics": body.topic}}
    )
    
    return doc

@router.get("/history")
async def get_notes_history(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    docs = await db.notes.find({"user_id": user_id}).sort("created_at", -1).to_list(length=100)
    for d in docs:
        if "youtube_recommendations" not in d or not d["youtube_recommendations"]:
            d["youtube_recommendations"] = get_youtube_recommendations(d.get("topic", ""))
    return [fmt_id(d) for d in docs]

@router.get("/{note_id}")
async def get_note(note_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(note_id)
    doc = await db.notes.find_one({"_id": oid, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Note not found.")
    if "youtube_recommendations" not in doc or not doc["youtube_recommendations"]:
        doc["youtube_recommendations"] = get_youtube_recommendations(doc.get("topic", ""))
    return fmt_id(doc)

@router.api_route("/{note_id}/bookmark", methods=["PUT", "PATCH"])
async def toggle_bookmark(note_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(note_id)
    doc = await db.notes.find_one({"_id": oid, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Note not found.")
    
    new_state = not doc.get("is_bookmarked", False)
    await db.notes.update_one({"_id": oid}, {"$set": {"is_bookmarked": new_state}})
    return {"id": note_id, "is_bookmarked": new_state}

@router.delete("/{note_id}")
async def delete_note(note_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(note_id)
    result = await db.notes.delete_one({"_id": oid, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found.")
    return {"deleted": True}
