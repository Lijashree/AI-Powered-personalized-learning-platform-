from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db, safe_object_id, fmt_id
from app.auth import get_current_user_id

router = APIRouter(prefix="/history", tags=["Unified History"])

@router.get("/all")
async def get_unified_history(user_id: str = Depends(get_current_user_id)):
    """
    Returns unified learning archive across all 8 study activities for authenticated student.
    Includes preview snippets, direct routes, and item IDs.
    """
    db = get_db()
    items = []

    # 1. Notes
    notes = await db.notes.find({"user_id": user_id}).sort("created_at", -1).to_list(length=30)
    for n in notes:
        content_preview = n.get("markdown_content", "").replace("#", "").strip()[:180]
        items.append({
            "id": str(n["_id"]),
            "topic": n.get("title") or n.get("topic", "Study Notes"),
            "clean_topic": n.get("topic", ""),
            "preview": content_preview or f"Study notes generated in {n.get('mode', 'detailed')} mode.",
            "date": n.get("created_at", ""),
            "module_type": "Notes",
            "route": "/notes",
            "data_id": str(n["_id"]),
            "full_content": n.get("markdown_content", "")
        })

    # 2. Roadmaps
    roadmaps = await db.roadmaps.find({"user_id": user_id}).sort("created_at", -1).to_list(length=30)
    for r in roadmaps:
        levels_preview = ", ".join([lvl.get("level_name", "") for lvl in r.get("levels", [])])
        items.append({
            "id": str(r["_id"]),
            "topic": r.get("subject", "Learning Roadmap"),
            "clean_topic": r.get("subject", ""),
            "preview": f"Curriculum tiers: {levels_preview}" if levels_preview else "Structured learning pathway.",
            "date": r.get("created_at", ""),
            "module_type": "Roadmap",
            "route": "/roadmap",
            "data_id": str(r["_id"]),
            "full_content": f"Learning roadmap for {r.get('subject')}"
        })

    # 3. Quizzes
    quizzes = await db.quizzes.find({"user_id": user_id}).sort([("submitted_at", -1), ("created_at", -1)]).to_list(length=30)
    for q in quizzes:
        score_text = f"Score: {q.get('score', 0)}/{q.get('max_score', 5)}" if q.get("score") is not None else "Quiz In Progress"
        quiz_questions = q.get("questions") or []
        first_q = quiz_questions[0].get("question_text", "") if quiz_questions else ""
        items.append({
            "id": str(q["_id"]),
            "topic": f"{q.get('topic', 'Quiz')} ({score_text})",
            "clean_topic": q.get("topic", ""),
            "preview": f"Question preview: {first_q}" if first_q else f"Interactive MCQ test on {q.get('topic')}.",
            "date": q.get("submitted_at") or q.get("created_at", ""),
            "module_type": "Quiz",
            "route": "/quiz",
            "data_id": str(q["_id"]),
            "full_content": f"Quiz on {q.get('topic')} with {len(q.get('questions', []))} questions."
        })

    # 4. Flashcards
    cards = await db.flashcards.find({"user_id": user_id}).sort("created_at", -1).to_list(length=30)
    for c in cards:
        card_list = c.get("cards", [])
        first_card = card_list[0].get("front", "") if card_list else ""
        items.append({
            "id": str(c["_id"]),
            "topic": f"{c.get('topic', 'Flashcards Set')} ({len(card_list)} cards)",
            "clean_topic": c.get("topic", ""),
            "preview": f"Sample card: {first_card}" if first_card else f"Vocabulary cards on {c.get('topic')}.",
            "date": c.get("created_at", ""),
            "module_type": "Flashcards",
            "route": "/flashcards",
            "data_id": str(c["_id"]),
            "full_content": f"Flashcard set on {c.get('topic')}"
        })

    # 5. Coding Practice (Fixed collection name: coding_challenges)
    coding = await db.coding_challenges.find({"user_id": user_id}).sort("created_at", -1).to_list(length=30)
    for cd in coding:
        challenges = cd.get("challenges", [])
        first_title = challenges[0].get("title", "") if challenges else ""
        items.append({
            "id": str(cd["_id"]),
            "topic": f"{cd.get('topic', 'Coding Practice')} ({len(challenges)} problems)",
            "clean_topic": cd.get("topic", ""),
            "preview": f"Sample problem: {first_title}" if first_title else f"Algorithmic challenges on {cd.get('topic')}.",
            "date": cd.get("created_at", ""),
            "module_type": "Coding Practice",
            "route": "/coding",
            "data_id": str(cd["_id"]),
            "full_content": f"Coding arena on {cd.get('topic')}"
        })

    # 6. Interview Prep (Fixed collection name: interviews)
    interviews = await db.interviews.find({"user_id": user_id}).sort("created_at", -1).to_list(length=30)
    for iv in interviews:
        questions = iv.get("questions", [])
        first_q = questions[0].get("question", "") if questions else ""
        items.append({
            "id": str(iv["_id"]),
            "topic": f"{iv.get('topic', 'Interview')} ({iv.get('level', 'Intermediate').capitalize()})",
            "clean_topic": iv.get("topic", ""),
            "preview": f"First Question: {first_q}" if first_q else f"Technical interview questions on {iv.get('topic')}.",
            "date": iv.get("created_at", ""),
            "module_type": "Interview Prep",
            "route": "/interview",
            "data_id": str(iv["_id"]),
            "full_content": f"Interview prep for {iv.get('topic')}"
        })

    # 7. Doubt Chats
    doubts = await db.doubt_chats.find({"user_id": user_id}).sort("updated_at", -1).to_list(length=30)
    for d in doubts:
        msgs = d.get("messages", [])
        last_msg = msgs[-1].get("text", "") if msgs else ""
        items.append({
            "id": str(d["_id"]),
            "topic": f"Doubt: {d.get('topic', 'Discussion')}",
            "clean_topic": d.get("topic", ""),
            "preview": f"Latest message: {last_msg[:160]}" if last_msg else f"Doubt session on {d.get('topic')}.",
            "date": d.get("updated_at") or d.get("created_at", ""),
            "module_type": "Doubt Session",
            "route": "/doubt-solver",
            "data_id": str(d["_id"]),
            "full_content": last_msg
        })

    # 8. Questions / Semantic Tagger
    questions = await db.questions.find({"user_id": user_id}).sort("created_at", -1).to_list(length=30)
    for q in questions:
        items.append({
            "id": str(q["_id"]),
            "topic": q.get("text", "Question"),
            "clean_topic": q.get("topic", ""),
            "preview": f"Tagged under {q.get('topic', 'General')} (Confidence: {int(q.get('topic_confidence', 0)*100)}%)",
            "date": q.get("created_at", ""),
            "module_type": "Question",
            "route": "/dashboard",
            "data_id": str(q["_id"]),
            "full_content": q.get("text", "")
        })

    # 9. Saved Code
    saved_codes = await db.saved_codes.find({"user_id": user_id}).sort("created_at", -1).to_list(length=30)
    for s in saved_codes:
        code_preview = s.get("code", "")[:180]
        items.append({
            "id": str(s["_id"]),
            "topic": s.get("title") or s.get("topic", "Saved Code"),
            "clean_topic": s.get("topic", ""),
            "preview": f"[{s.get('language', 'unknown')}] {code_preview}",
            "date": s.get("created_at", ""),
            "module_type": "Saved Code",
            "route": "/coding",
            "data_id": str(s["_id"]),
            "full_content": s.get("code", ""),
            "language": s.get("language", ""),
            "stdin": s.get("stdin", "")
        })

    # Sort all items by date descending
    items.sort(key=lambda x: x.get("date", ""), reverse=True)
    return items

@router.delete("/{module_type}/{item_id}")
async def delete_history_item(module_type: str, item_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(item_id)
    
    collection_map = {
        "Notes": db.notes,
        "Roadmap": db.roadmaps,
        "Quiz": db.quizzes,
        "Flashcards": db.flashcards,
        "Coding Practice": db.coding_challenges,
        "Interview Prep": db.interviews,
        "Doubt Session": db.doubt_chats,
        "Question": db.questions,
        "Saved Code": db.saved_codes
    }

    col = collection_map.get(module_type)
    if col is None:
        raise HTTPException(status_code=400, detail=f"Invalid module type: {module_type}")

    res = await col.delete_one({"_id": oid, "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found.")
    return {"deleted": True, "module_type": module_type, "id": item_id}
