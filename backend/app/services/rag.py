"""
Student-Specific Retrieval-Augmented Generation (RAG) Service for StudyMind.
Strictly isolates data per authenticated user_id.
Enables retrieval of previously generated/studied content (Notes, Quizzes, Flashcards, Roadmaps, Coding, Interviews, Doubts)
to answer student doubts with personal context and power the 'You already studied this' feature.
 
Retrieval mechanism (embedding-based):
Each candidate item belonging to the authenticated student is represented by a short
text (its topic/subject, optionally combined with its title) and embedded using the
shared sentence-transformers model (all-MiniLM-L6-v2, see app/embeddings.py). The
student's query is embedded the same way, and every candidate is scored against it
using cosine similarity (embed_text + cosine_similarity). The highest-scoring item
above SIMILARITY_THRESHOLD is treated as "already studied" and its stored content is
returned so it can be injected into the LLM prompt for a contextual re-explanation.
This is brute-force similarity search over a small per-user document set (no vector
index/ANN library is used, since per-user item counts are small).
"""
from typing import Dict, Any, Optional
from app.database import get_db
from app.embeddings import embed_text, cosine_similarity
 
# Minimum cosine similarity required to treat a
# past item as a genuine match for the student's current query.
SIMILARITY_THRESHOLD = 0.30
 
# Once a match at least this strong is found, later collections are skipped.
STRONG_MATCH_CUTOFF = 0.60
 
_EMPTY_RESULT = {
    "already_studied": False,
    "topic": None,
    "activity_type": None,
    "previous_content": "",
    "date": None,
    "title": None,
    "item_id": None,
}
 
 
def _safe_embed(text: str):
    """Embed text, returning None on failure so retrieval degrades gracefully
    (e.g. if the embedding model fails to load) instead of raising."""
    text = (text or "").strip()
    if not text:
        return None
    try:
        return embed_text(text)
    except Exception:
        return None
 
 
def _similarity(query_vec, candidate_text: str) -> float:
    """Cosine similarity between the query embedding and a candidate's embedding.
    Returns 0.0 (never matches) if either embedding cannot be computed."""
    if query_vec is None:
        return 0.0
    candidate_vec = _safe_embed(candidate_text)
    if candidate_vec is None:
        return 0.0
    try:
        return cosine_similarity(query_vec, candidate_vec)
    except Exception:
        return 0.0
 
 
async def retrieve_student_study_context(user_id: str, query: str) -> Dict[str, Any]:
    """
    Search the authenticated student's stored study materials to detect whether they
    have already studied a semantically similar topic, using embedding cosine
    similarity (not keyword/substring matching) to compare the query against each
    candidate item's topic/title. Strictly filters all MongoDB queries by user_id.
    """
    if not query or not query.strip() or not user_id:
        return {**_EMPTY_RESULT, "topic": query}
 
    db = get_db()
    clean_query = query.strip()
    query_vec = _safe_embed(clean_query)
 
    if query_vec is None:
        # Embedding model unavailable - fail safe with "not studied" rather than
        # falling back to a different matching strategy.
        return {**_EMPTY_RESULT, "topic": clean_query}
 
    best_match = None
    best_score = 0.0
 
    # 1. Check Student's Notes
    notes = await db.notes.find({"user_id": user_id}).sort("created_at", -1).to_list(length=100)
    for n in notes:
        topic = n.get("topic", "")
        title = n.get("title", "")
        content = n.get("markdown_content", "")
        score = _similarity(query_vec, f"{topic} {title}".strip())
 
        if score > best_score:
            best_score = score
            best_match = {
                "already_studied": True,
                "topic": topic or title,
                "activity_type": "Notes",
                "date": n.get("created_at", ""),
                "previous_content": content[:1800],
                "title": title,
                "item_id": str(n.get("_id", ""))
            }
 
    # 2. Check Student's Roadmaps
    if best_score < STRONG_MATCH_CUTOFF:
        roadmaps = await db.roadmaps.find({"user_id": user_id}).to_list(length=50)
        for r in roadmaps:
            subject = r.get("subject", "")
            score = _similarity(query_vec, subject)
 
            if score > best_score:
                best_score = score
                levels_summary = ""
                for lvl in r.get("levels", []):
                    mods = [m.get("title", "") for m in lvl.get("modules", [])]
                    levels_summary += f"{lvl.get('level_name')}: {', '.join(mods)}\n"
 
                best_match = {
                    "already_studied": True,
                    "topic": subject,
                    "activity_type": "Roadmap",
                    "date": r.get("created_at", ""),
                    "previous_content": f"Learning Roadmap for {subject}:\n{levels_summary}",
                    "title": f"{subject} Roadmap",
                    "item_id": str(r.get("_id", ""))
                }
 
    # 3. Check Student's Coding Challenges
    if best_score < STRONG_MATCH_CUTOFF:
        codings = await db.coding_challenges.find({"user_id": user_id}).to_list(length=50)
        for c in codings:
            topic = c.get("topic", "")
            score = _similarity(query_vec, topic)
 
            if score > best_score:
                best_score = score
                challenges_desc = "\n".join([f"- {ch.get('title')}: {ch.get('description', '')}" for ch in c.get("challenges", [])[:2]])
                best_match = {
                    "already_studied": True,
                    "topic": topic,
                    "activity_type": "Coding Practice",
                    "date": c.get("created_at", ""),
                    "previous_content": f"Coding challenges studied on {topic}:\n{challenges_desc}",
                    "title": f"{topic} Coding Arena",
                    "item_id": str(c.get("_id", ""))
                }
 
    # 4. Check Student's Quizzes
    if best_score < STRONG_MATCH_CUTOFF:
        quizzes = await db.quizzes.find({"user_id": user_id}).to_list(length=50)
        for q in quizzes:
            topic = q.get("topic", "")
            score = _similarity(query_vec, topic)
 
            if score > best_score:
                best_score = score
                qa_summary = "\n".join([f"Q: {item.get('question_text')}\nExplanation: {item.get('explanation', '')}" for item in q.get("questions", [])[:3]])
                best_match = {
                    "already_studied": True,
                    "topic": topic,
                    "activity_type": "Quiz",
                    "date": q.get("submitted_at") or q.get("created_at", ""),
                    "previous_content": f"Quiz previously taken on {topic} (Score: {q.get('score', 0)}/{q.get('max_score', 5)}):\n{qa_summary}",
                    "title": f"{topic} Quiz",
                    "item_id": str(q.get("_id", ""))
                }
 
    # 5. Check Student's Flashcards
    if best_score < STRONG_MATCH_CUTOFF:
        flashcards = await db.flashcards.find({"user_id": user_id}).to_list(length=50)
        for fc in flashcards:
            topic = fc.get("topic", "")
            score = _similarity(query_vec, topic)
 
            if score > best_score:
                best_score = score
                cards_summary = "\n".join([f"- {c.get('front')}: {c.get('back')}" for c in fc.get("cards", [])[:4]])
                best_match = {
                    "already_studied": True,
                    "topic": topic,
                    "activity_type": "Flashcards",
                    "date": fc.get("created_at", ""),
                    "previous_content": f"Flashcards on {topic}:\n{cards_summary}",
                    "title": f"{topic} Flashcards",
                    "item_id": str(fc.get("_id", ""))
                }
 
    # 6. Check Student's Interviews
    if best_score < STRONG_MATCH_CUTOFF:
        interviews = await db.interviews.find({"user_id": user_id}).to_list(length=50)
        for iv in interviews:
            topic = iv.get("topic", "")
            score = _similarity(query_vec, topic)
 
            if score > best_score:
                best_score = score
                iv_summary = "\n".join([f"Q: {q.get('question')}\nA: {q.get('answer', '')}" for q in iv.get("questions", [])[:2]])
                best_match = {
                    "already_studied": True,
                    "topic": topic,
                    "activity_type": "Interview Prep",
                    "date": iv.get("created_at", ""),
                    "previous_content": f"Interview questions on {topic} ({iv.get('level', 'Intermediate')}):\n{iv_summary}",
                    "title": f"{topic} Interview Prep",
                    "item_id": str(iv.get("_id", ""))
                }
 
    # 7. Check Student's Past Doubt Chats
    if best_score < STRONG_MATCH_CUTOFF:
        doubt_chats = await db.doubt_chats.find({"user_id": user_id}).to_list(length=50)
        for dc in doubt_chats:
            topic = dc.get("topic", "")
            score = _similarity(query_vec, topic)
 
            if score > best_score:
                best_score = score
                chat_summary = "\n".join([f"{m.get('role')}: {m.get('text', '')[:200]}" for m in dc.get("messages", [])[-3:]])
                best_match = {
                    "already_studied": True,
                    "topic": topic,
                    "activity_type": "Doubt Session",
                    "date": dc.get("updated_at", ""),
                    "previous_content": f"Previous doubt session on {topic}:\n{chat_summary}",
                    "title": f"{topic} Doubt Discussion",
                    "item_id": str(dc.get("_id", ""))
                }
 
    if best_match and best_score >= SIMILARITY_THRESHOLD:
        return best_match
 
    return {**_EMPTY_RESULT, "topic": clean_query}
 