from qdrant_client import QdrantClient

from qdrant_client.models import Filter, FilterSelector
import os

client = QdrantClient(
    url=os.getenv("QDRANT_URL"),
)

client.delete(
    collection_name="insightai_knowledge",
    points_selector=FilterSelector(
        filter=Filter()
    ),
    wait=True,
)