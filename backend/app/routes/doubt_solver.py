from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from app.database import get_db, safe_object_id, fmt_id
from app.auth import get_current_user_id
from app.services.gemini import answer_doubt, answer_doubt_with_rag
from app.services.rag import retrieve_student_study_context
from app.models.schemas import DoubtChatBody

router = APIRouter(prefix="/doubts", tags=["Doubt Solver"])

@router.get("/check-topic")
async def check_already_studied(topic: str = Query(..., min_length=1), user_id: str = Depends(get_current_user_id)):
    """
    Checks if authenticated student has already generated or studied this topic in StudyMind.
    Used for the 'You have already studied this' card and RAG retrieval.
    """
    rag_info = await retrieve_student_study_context(user_id, topic)
    return rag_info

@router.post("/chat")
async def chat_doubt(body: DoubtChatBody, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    
    history = [m.dict() for m in body.messages]
    
    # Retrieve student's previous study materials if RAG is requested or context not provided
    retrieved_ctx = body.retrieved_context
    if body.use_rag and not retrieved_ctx:
        rag_match = await retrieve_student_study_context(user_id, body.topic)
        if rag_match.get("already_studied"):
            retrieved_ctx = rag_match.get("previous_content")

    try:
        if body.use_rag and retrieved_ctx:
            reply = await answer_doubt_with_rag(body.topic, retrieved_ctx, history)
        else:
            reply = await answer_doubt(body.topic, history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Tutor response failed: {str(e)}")
        
    new_message = {"role": "model", "text": reply}
    history.append(new_message)
    
    # Save or update the conversation in MongoDB under student's user_id
    chat_doc = await db.doubt_chats.find_one({"user_id": user_id, "topic": body.topic})
    if chat_doc:
        await db.doubt_chats.update_one(
            {"_id": chat_doc["_id"]},
            {"$set": {"messages": history, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        chat_id = str(chat_doc["_id"])
    else:
        new_doc = {
            "user_id": user_id,
            "topic": body.topic,
            "messages": history,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        res = await db.doubt_chats.insert_one(new_doc)
        chat_id = str(res.inserted_id)

    # Track studied topic and user activity
    await db.users.update_one(
        {"_id": safe_object_id(user_id)},
        {
            "$addToSet": {"completed_topics": body.topic.strip()},
            "$set": {"last_active_date": datetime.now(timezone.utc).isoformat()}
        }
    )
        
    return {
        "id": chat_id,
        "topic": body.topic,
        "reply": reply,
        "messages": history,
        "used_rag": bool(body.use_rag and retrieved_ctx)
    }

@router.get("/history")
async def get_chat_history(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    docs = await db.doubt_chats.find({"user_id": user_id}).sort("updated_at", -1).to_list(length=50)
    return [fmt_id(d) for d in docs]

@router.get("/{topic}")
async def get_chat_by_topic(topic: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    doc = await db.doubt_chats.find_one({"user_id": user_id, "topic": topic})
    if not doc:
        return {"topic": topic, "messages": []}
    return fmt_id(doc)

@router.delete("/{chat_id}")
async def delete_chat(chat_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(chat_id)
    result = await db.doubt_chats.delete_one({"_id": oid, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Chat not found.")
    return {"deleted": True}
