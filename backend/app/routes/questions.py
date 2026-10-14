from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db, safe_object_id
from app.auth import get_current_user_id
from app.embeddings import embed_text, classify_topic, find_similar
from app.services.rag import retrieve_student_study_context
from app.models.schemas import QuestionBody

router = APIRouter(prefix="/questions", tags=["Questions"])

@router.post("")
async def ask_question(body: QuestionBody, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    embedding = embed_text(body.text)
    topic, confidence = classify_topic(embedding)

    # Check student's personal study materials via RAG
    rag_info = await retrieve_student_study_context(user_id, body.text)
    is_reused = rag_info.get("already_studied", False)

    past = await db.questions.find(
        {"user_id": user_id},
        {"_id": 1, "text": 1, "topic": 1, "embedding": 1, "created_at": 1}
    ).to_list(length=500)

    similar_raw = find_similar(embedding, [{"id": str(d["_id"]), **d} for d in past])
    similar_ids = [s["id"] for s in similar_raw]
    if len(similar_raw) > 0 and similar_raw[0].get("similarity", 0) > 0.8:
        is_reused = True

    doc = {
        "user_id": user_id,
        "text": body.text,
        "topic": topic,
        "topic_confidence": round(confidence, 4),
        "embedding": embedding.tolist(),
        "similar_question_ids": similar_ids,
        "is_reused": is_reused,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.questions.insert_one(doc)
    question_id = str(result.inserted_id)

    # Track topic and active date on user
    await db.users.update_one(
        {"_id": safe_object_id(user_id)},
        {
            "$addToSet": {"completed_topics": topic.strip()},
            "$set": {"last_active_date": datetime.now(timezone.utc).isoformat()}
        }
    )

    similar_out = []
    for s in similar_raw:
        similar_out.append({
            "id": s["id"],
            "text": s["text"],
            "topic": s["topic"],
            "similarity": s["similarity"],
            "created_at": s.get("created_at", ""),
        })

    return {
        "id": question_id,
        "text": body.text,
        "topic": topic,
        "topic_confidence": round(confidence, 4),
        "is_reused": is_reused,
        "matched_activity": rag_info.get("activity_type"),
        "previous_content": rag_info.get("previous_content"),
        "similar_questions": similar_out,
    }

@router.get("/history")
async def get_history(topic: Optional[str] = None, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    query = {"user_id": user_id}
    if topic:
        query["topic"] = topic
    docs = await db.questions.find(query, {"embedding": 0}).sort("created_at", -1).to_list(length=200)
    result = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        d["similar_count"] = len(d.pop("similar_question_ids", []))
        result.append(d)
    return result

@router.get("/{question_id}")
async def get_question(question_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(question_id)
    doc = await db.questions.find_one({"_id": oid, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Question not found.")
    doc["id"] = str(doc.pop("_id"))
    doc.pop("embedding", None)
    similar_ids = doc.pop("similar_question_ids", [])
    similar_docs = []
    for sid in similar_ids:
        try:
            from bson import ObjectId
            s_oid = ObjectId(sid)
        except Exception:
            continue
        s = await db.questions.find_one({"_id": s_oid}, {"embedding": 0})
        if s:
            s["id"] = str(s.pop("_id"))
            similar_docs.append(s)
    doc["similar_questions"] = similar_docs
    return doc

@router.delete("/{question_id}")
async def delete_question(question_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(question_id)
    result = await db.questions.delete_one({"_id": oid, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Question not found.")
    return {"deleted": True}
