"""Sentence-transformers embedding service with lazy loading."""
import threading
import numpy as np
from typing import List, Tuple

_model = None
_model_lock = threading.Lock()
_topic_embeddings = None

TOPICS = [
    "Biology", "Physics", "Chemistry", "Math", "Computer Science",
    "History", "Geography", "Literature", "Economics", "Psychology",
]

TOPIC_PROTOTYPES = {
    "Biology": "Biology questions about cells, organisms, photosynthesis, evolution, genetics, DNA, ecosystems, anatomy, plants and animals.",
    "Physics": "Physics questions about motion, forces, energy, gravity, electricity, magnetism, waves, quantum mechanics, relativity, thermodynamics.",
    "Chemistry": "Chemistry questions about atoms, molecules, chemical reactions, acids, bases, periodic table, organic compounds, elements, bonds.",
    "Math": "Mathematics questions about algebra, geometry, calculus, trigonometry, equations, functions, derivatives, integrals, probability, statistics.",
    "Computer Science": "Computer science questions about programming, algorithms, data structures, software, computers, code, machine learning, databases, networks.",
    "History": "History questions about wars, civilizations, ancient times, historical events, kings, empires, revolutions, dates and historical figures.",
    "Geography": "Geography questions about countries, continents, rivers, mountains, climate, capitals, maps, oceans, population and earth's surface.",
    "Literature": "Literature questions about novels, poems, authors, characters, plays, Shakespeare, themes, literary devices, books and storytelling.",
    "Economics": "Economics questions about money, markets, supply and demand, inflation, GDP, trade, banks, finance, taxes and economic systems.",
    "Psychology": "Psychology questions about behavior, mind, mental health, emotions, cognition, memory, learning, personality, therapy and the brain.",
}


def get_model():
    global _model, _topic_embeddings
    if _model is not None:
        return _model
    with _model_lock:
        if _model is None:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
            proto_texts = [TOPIC_PROTOTYPES[t] for t in TOPICS]
            _topic_embeddings = _model.encode(
                proto_texts, normalize_embeddings=True, convert_to_numpy=True
            )
    return _model


def embed_text(text: str) -> np.ndarray:
    model = get_model()
    vec = model.encode([text], normalize_embeddings=True, convert_to_numpy=True)[0]
    return vec


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b))


def classify_topic(embedding: np.ndarray) -> Tuple[str, float]:
    get_model()
    sims = _topic_embeddings @ embedding
    idx = int(np.argmax(sims))
    return TOPICS[idx], float(sims[idx])


def find_similar(
    query_embedding: np.ndarray,
    candidates: List[dict],
    top_k: int = 5,
    min_score: float = 0.3,
) -> List[dict]:
    if not candidates:
        return []
    results = []
    for c in candidates:
        emb = c.get("embedding")
        if not emb:
            continue
        score = cosine_similarity(query_embedding, np.array(emb, dtype=np.float32))
        if score >= min_score:
            results.append({**{k: v for k, v in c.items() if k != "embedding"}, "similarity": round(score, 4)})
    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results[:top_k]
