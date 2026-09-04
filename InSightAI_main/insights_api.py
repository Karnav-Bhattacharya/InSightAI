"""InSightAI FastAPI backend.

The chatbot has two paths:

1. Preset dashboard questions -> fixed, pre-generated answers.
2. Free-form questions -> semantic retrieval from the existing Qdrant Cloud
   collection, followed by grounded LLM synthesis.

Ingestion is intentionally NOT performed here. Run rag/ingest_data.py when
pipeline outputs change.
"""

import json
import os
from pathlib import Path
from typing import Any

import httpx

from dotenv import load_dotenv

load_dotenv()

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rag.config import COLLECTION_NAME
from rag.retriever import retrieve_documents

BASE_DIR = Path(__file__).resolve().parent
PRESET_FILE = BASE_DIR / "rag" / "preset_answers.json"


def load_presets() -> dict[str, dict[str, Any]]:
    if not PRESET_FILE.exists():
        raise RuntimeError(f"Preset answer file not found: {PRESET_FILE}")
    with PRESET_FILE.open("r", encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, dict):
        raise RuntimeError("rag/preset_answers.json must contain an object")
    return data


PRESETS = load_presets()

app = FastAPI(title="InSightAI Chat API", version="1.0.0")
router = APIRouter()

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class ChatTurn(BaseModel):
    sender: str = Field(pattern="^(user|ai)$")
    text: str = Field(min_length=1, max_length=8000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    role: str = "Manager"
    current_insight_id: int | None = None
    preset_id: str | None = None
    history: list[ChatTurn] = Field(default_factory=list, max_length=12)


class ChatResponse(BaseModel):
    response: str
    source: str = "semantic_rag"
    matched_insight_id: int | None = None
    matched_insight_title: str | None = None
    updated_context_insight_id: int | None = None
    suggested_questions: list[str] = Field(default_factory=list)
    retrieved_documents: int = 0


def normalize(text: str) -> str:
    return " ".join(text.lower().strip().split())


def find_preset_for_request(request: ChatRequest) -> dict[str, Any] | None:
    """Resolve only known dashboard preset questions; never fuzzy-match here."""
    if request.preset_id and request.preset_id in PRESETS:
        return PRESETS[request.preset_id]

    # The current UI's card-level prompt is "Tell me more about <title>".
    # Exact title matching keeps preset behavior deterministic.
    query = normalize(request.message)
    prefix = "tell me more about "
    if query.startswith(prefix):
        title = query[len(prefix):].strip()
        for preset in PRESETS.values():
            if normalize(preset["question"]) == query:
                return preset
            if normalize(preset["question"][len(prefix):]) == title:
                return preset

    return None


def get_insight_context(insight_id: int | None) -> str:
    if insight_id is None:
        return ""
    preset = PRESETS.get(f"manager:{insight_id}:overview")
    if not preset:
        return ""
    return (
        f"Active dashboard insight: {preset['question'][len('Tell me more about '):]}.\n"
        f"Dashboard context:\n{preset['answer']}"
    )


def find_dashboard_insight_id(message: str, current_insight_id: int | None = None) -> int | None:
    """Resolve an obvious dashboard topic to one of the five Manager insights.

    This is only used for conversation context; answer generation still comes
    from Qdrant retrieval for non-preset questions.
    """
    query = normalize(message)

    if current_insight_id is not None and current_insight_id in {11, 12, 13, 14, 15}:
        return current_insight_id

    best_id = None
    best_score = 0
    for preset in PRESETS.values():
        insight_id = int(preset["insight_id"])
        title = normalize(preset["question"][len("Tell me more about "):])
        title_tokens = [token for token in title.split() if len(token) > 3]

        score = 0
        if title in query:
            score += 100
        score += sum(1 for token in title_tokens if token in query) * 5

        if score > best_score:
            best_score = score
            best_id = insight_id

    return best_id if best_score >= 10 else None


def build_rag_query(request: ChatRequest) -> str:
    active_context = get_insight_context(request.current_insight_id)
    if active_context:
        return f"{active_context}\n\nManager's current question: {request.message}"
    return request.message


def build_context(documents: list[dict[str, Any]]) -> str:
    blocks = []
    for index, doc in enumerate(documents, start=1):
        blocks.append(
            "\n".join(
                [
                    f"[Document {index}]",
                    f"Type: {doc.get('document_type') or 'unknown'}",
                    f"Region: {doc.get('region') or 'unknown'}",
                    f"Category: {doc.get('category') or 'unknown'}",
                    f"Date: {doc.get('date_start') or '?'} to {doc.get('date_end') or '?' }",
                    f"Relevance score: {doc.get('score', 0):.4f}",
                    f"Content: {doc.get('text', '')}",
                ]
            )
        )
    return "\n\n".join(blocks)


def generate_grounded_answer(
    *,
    question: str,
    history: list[ChatTurn],
    documents: list[dict[str, Any]],
) -> str:
    """Send retrieved context to the Qwen model running on Modal."""
    modal_url = os.getenv("MODAL_CHAT_URL")
    if not modal_url:
        raise RuntimeError("MODAL_CHAT_URL is not configured")

    headers = {"Content-Type": "application/json"}
    modal_token = os.getenv("MODAL_PROXY_TOKEN")
    if modal_token:
        headers["Authorization"] = f"Bearer {modal_token}"

    payload = {
        "question": question,
        "history": [turn.model_dump() for turn in history[-8:]],
        "context": build_context(documents),
    }

    timeout = float(os.getenv("MODAL_CHAT_TIMEOUT_SECONDS", "120"))
    with httpx.Client(timeout=timeout) as client:
        response = client.post(modal_url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()

    if data.get("error"):
        raise RuntimeError(str(data["error"]))

    text = str(data.get("response", "")).strip()
    if not text:
        raise RuntimeError("Modal Qwen endpoint returned an empty response")
    return text


@router.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "insightai-chat",
        "collection": COLLECTION_NAME,
        "preset_count": len(PRESETS),
    }


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    if request.role not in {"HR", "Manager", "Executive"}:
        raise HTTPException(
            status_code=403,
            detail="The chatbot is unavailable for this role.",
        )

    preset = find_preset_for_request(request)
    if preset:
        insight_id = int(preset["insight_id"])
        title = preset["question"][len("Tell me more about "):]
        return ChatResponse(
            response=preset["answer"],
            source="preset",
            matched_insight_id=insight_id,
            matched_insight_title=title,
            updated_context_insight_id=insight_id,
            suggested_questions=[
                "Why did this happen?",
                "What should we do?",
                "What is the business risk if ignored?",
            ],
            retrieved_documents=0,
        )

    try:
        matched_insight_id = find_dashboard_insight_id(request.message, request.current_insight_id)
        rag_request = request.model_copy(update={"current_insight_id": matched_insight_id})
        rag_query = build_rag_query(rag_request)
        documents = retrieve_documents(rag_query)

        if not documents:
            return ChatResponse(
                response=(
                    "I don't have enough grounded information in the available "
                    "business data to answer that confidently. Try asking about "
                    "a specific dashboard update, region, category, cause, risk, "
                    "or recommended action."
                ),
                source="semantic_rag_no_context",
                updated_context_insight_id=matched_insight_id,
                suggested_questions=[
                    "Tell me more about the current insight",
                    "Why did this happen?",
                    "What should we do?",
                ],
                retrieved_documents=0,
            )

        answer = generate_grounded_answer(
            question=request.message,
            history=request.history,
            documents=documents,
        )

        return ChatResponse(
            response=answer,
            source="semantic_rag",
            matched_insight_id=matched_insight_id,
            matched_insight_title=(
                PRESETS.get(f"manager:{matched_insight_id}:overview", {}).get("question", "")
                .replace("Tell me more about ", "") or None
            ),
            updated_context_insight_id=matched_insight_id,
            suggested_questions=[
                "What should we do next?",
                "What is the business risk if ignored?",
                "Show me the supporting evidence.",
            ],
            retrieved_documents=len(documents),
        )

    except HTTPException:
        raise
    except Exception as error:
        # Do not leak provider credentials or internal stack traces to the UI.
        print(f"[CHAT ERROR] {type(error).__name__}: {error}")
        raise HTTPException(
            status_code=503,
            detail="Chat service is temporarily unavailable. Check the backend configuration and try again.",
        ) from error


app.include_router(router)
