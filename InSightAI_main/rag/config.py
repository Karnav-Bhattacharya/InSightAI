"""Shared RAG configuration.

Keep these values in one place so ingestion and retrieval use exactly the same
collection and embedding model without importing the ingestion script.
"""

import os

COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "insightai_knowledge")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
EMBEDDING_DIMENSION = 384
