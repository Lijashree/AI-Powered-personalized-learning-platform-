"""Compatibility redirect to app.embeddings."""
from app.embeddings import (
    TOPICS,
    TOPIC_PROTOTYPES,
    get_model,
    embed_text,
    cosine_similarity,
    classify_topic,
    find_similar,
)

__all__ = [
    "TOPICS",
    "TOPIC_PROTOTYPES",
    "get_model",
    "embed_text",
    "cosine_similarity",
    "classify_topic",
    "find_similar",
]

