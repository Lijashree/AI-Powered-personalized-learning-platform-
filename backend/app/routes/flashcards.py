from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db, safe_object_id, fmt_id
from app.auth import get_current_user_id
from app.services.gemini import generate_flashcards
from app.models.schemas import FlashcardGenerateBody, FlashcardLearnBody

router = APIRouter(prefix="/flashcards", tags=["Flashcards"])

@router.post("/generate")
async def create_flashcards_endpoint(body: FlashcardGenerateBody, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    
    try:
        flashcard_data = await generate_flashcards(body.topic, body.notes_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI flashcards generation failed: {str(e)}")
        
    doc = {
        "user_id": user_id,
        "topic": body.topic,
        "cards": flashcard_data.get("cards", []),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    result = await db.flashcards.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    
    # Track completed topic
    await db.users.update_one(
        {"_id": safe_object_id(user_id)},
        {"$addToSet": {"completed_topics": body.topic}}
    )
    
    return doc

@router.api_route("/{flashcard_id}/learn", methods=["PUT", "PATCH"])
async def update_flashcard_learned(flashcard_id: str, body: FlashcardLearnBody, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(flashcard_id)
    doc = await db.flashcards.find_one({"_id": oid, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Flashcards set not found.")
        
    cards = doc.get("cards", [])
    if body.card_index < 0 or body.card_index >= len(cards):
        raise HTTPException(status_code=400, detail="Invalid card index.")
        
    cards[body.card_index]["is_learned"] = body.is_learned
    await db.flashcards.update_one({"_id": oid}, {"$set": {"cards": cards}})
    return {"id": flashcard_id, "card_index": body.card_index, "is_learned": body.is_learned}

@router.get("/history")
async def get_flashcards_history(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    docs = await db.flashcards.find({"user_id": user_id}).sort("created_at", -1).to_list(length=100)
    return [fmt_id(d) for d in docs]

@router.get("/{flashcard_id}")
async def get_flashcard_set(flashcard_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(flashcard_id)
    doc = await db.flashcards.find_one({"_id": oid, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Flashcards set not found.")
    return fmt_id(doc)

@router.delete("/{flashcard_id}")
async def delete_flashcard_set(flashcard_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(flashcard_id)
    result = await db.flashcards.delete_one({"_id": oid, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Flashcards set not found.")
    return {"deleted": True}
