from fastapi import APIRouter, Depends
from app.database import get_db, safe_object_id
from app.auth import get_current_user_id

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
async def get_dashboard_stats(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    oid = safe_object_id(user_id)
    
    # 1. Fetch user data for streak and completed topics list
    user = await db.users.find_one({"_id": oid})
    streak = user.get("streak", 0) if user else 0
    user_completed_topics = set(((user.get("completed_topics") if user else None) or []))
    
    # 2. Count notes and bookmarks
    notes_count = await db.notes.count_documents({"user_id": user_id})
    bookmarks_count = await db.notes.count_documents({"user_id": user_id, "is_bookmarked": True})
    
    # Collect topics from notes
    note_topics = await db.notes.distinct("topic", {"user_id": user_id})
    for t in note_topics:
        if t:
            user_completed_topics.add(t)

    # 3. Calculate quiz stats (total taken, average score)
    quizzes = await db.quizzes.find({"user_id": user_id, "score": {"$ne": None}}).to_list(length=500)
    quiz_count = len(quizzes)
    
    avg_score_pct = 0.0
    if quiz_count > 0:
        total_pct = 0.0
        for q in quizzes:
            max_s = q.get("max_score", 5) or 5
            score = q.get("score", 0) or 0
            total_pct += (score / max_s) * 100.0
            if q.get("topic"):
                user_completed_topics.add(q["topic"])
        avg_score_pct = round(total_pct / quiz_count, 1)
        
    # 4. Count study goals, flashcards, questions, coding, interviews, doubts
    total_goals = await db.goals.count_documents({"user_id": user_id})
    completed_goals = await db.goals.count_documents({"user_id": user_id, "is_completed": True})
    flashcards_count = await db.flashcards.count_documents({"user_id": user_id})
    questions_count = await db.questions.count_documents({"user_id": user_id})
    coding_count = await db.coding_challenges.count_documents({"user_id": user_id})
    interview_count = await db.interviews.count_documents({"user_id": user_id})
    doubt_count = await db.doubt_chats.count_documents({"user_id": user_id})
    roadmap_count = await db.roadmaps.count_documents({"user_id": user_id})
    
    # Collect topics from coding challenges, interviews, doubts, flashcards, and questions
    coding_topics = await db.coding_challenges.distinct("topic", {"user_id": user_id})
    for t in coding_topics:
        if t:
            user_completed_topics.add(t)
            
    interview_topics = await db.interviews.distinct("topic", {"user_id": user_id})
    for t in interview_topics:
        if t:
            user_completed_topics.add(t)

    doubt_topics = await db.doubt_chats.distinct("topic", {"user_id": user_id})
    for t in doubt_topics:
        if t:
            user_completed_topics.add(t)

    flashcard_topics = await db.flashcards.distinct("topic", {"user_id": user_id})
    for t in flashcard_topics:
        if t:
            user_completed_topics.add(t)

    question_topics = await db.questions.distinct("topic", {"user_id": user_id})
    for t in question_topics:
        if t:
            user_completed_topics.add(t)
    
    # 5. Get recent notes and roadmaps for quick actions
    recent_notes = await db.notes.find({"user_id": user_id}, {"markdown_content": 0}).sort("created_at", -1).to_list(length=5)
    for n in recent_notes:
        n["id"] = str(n.pop("_id"))
        
    recent_roadmaps = await db.roadmaps.find({"user_id": user_id}).sort("created_at", -1).to_list(length=5)
    for r in recent_roadmaps:
        r["id"] = str(r.pop("_id"))
        if r.get("subject"):
            user_completed_topics.add(r["subject"])
        
    completed_topics_list = sorted(list(user_completed_topics))

    return {
        "streak": streak,
        "completed_topics_count": len(completed_topics_list),
        "completed_topics": completed_topics_list,
        "notes_count": notes_count,
        "bookmarks_count": bookmarks_count,
        "flashcards_count": flashcards_count,
        "questions_count": questions_count,
        "coding_count": coding_count,
        "interview_count": interview_count,
        "doubt_count": doubt_count,
        "roadmap_count": roadmap_count,
        "quiz_count": quiz_count,
        "avg_score_percentage": avg_score_pct,
        "total_goals": total_goals,
        "completed_goals": completed_goals,
        "recent_notes": recent_notes,
        "recent_roadmaps": recent_roadmaps
    }
