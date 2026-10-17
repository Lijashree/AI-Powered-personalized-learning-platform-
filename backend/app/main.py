from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import get_db
from app.auth import get_current_user_id
from app.embeddings import TOPICS

# Import routers
from app.routes.auth import router as auth_router
from app.routes.questions import router as questions_router
from app.routes.notes import router as notes_router
from app.routes.quizzes import router as quizzes_router
from app.routes.flashcards import router as flashcards_router
from app.routes.doubt_solver import router as doubt_solver_router
from app.routes.roadmaps import router as roadmaps_router
from app.routes.interview import router as interview_router
from app.routes.coding import router as coding_router
from app.routes.planner import router as planner_router
from app.routes.dashboard import router as dashboard_router
from app.routes.history_route import router as history_router
from app.database import check_db_health, init_db

app = FastAPI(title="StudyMind API", version="1.0.0")

@app.on_event("startup")
async def startup_event():
    await init_db()

# CORS Setup
origins_raw = settings.CORS_ORIGINS or "http://localhost:3000"
origins = [o.strip().rstrip("/") for o in origins_raw.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root Index & Health Endpoints
@app.get("/")
async def root_index():
    return {"message": "StudyMind API", "version": "1.0.0", "status": "running", "docs": "/docs", "health": "/api/health"}

@app.get("/health")
async def health_root():
    return {"status": "ok", "service": "StudyMind API", "version": "1.0.0"}

# Root Endpoint under /api
@app.get("/api/")
async def root():
    return {"message": "StudyMind API", "version": "1.0.0", "status": "running"}

# Server Health Check
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "StudyMind API", "version": "1.0.0"}

# Database Health & Readiness Check
@app.get("/api/health/db")
async def health_db():
    return await check_db_health()

# Topics Endpoint
@app.get("/api/topics")
async def get_topics():
    return TOPICS

# Comprehensive Analytics Endpoint (Aggregates across all study and answer activities)
@app.get("/api/analytics")
async def analytics(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    
    # Fetch study activity records
    questions = await db.questions.find({"user_id": user_id}, {"embedding": 0}).sort("created_at", -1).to_list(length=500)
    notes = await db.notes.find({"user_id": user_id}, {"markdown_content": 0}).sort("created_at", -1).to_list(length=500)
    quizzes = await db.quizzes.find({"user_id": user_id}).sort([("submitted_at", -1), ("created_at", -1)]).to_list(length=500)
    doubts = await db.doubt_chats.find({"user_id": user_id}).sort("updated_at", -1).to_list(length=500)
    flashcards = await db.flashcards.find({"user_id": user_id}).sort("created_at", -1).to_list(length=500)
    coding = await db.coding_challenges.find({"user_id": user_id}).sort("created_at", -1).to_list(length=500)
    roadmaps = await db.roadmaps.find({"user_id": user_id}).sort("created_at", -1).to_list(length=500)

    # 1. Total questions & study answers count
    # Includes questions asked, questions answered in quizzes, doubts asked, and notes generated
    total_q_count = len(questions)
    quiz_q_count = sum(len(q.get("questions") or []) for q in quizzes if q.get("score") is not None)
    doubt_q_count = sum(len([m for m in d.get("messages", []) if m.get("role") == "user"]) for d in doubts)
    total_questions = total_q_count + quiz_q_count + doubt_q_count + len(notes)

    # 2. Activity count per topic
    by_topic = {t: 0 for t in TOPICS}
    
    def record_topic(t):
        if not t:
            return
        t_clean = t.strip()
        for std_t in TOPICS:
            if std_t.lower() == t_clean.lower() or std_t.lower() in t_clean.lower():
                by_topic[std_t] += 1
                return
        by_topic[t_clean] = by_topic.get(t_clean, 0) + 1

    for q in questions:
        record_topic(q.get("topic"))
    for n in notes:
        record_topic(n.get("topic"))
    for qz in quizzes:
        record_topic(qz.get("topic"))
    for d in doubts:
        record_topic(d.get("topic"))
    for f in flashcards:
        record_topic(f.get("topic"))
    for c in coding:
        record_topic(c.get("topic"))
    for r in roadmaps:
        record_topic(r.get("subject"))

    topics_used = sum(1 for v in by_topic.values() if v > 0)

    # 3. Recent activity stream across all study tools (Top 10)
    recent = []
    
    for q in questions[:10]:
        recent.append({
            "id": str(q["_id"]),
            "text": q.get("text", "Question"),
            "topic": q.get("topic", "General"),
            "created_at": q.get("created_at", ""),
            "type": "Question",
        })
        
    for qz in quizzes[:10]:
        if qz.get("score") is not None:
            max_s = qz.get("max_score", 5) or 5
            score_s = qz.get("score", 0) or 0
            text_desc = f"Completed Quiz: Scored {score_s}/{max_s} ({int((score_s/max_s)*100)}%)"
        else:
            text_desc = f"Started Quiz on {qz.get('topic', 'General')}"
        recent.append({
            "id": str(qz["_id"]),
            "text": text_desc,
            "topic": qz.get("topic", "Quiz"),
            "created_at": qz.get("submitted_at") or qz.get("created_at", ""),
            "type": "Quiz",
        })
        
    for d in doubts[:10]:
        msgs = d.get("messages", [])
        last_user_msg = ""
        for m in reversed(msgs):
            if m.get("role") == "user":
                last_user_msg = m.get("text", "")
                break
        recent.append({
            "id": str(d["_id"]),
            "text": f"Doubt: {last_user_msg[:120]}" if last_user_msg else f"Doubt session on {d.get('topic')}",
            "topic": d.get("topic", "Discussion"),
            "created_at": d.get("updated_at") or d.get("created_at", ""),
            "type": "Doubt",
        })
        
    for n in notes[:10]:
        recent.append({
            "id": str(n["_id"]),
            "text": f"Studied Notes: {n.get('title') or n.get('topic')}",
            "topic": n.get("topic", "Notes"),
            "created_at": n.get("created_at", ""),
            "type": "Notes",
        })

    recent.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    recent = recent[:10]

    return {
        "total_questions": total_questions,
        "topics_used": topics_used,
        "by_topic": by_topic,
        "recent_activity": recent,
    }

# Include routers under /api
app.include_router(auth_router, prefix="/api")
app.include_router(questions_router, prefix="/api")
app.include_router(notes_router, prefix="/api")
app.include_router(quizzes_router, prefix="/api")
app.include_router(flashcards_router, prefix="/api")
app.include_router(doubt_solver_router, prefix="/api")
app.include_router(roadmaps_router, prefix="/api")
app.include_router(interview_router, prefix="/api")
app.include_router(coding_router, prefix="/api")
app.include_router(planner_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(history_router, prefix="/api")
