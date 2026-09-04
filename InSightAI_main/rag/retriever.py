"""Semantic retrieval for the InSightAI chatbot.

Uses the exact embedding model/configuration used by rag/ingest_data.py and
queries the existing Qdrant Cloud collection. This module does not ingest or
upsert anything; ingestion remains the responsibility of ingest_data.py.
"""

import os
from functools import lru_cache
from typing import Any

from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

from .config import COLLECTION_NAME, EMBEDDING_MODEL

TOP_K = int(os.getenv("RAG_TOP_K", "6"))
SCORE_THRESHOLD = float(os.getenv("RAG_SCORE_THRESHOLD", "0.25"))


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    return SentenceTransformer(EMBEDDING_MODEL)


@lru_cache(maxsize=1)
def get_qdrant_client() -> QdrantClient:
    url = os.getenv("QDRANT_URL") 
    api_key = os.getenv("QDRANT_API_KEY")

    if not url:
        raise RuntimeError("Qdrant URL is not configured. Set URL in the backend environment.")
    if not api_key:
        raise RuntimeError("Qdrant API key is not configured. Set api_key or QDRANT_API_KEY.")

    return QdrantClient(url=url, api_key=api_key)


def embed_query(query: str) -> list[float]:
    model = get_embedding_model()
    vector = model.encode(query, normalize_embeddings=True)
    return vector.tolist()


def retrieve_documents(query: str, *, top_k: int = TOP_K) -> list[dict[str, Any]]:
    """Return the most semantically relevant documents from the existing KB."""
    if not query.strip():
        return []

    client = get_qdrant_client()
    vector = embed_query(query)

    result = client.query_points(
        collection_name=COLLECTION_NAME,
        query=vector,
        limit=top_k,
        with_payload=True,
        with_vectors=False,
    )

    documents: list[dict[str, Any]] = []
    for point in result.points:
        score = float(point.score)
        if score < SCORE_THRESHOLD:
            continue

        payload = point.payload or {}
        documents.append(
            {
                "score": score,
                "document_type": payload.get("document_type"),
                "movement_id": payload.get("movement_id"),
                "region": payload.get("region"),
                "category": payload.get("category"),
                "date_start": payload.get("date_start"),
                "date_end": payload.get("date_end"),
                "text": payload.get("text", ""),
            }
        )

    return documents
