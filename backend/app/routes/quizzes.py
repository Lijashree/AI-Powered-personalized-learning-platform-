from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db, safe_object_id, fmt_id
from app.auth import get_current_user_id
from app.services.gemini import generate_quiz
from app.models.schemas import QuizGenerateBody, QuizSubmitBody

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])

@router.post("/generate")
async def create_quiz_endpoint(body: QuizGenerateBody, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    
    try:
        quiz_data = await generate_quiz(body.topic, body.notes_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI quiz generation failed: {str(e)}")
        
    doc = {
        "user_id": user_id,
        "topic": body.topic,
        "questions": quiz_data.get("questions", []),
        "score": None,
        "max_score": None,
        "answers": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    result = await db.quizzes.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc

@router.post("/{quiz_id}/submit")
async def submit_quiz(quiz_id: str, body: QuizSubmitBody, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(quiz_id)
    doc = await db.quizzes.find_one({"_id": oid, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Quiz not found.")
        
    submitted_at = datetime.now(timezone.utc).isoformat()
    await db.quizzes.update_one(
        {"_id": oid},
        {"$set": {
            "score": body.score,
            "max_score": body.max_score,
            "answers": body.answers,
            "submitted_at": submitted_at
        }}
    )

    # Record topic as studied and maintain active date
    topic = doc.get("topic")
    if topic:
        user_oid = safe_object_id(user_id)
        now_date = datetime.now(timezone.utc).isoformat()
        await db.users.update_one(
            {"_id": user_oid},
            {
                "$addToSet": {"completed_topics": topic.strip()},
                "$set": {"last_active_date": now_date}
            }
        )

    return {"id": quiz_id, "score": body.score, "max_score": body.max_score, "submitted_at": submitted_at}

@router.get("/history")
async def get_quiz_history(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    # Fetch all submitted quizzes or created quizzes for user
    docs = await db.quizzes.find({"user_id": user_id, "score": {"$ne": None}}).sort([("submitted_at", -1), ("created_at", -1)]).to_list(length=100)
    return [fmt_id(d) for d in docs]

@router.get("/{quiz_id}")
async def get_quiz(quiz_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(quiz_id)
    doc = await db.quizzes.find_one({"_id": oid, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    return fmt_id(doc)

@router.delete("/{quiz_id}")
async def delete_quiz(quiz_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(quiz_id)
    result = await db.quizzes.delete_one({"_id": oid, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    return {"deleted": True}
