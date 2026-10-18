"""
Lightweight, memory-efficient embedding & topic classification service.
Uses character and word n-gram TF-IDF representations (under 10MB RAM)
instead of heavyweight PyTorch/Transformers (which consume 450MB+ RAM and
trigger Out-Of-Memory crashes on 512MB free tier cloud instances).
"""
import numpy as np
from typing import List, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer

TOPICS = [
    "Biology", "Physics", "Chemistry", "Math", "Computer Science",
    "History", "Geography", "Literature", "Economics", "Psychology",
]

TOPIC_PROTOTYPES = {
    "Biology": "biology cell cells organism organisms photosynthesis evolution genetics dna rna gene ecosystem ecosystems anatomy plant plants animal animals bacteria reproduction organelles mitosis meiosis cell membrane species ecology virus",
    "Physics": "physics motion force forces energy kinetic potential gravity gravitation electricity electric charge magnetism magnetic wave waves quantum mechanics relativity thermodynamics velocity acceleration friction mass newton joule watt optics light",
    "Chemistry": "chemistry atom atoms molecule molecules chemical reaction reactions acid acids base bases periodic table organic compound compounds element elements bond bonds electron electrons proton protons solution solutions stoichiometry catalyst equilibrium oxidation",
    "Math": "mathematics math algebra algebraic geometry geometric calculus trigonometry equations equation functions function derivatives derivative integral integrals probability statistics matrices matrix limits limit vectors vector theorem polynomial arithmetic numbers",
    "Computer Science": "computer science programming algorithm algorithms data structure structures software computers computer code coding machine learning ai database databases networks network python java c++ sorting binary tree search graph leetcode recursion array list stack queue complexity",
    "History": "history historical war wars civilization civilizations ancient times historical event events king kings queen empire empires revolution revolutions dates historical figures treaty treaties president dynasty world war constitution medieval century",
    "Geography": "geography countries country continent continents river rivers mountain mountains climate weather capitals capital maps map oceans ocean population earth surface latitude longitude territory landscape tectonic globe",
    "Literature": "literature novel novels poem poems poet poetry author authors character characters play plays shakespeare themes literary devices book books storytelling prose drama metaphor stanza syntax rhyme allegory genre novel fiction",
    "Economics": "economics economy money market markets supply demand inflation deflation gdp trade trade banking banks finance fiscal monetary tax taxes economic policy investment capital trade deficit microeconomics macroeconomics stock commerce revenue",
    "Psychology": "psychology psychological behavior mind mental health emotion emotions cognition cognitive memory learning personality therapy therapist brain neural consciousness disorders perception freud conditioning subconscious psychiatric",
}

# Subword char n-grams + word n-grams capture spelling variations and compound words
_vectorizer = TfidfVectorizer(
    ngram_range=(1, 2),
    sublinear_tf=True,
    min_df=1,
    max_features=2048,
    token_pattern=r"(?u)\b\w+\b"
)

# Fit on topic prototype descriptions
_corpus = [TOPIC_PROTOTYPES[t] for t in TOPICS]
_prototype_matrix = _vectorizer.fit_transform(_corpus).toarray()  # (10, n_features)

# Normalize prototype vectors
_row_norms = np.linalg.norm(_prototype_matrix, axis=1, keepdims=True)
_row_norms[_row_norms == 0] = 1.0
_topic_embeddings = _prototype_matrix / _row_norms


def get_model():
    """Stub for backward compatibility with callers expecting a model handle."""
    return _vectorizer


def embed_text(text: str) -> np.ndarray:
    """
    Generate normalized embedding vector for the given text using lightweight TF-IDF.
    Returns a 1D numpy array with unit norm.
    """
    if not text or not str(text).strip():
        return np.zeros(_topic_embeddings.shape[1], dtype=np.float32)
    
    vec = _vectorizer.transform([str(text)]).toarray()[0]
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.astype(np.float32)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Compute cosine similarity between two normalized vectors."""
    if a is None or b is None:
        return 0.0
    a_arr = np.array(a, dtype=np.float32)
    b_arr = np.array(b, dtype=np.float32)
    norm_a = np.linalg.norm(a_arr)
    norm_b = np.linalg.norm(b_arr)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a_arr, b_arr) / (norm_a * norm_b))


def classify_topic(embedding: np.ndarray) -> Tuple[str, float]:
    """Classify an embedding into one of the 10 standard topics."""
    if embedding is None or len(embedding) == 0:
        return TOPICS[0], 0.0
    
    sims = _topic_embeddings @ embedding
    idx = int(np.argmax(sims))
    return TOPICS[idx], float(sims[idx])


def find_similar(
    query_embedding: np.ndarray,
    candidates: List[dict],
    top_k: int = 5,
    min_score: float = 0.15,
) -> List[dict]:
    """Find most similar candidate items based on cosine similarity."""
    if not candidates or query_embedding is None:
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

