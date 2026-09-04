"""
InSightAI knowledge-base ingestion.

Reads the outputs of the pipeline stages and upserts them into Qdrant as
retrievable documents, embedded locally with a sentence-transformers model
(no per-call embedding API cost).

Pipeline stage -> file -> real schema this script depends on:

  calculate_kpis.py   -> data/kpi_output.json
      {
        "flagged_movements": [
          {
            "region": str, "product_category": str,
            "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD",
            "direction": "drop" | "spike",
            "peak_abs_zscore": float,
            "avg_units_in_window": float, "avg_units_trailing_baseline": float,
            "avg_revenue_in_window": float, "avg_revenue_trailing_baseline": float,
            "revenue_deviation_pct": float,
            "n_days_flagged": int, "history_days_at_start": int,
            "diagnostics": {
              "inventory": {...}, "logistics": {...}, "pricing": {...},
              "web_traffic": {...}, "competitor": {...}, "promotions": {...},
              "marketing": {"weeks": [...]}   # optional
            },
            "diagnostic_hints": [str, ...]
          }, ...
        ],
        "kpi_table": [...], "marketing_weekly": [...], "data_quality": {...}
      }
      -> there is NO "insight_id" field anywhere; a movement is uniquely
         identified by (region, product_category, start_date, end_date).

  integrator.py        -> data/unstructured_evidence.json
      {
        "evidence_groups": [
          {
            "signal_theme": str, "region": str, "product_category": str,
            "observation_count": int,
            "date_range": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"},
            "source_distribution": {...}, "channel_distribution": {...},
            "severity_distribution": {...}, "tag_counts": {...},
            "daily_observation_counts": {...}, "observation_trend": str,
            "evidence_examples": [
              {"source_id": str, "date": str, "source_type": str,
               "raw_input": str, "signal": str, "evidence": str}, ...
            ]
          }, ...
        ]
      }
      -> evidence lives two levels deep (group -> examples), not as a flat
         list of records with their own top-level source_id/date.

  investigation.py     -> data/investigation_output.json
      {
        "investigations": [
          {
            "movement": { ...same shape as a flagged_movements entry... },
            "investigation": {
              "summary": str, "conclusion": str, "overall_confidence": float,
              "hypotheses": [
                {"rank": int, "hypothesis": str, "confidence": float,
                 "supporting_evidence": [str], "contradicting_evidence": [str],
                 "missing_evidence": [str], "next_check": str}, ...
              ]
            }
            # OR, if the model output failed validation:
            # "investigation": {"parse_error": str, "raw_response": str}
          }, ...
        ]
      }

  recommendations.py          -> data/recommendation_output.json
      The current generator writes {"movements": [{"movement": {...},
      "recommendations": [{"action": str, "why": str, ...}, ...]}]}.
      The ingestion adapter also accepts the older top-level
      {"recommendations": [...]} shape.

Everything is linked by a deterministic `movement_id` derived from
(region, product_category, start_date, end_date), rather than by a field
that doesn't exist in the data. That lets you filter Qdrant by movement_id
to pull the KPI movement, its evidence, its investigation, and its
recommendation together.
"""

import os
import json
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Optional

from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct


# ============================================================
# CONFIG
# ============================================================

DATA_DIR = Path("./data")

KPI_FILE = DATA_DIR / "kpi_output.json"
EVIDENCE_FILE = DATA_DIR / "unstructured_evidence.json"
INVESTIGATION_FILE = DATA_DIR / "investigation_output.json"
RECOMMENDATION_FILE = DATA_DIR / "recommendation_output.json"

COLLECTION_NAME = "insightai_knowledge"

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384

BATCH_SIZE = 64

MAX_TEXT_CHARS = 1500

# Cap how many evidence examples / hypotheses we embed per group so one
# very active signal theme doesn't dominate the collection.
MAX_EVIDENCE_EXAMPLES_PER_GROUP = 10
MAX_HYPOTHESES_PER_INVESTIGATION = 5

print(f"[INFO] Loading embedding model '{EMBEDDING_MODEL}'...")
embedding_model = SentenceTransformer(EMBEDDING_MODEL)
assert embedding_model.get_sentence_embedding_dimension() == EMBEDDING_DIMENSION, (
    "EMBEDDING_DIMENSION doesn't match the loaded model's output size — "
    "update EMBEDDING_DIMENSION if you changed EMBEDDING_MODEL."
)

qdrant_client = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
)

def load_json(path: Path) -> Any:
    if not path.exists():
        print(f"[WARNING] Missing file: {path}")
        return None

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def safe_str(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    return str(value)

def truncate(text: str, limit: int = MAX_TEXT_CHARS) -> str:
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0] + " …[truncated]"

def stable_id(text: str) -> int:
    """Qdrant point IDs must be int or UUID; derive a deterministic int."""
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return int(digest[:15], 16)

def movement_id(region: Optional[str], product_category: Optional[str],
                 start_date: Optional[str], end_date: Optional[str]) -> str:
    parts = [safe_str(region), safe_str(product_category), safe_str(start_date), safe_str(end_date)]
    return "::".join(parts)


def movement_id_from_dict(movement: Dict[str, Any]) -> str:
    return movement_id(
        movement.get("region"),
        movement.get("product_category"),
        movement.get("start_date"),
        movement.get("end_date"),
    )


# ============================================================
# DOCUMENT CREATION
# ============================================================

def make_document(
    *,
    document_type: str,
    movement_id: Optional[str],
    region: Optional[str],
    category: Optional[str],
    date_start: Optional[str],
    date_end: Optional[str],
    text: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:

    text = truncate(text.strip())

    if not text:
        return None

    payload = {
        "document_type": document_type,
        "movement_id": movement_id,
        "region": region,
        "category": category,
        "date_start": date_start,
        "date_end": date_end,
        "text": text,
    }

    if metadata:
        payload.update(metadata)

    payload["document_id"] = hashlib.sha256(text.encode("utf-8")).hexdigest()

    return {
        "id": stable_id(payload["document_id"]),
        "text": text,
        "payload": payload,
    }


# ============================================================
# KPI / MOVEMENT DOCUMENTS  (source: kpi_output.json -> flagged_movements)
# ============================================================

def summarize_diagnostics(diagnostics: Dict[str, Any]) -> str:
    """
    Turn the deterministic cross-domain diagnostics into a short, readable
    summary instead of dumping the raw nested JSON into the embedding text.
    """
    lines = []

    for name, block in diagnostics.items():
        if name == "marketing":
            weeks = block.get("weeks", []) if isinstance(block, dict) else []
            if weeks:
                lines.append(f"marketing: {len(weeks)} week(s) of spend/impression data around the movement")
            continue

        if not isinstance(block, dict):
            continue

        baseline = block.get("baseline_14d") or {}
        during = block.get("movement") or {}

        shared_keys = [
            k for k in during.keys()
            if k in baseline and isinstance(during.get(k), (int, float))
        ]

        if not shared_keys:
            continue

        comparisons = ", ".join(
            f"{k}: baseline={baseline[k]:.3g} -> during={during[k]:.3g}"
            for k in shared_keys[:5]
        )
        lines.append(f"{name}: {comparisons}")

    return "\n".join(lines) if lines else "No comparable baseline/movement diagnostic data available."


def build_movement_text(movement: Dict[str, Any]) -> str:
    lines = [
        f"KPI movement: {movement.get('direction', 'unknown').upper()} in "
        f"{safe_str(movement.get('region'))} / {safe_str(movement.get('product_category'))}",
        f"Period: {safe_str(movement.get('start_date'))} to {safe_str(movement.get('end_date'))} "
        f"({movement.get('n_days_flagged', '?')} flagged day(s), "
        f"{movement.get('history_days_at_start', '?')} history days at start)",
        f"Peak |z-score|: {movement.get('peak_abs_zscore')}",
        f"Units: window avg {movement.get('avg_units_in_window')} vs "
        f"trailing baseline {movement.get('avg_units_trailing_baseline')}",
        f"Revenue: window avg {movement.get('avg_revenue_in_window')} vs "
        f"trailing baseline {movement.get('avg_revenue_trailing_baseline')} "
        f"({movement.get('revenue_deviation_pct')}% deviation)",
    ]

    hints = movement.get("diagnostic_hints") or []
    if hints:
        lines.append(f"Diagnostic hints: {', '.join(hints)}")

    diagnostics = movement.get("diagnostics") or {}
    if diagnostics:
        lines.append("Cross-domain diagnostics:")
        lines.append(summarize_diagnostics(diagnostics))

    return "\n".join(lines)


def build_kpi_documents(kpi_data: Any) -> List[Dict[str, Any]]:
    documents = []

    if not kpi_data:
        return documents

    movements = kpi_data.get("flagged_movements", [])

    for movement in movements:
        region = movement.get("region")
        category = movement.get("product_category")
        start = movement.get("start_date")
        end = movement.get("end_date")
        mid = movement_id(region, category, start, end)

        doc = make_document(
            document_type="kpi_movement",
            movement_id=mid,
            region=region,
            category=category,
            date_start=start,
            date_end=end,
            text=build_movement_text(movement),
            metadata={
                "source": "kpi_output.json",
                "direction": movement.get("direction"),
                "peak_abs_zscore": movement.get("peak_abs_zscore"),
                "diagnostic_hints": movement.get("diagnostic_hints", []),
            },
        )

        if doc:
            documents.append(doc)

    return documents


# ============================================================
# UNSTRUCTURED EVIDENCE DOCUMENTS
# (source: unstructured_evidence.json -> evidence_groups[].evidence_examples)
# ============================================================

def build_evidence_group_text(group: Dict[str, Any]) -> str:
    date_range = group.get("date_range", {})
    lines = [
        f"Unstructured evidence group: '{safe_str(group.get('signal_theme'))}' in "
        f"{safe_str(group.get('region'))} / {safe_str(group.get('product_category'))}",
        f"Observed {group.get('observation_count')} time(s) between "
        f"{safe_str(date_range.get('start'))} and {safe_str(date_range.get('end'))}, "
        f"trend: {safe_str(group.get('observation_trend'))}",
    ]

    if group.get("source_distribution"):
        lines.append(f"Source types: {safe_str(group['source_distribution'])}")
    if group.get("channel_distribution"):
        lines.append(f"Channels: {safe_str(group['channel_distribution'])}")
    if group.get("severity_distribution"):
        lines.append(f"Severity: {safe_str(group['severity_distribution'])}")
    if group.get("tag_counts"):
        lines.append(f"Tags: {safe_str(group['tag_counts'])}")

    return "\n".join(lines)


def build_evidence_documents(evidence_data: Any) -> List[Dict[str, Any]]:
    documents = []

    if not evidence_data:
        return documents

    groups = evidence_data.get("evidence_groups", [])

    for group in groups:
        region = group.get("region")
        category = group.get("product_category")
        date_range = group.get("date_range", {})
        date_start = date_range.get("start")
        date_end = date_range.get("end")
        mid = movement_id(region, category, date_start, date_end)
        signal_theme = group.get("signal_theme")

        # One roll-up document per evidence group.
        group_doc = make_document(
            document_type="unstructured_evidence_group",
            movement_id=mid,
            region=region,
            category=category,
            date_start=date_start,
            date_end=date_end,
            text=build_evidence_group_text(group),
            metadata={
                "source": "unstructured_evidence.json",
                "signal_theme": signal_theme,
                "observation_count": group.get("observation_count"),
                "observation_trend": group.get("observation_trend"),
            },
        )
        if group_doc:
            documents.append(group_doc)

        # One document per individual evidence example, so specific
        # source-attributed claims stay independently retrievable.
        examples = group.get("evidence_examples", [])[:MAX_EVIDENCE_EXAMPLES_PER_GROUP]

        for example in examples:
            text_parts = [
                f"Evidence example for signal '{safe_str(signal_theme)}' "
                f"in {safe_str(region)} / {safe_str(category)}",
                f"Source: {safe_str(example.get('source_type'))} "
                f"(source_id={safe_str(example.get('source_id'))}), date={safe_str(example.get('date'))}",
            ]
            if example.get("signal"):
                text_parts.append(f"Signal: {safe_str(example['signal'])}")
            if example.get("evidence"):
                text_parts.append(f"Evidence: {safe_str(example['evidence'])}")
            if example.get("raw_input"):
                text_parts.append(f"Raw input: {safe_str(example['raw_input'])}")

            example_doc = make_document(
                document_type="unstructured_evidence_example",
                movement_id=mid,
                region=region,
                category=category,
                date_start=example.get("date"),
                date_end=example.get("date"),
                text="\n".join(text_parts),
                metadata={
                    "source": "unstructured_evidence.json",
                    "signal_theme": signal_theme,
                    "source_id": example.get("source_id"),
                    "source_type": example.get("source_type"),
                },
            )
            if example_doc:
                documents.append(example_doc)

    return documents


# ============================================================
# INVESTIGATION DOCUMENTS
# (source: investigation_output.json -> investigations[].{movement, investigation})
# ============================================================

def build_investigation_documents(investigation_data: Any) -> List[Dict[str, Any]]:
    documents = []

    if not investigation_data:
        return documents

    entries = investigation_data.get("investigations", [])

    for entry in entries:
        movement = entry.get("movement", {})
        investigation = entry.get("investigation", {})

        region = movement.get("region")
        category = movement.get("product_category")
        start = movement.get("start_date")
        end = movement.get("end_date")
        mid = movement_id(region, category, start, end)

        if "parse_error" in investigation:
            # The model's output failed validation; keep a lightweight,
            # bounded record of the failure rather than embedding the raw
            # (unvalidated) model response.
            doc = make_document(
                document_type="investigation_parse_error",
                movement_id=mid,
                region=region,
                category=category,
                date_start=start,
                date_end=end,
                text=(
                    f"Investigation for {safe_str(region)} / {safe_str(category)} "
                    f"({safe_str(start)} to {safe_str(end)}) failed to parse: "
                    f"{safe_str(investigation.get('parse_error'))}"
                ),
                metadata={"source": "investigation_output.json"},
            )
            if doc:
                documents.append(doc)
            continue

        summary_text = "\n".join([
            f"Investigation summary for {safe_str(region)} / {safe_str(category)} "
            f"({safe_str(start)} to {safe_str(end)})",
            f"Conclusion: {safe_str(investigation.get('conclusion'))} "
            f"(overall confidence: {investigation.get('overall_confidence')})",
            f"Summary: {safe_str(investigation.get('summary'))}",
        ])

        summary_doc = make_document(
            document_type="investigation_summary",
            movement_id=mid,
            region=region,
            category=category,
            date_start=start,
            date_end=end,
            text=summary_text,
            metadata={
                "source": "investigation_output.json",
                "conclusion": investigation.get("conclusion"),
                "overall_confidence": investigation.get("overall_confidence"),
            },
        )
        if summary_doc:
            documents.append(summary_doc)

        hypotheses = investigation.get("hypotheses", [])[:MAX_HYPOTHESES_PER_INVESTIGATION]

        for hypothesis in hypotheses:
            text_parts = [
                f"Hypothesis #{hypothesis.get('rank')} for {safe_str(region)} / {safe_str(category)} "
                f"({safe_str(start)} to {safe_str(end)}): {safe_str(hypothesis.get('hypothesis'))}",
                f"Confidence: {hypothesis.get('confidence')}",
            ]
            if hypothesis.get("supporting_evidence"):
                text_parts.append(f"Supporting evidence: {safe_str(hypothesis['supporting_evidence'])}")
            if hypothesis.get("contradicting_evidence"):
                text_parts.append(f"Contradicting evidence: {safe_str(hypothesis['contradicting_evidence'])}")
            if hypothesis.get("missing_evidence"):
                text_parts.append(f"Missing evidence: {safe_str(hypothesis['missing_evidence'])}")
            if hypothesis.get("next_check"):
                text_parts.append(f"Next check: {safe_str(hypothesis['next_check'])}")

            hyp_doc = make_document(
                document_type="investigation_hypothesis",
                movement_id=mid,
                region=region,
                category=category,
                date_start=start,
                date_end=end,
                text="\n".join(text_parts),
                metadata={
                    "source": "investigation_output.json",
                    "rank": hypothesis.get("rank"),
                    "confidence": hypothesis.get("confidence"),
                },
            )
            if hyp_doc:
                documents.append(hyp_doc)

    return documents


# ============================================================
# RECOMMENDATION DOCUMENTS
#
# NOTE: no generator for recommendation_output.json was supplied, so this
# assumes it mirrors investigation_output.json's shape:
#   {"recommendations": [{"movement": {...}, "recommendations": [
#       {"action": str, "rationale": str, "priority": str}, ...]}]}
# Update this function once the real schema is confirmed.
# ============================================================

def build_recommendation_documents(recommendation_data: Any) -> List[Dict[str, Any]]:
    documents = []

    if not recommendation_data:
        return documents

    entries = recommendation_data.get("recommendations") or recommendation_data.get("movements", [])

    for entry in entries:
        movement = entry.get("movement", {})
        region = movement.get("region")
        category = movement.get("product_category")
        start = movement.get("start_date")
        end = movement.get("end_date")
        mid = movement_id(region, category, start, end)

        recommendation_block = entry.get("recommendation", {})
        actions = (
            entry.get("recommendations")
            or recommendation_block.get("recommendations", [])
        )

        for i, action in enumerate(actions):
            text_parts = [
                f"Recommendation for {safe_str(region)} / {safe_str(category)} "
                f"({safe_str(start)} to {safe_str(end)}): {safe_str(action.get('action'))}",
            ]
            rationale = action.get("rationale") or action.get("why")
            if rationale:
                text_parts.append(f"Rationale: {safe_str(rationale)}")
            if action.get("priority"):
                text_parts.append(f"Priority: {safe_str(action['priority'])}")
            elif action.get("rank") is not None:
                text_parts.append(f"Rank: {safe_str(action['rank'])}")
            if action.get("feasibility"):
                text_parts.append(f"Feasibility: {safe_str(action['feasibility'])}")
            if action.get("expected_business_effect"):
                text_parts.append(
                    f"Expected business effect: {safe_str(action['expected_business_effect'])}"
                )

            doc = make_document(
                document_type="recommendation",
                movement_id=mid,
                region=region,
                category=category,
                date_start=start,
                date_end=end,
                text="\n".join(text_parts),
                metadata={
                    "source": "recommendation_output.json",
                    "priority": action.get("priority"),
                    "rank": action.get("rank"),
                    "action_id": action.get("action_id"),
                    "feasibility": action.get("feasibility"),
                },
            )
            if doc:
                documents.append(doc)

    return documents


# ============================================================
# EMBEDDINGS
# ============================================================

def create_embeddings(texts: List[str]) -> List[List[float]]:
    # normalize_embeddings=True makes cosine similarity equivalent to a dot
    # product, which is what Qdrant's Distance.COSINE expects/optimizes for.
    embeddings = embedding_model.encode(
        texts,
        batch_size=BATCH_SIZE,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return embeddings.tolist()


# ============================================================
# QDRANT
# ============================================================

def ensure_collection():
    collections = qdrant_client.get_collections()
    names = {collection.name for collection in collections.collections}

    if COLLECTION_NAME not in names:
        qdrant_client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=EMBEDDING_DIMENSION,
                distance=Distance.COSINE,
            ),
        )
        print(f"[INFO] Created collection: {COLLECTION_NAME}")


def upload_documents(documents: List[Dict[str, Any]]):
    for start in range(0, len(documents), BATCH_SIZE):
        batch = documents[start:start + BATCH_SIZE]
        texts = [document["text"] for document in batch]

        try:
            embeddings = create_embeddings(texts)
        except Exception as e:
            print(f"[ERROR] Embedding batch {start}-{start + len(batch)} failed: {e}")
            raise

        points = [
            PointStruct(id=document["id"], vector=embedding, payload=document["payload"])
            for document, embedding in zip(batch, embeddings)
        ]

        qdrant_client.upsert(collection_name=COLLECTION_NAME, points=points)
        print(f"[INFO] Uploaded {start + len(batch)}/{len(documents)}")


# ============================================================
# MAIN
# ============================================================

def main():
    print("[INFO] Loading pipeline outputs...")

    kpi_data = load_json(KPI_FILE)
    evidence_data = load_json(EVIDENCE_FILE)
    investigation_data = load_json(INVESTIGATION_FILE)
    recommendation_data = load_json(RECOMMENDATION_FILE)

    documents = []
    documents.extend(build_kpi_documents(kpi_data))
    documents.extend(build_evidence_documents(evidence_data))
    documents.extend(build_investigation_documents(investigation_data))
    documents.extend(build_recommendation_documents(recommendation_data))

    print(f"[INFO] Created {len(documents)} documents")
    for doc_type in sorted({d["payload"]["document_type"] for d in documents}):
        count = sum(1 for d in documents if d["payload"]["document_type"] == doc_type)
        print(f"         - {doc_type}: {count}")

    if not documents:
        raise RuntimeError("No documents were created.")

    ensure_collection()
    upload_documents(documents)

    print("[SUCCESS] InSightAI knowledge base updated.")


if __name__ == "__main__":
    main()