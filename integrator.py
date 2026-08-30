
import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path


# ============================================================================
# CONFIG
# ============================================================================

ROOT = Path(__file__).parent

RAW_DATA_PATH = ROOT / "data" / "raw" / "unstructured_data.jsonl"
SLM_OUTPUT_PATH = ROOT / "data" / "slm_output.json"
OUTPUT_PATH = ROOT / "data" / "unstructured_evidence.json"


# ============================================================================
# LOADERS
# ============================================================================


def load_json(path):
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_jsonl(path):
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    records = []

    with open(path, "r", encoding="utf-8") as f:
        for line_number, line in enumerate(f, start=1):

            line = line.strip()

            if not line:
                continue

            try:
                records.append(json.loads(line))
            except json.JSONDecodeError as e:
                raise ValueError(
                    f"Invalid JSON on line {line_number} "
                    f"of {path}: {e}"
                )

    return records


# ============================================================================
# DATE HELPERS
# ============================================================================


def parse_date(value):
    return datetime.strptime(value, "%Y-%m-%d").date()


# ============================================================================
# NORMALIZE SLM OUTPUT
# ============================================================================


def get_slm_records(slm_data):
    """
    Supports the expected V1 structure:

    {
        "results": [
            {...},
            {...}
        ]
    }

    Also supports a plain list for convenience.
    """

    if isinstance(slm_data, list):
        return slm_data

    if isinstance(slm_data, dict):

        if "results" in slm_data:
            return slm_data["results"]

        # Optional compatibility with a future schema.
        if "extractions" in slm_data:
            return slm_data["extractions"]

    raise ValueError(
        "SLM output must contain a 'records' or 'extractions' list."
    )


# ============================================================================
# VALIDATION
# ============================================================================


def validate_slm_record(record):
    """
    Validate only fields the integrator actually needs.

    The SLM can have additional fields without breaking the integrator.
    """

    required = {
        "source_id",
        "signal_theme",
    }

    missing = required - record.keys()

    if missing:
        raise ValueError(
            f"SLM record missing fields: {sorted(missing)}"
        )


# ============================================================================
# JOIN SOURCE DATA + SLM DATA
# ============================================================================


def build_joined_records(raw_records, slm_records):
    """
    Join the original unstructured record with its SLM extraction.

    source_id is the stable key.
    """

    raw_by_id = {
        record["source_id"]: record
        for record in raw_records
    }

    joined = []

    for slm in slm_records:

        source_id = slm.get("source_id")

        if not source_id:
            raise ValueError(
                "SLM record is missing source_id."
            )

        raw = raw_by_id.get(source_id)

        if raw is None:
            print(
                f"WARNING: SLM record {source_id} "
                f"has no matching raw record."
            )
            continue

        # ------------------------------------------------------------
        # SLM extraction is nested inside slm_extraction.
        # ------------------------------------------------------------

        extraction = slm.get("slm_extraction")

        # Invalid SLM output = no usable signal.
        if not isinstance(extraction, dict):
            extraction = {}

        joined.append({
            "source_id": source_id,

            "date": raw["date"],
            "region": raw["region"],
            "product_category": raw["product_category"],
            "source_type": raw["source_type"],
            "channel": raw["channel"],
            "raw_input": raw["raw_input"],

            "signal_theme": extraction.get(
                "signal_theme"
            ),

            "signal": extraction.get(
                "signal"
            ),

            "severity": extraction.get(
                "severity"
            ),

            "evidence": extraction.get(
                "evidence"
            ),

            "tags": extraction.get(
                "tags",
                []
            ),
        })

    return joined


# ============================================================================
# GROUPING
# ============================================================================


def make_group_key(record):
    """
    Evidence groups are defined by:

        signal_theme
        region
        product_category
    """

    return (
        record.get("signal_theme"),
        record.get("region"),
        record.get("product_category"),
    )


# ============================================================================
# TREND CALCULATION
# ============================================================================


def calculate_trend(daily_counts):
    """
    Calculate a simple evidence-volume trend.

    IMPORTANT:
    This is NOT a business KPI trend.

    It only answers:

        "Are observations of this unstructured signal becoming
         more frequent, less frequent, or roughly stable?"

    We compare the first half of the observed period with the second half.

    Returns:
        increasing
        decreasing
        stable
        insufficient_data
    """

    if len(daily_counts) < 4:
        return "insufficient_data"

    dates = sorted(daily_counts.keys())

    values = [daily_counts[d] for d in dates]

    midpoint = len(values) // 2

    first_half = values[:midpoint]
    second_half = values[midpoint:]

    first_avg = sum(first_half) / len(first_half)
    second_avg = sum(second_half) / len(second_half)

    if first_avg == 0:

        if second_avg > 0:
            return "increasing"

        return "stable"

    relative_change = (
        second_avg - first_avg
    ) / first_avg

    if relative_change >= 0.25:
        return "increasing"

    if relative_change <= -0.25:
        return "decreasing"

    return "stable"


# ============================================================================
# BUILD AGGREGATED EVIDENCE
# ============================================================================


def aggregate_evidence(joined_records):

    groups = defaultdict(list)

    for record in joined_records:

        # Ignore records where the SLM found no signal.
        if not record.get("signal_theme"):
            continue

        key = make_group_key(record)

        groups[key].append(record)

    evidence = []

    for (
        signal_theme,
        region,
        product_category,
    ), records in groups.items():

        # ------------------------------------------------------------
        # Counts
        # ------------------------------------------------------------

        observation_count = len(records)

        source_counts = Counter(
            record["source_type"]
            for record in records
        )

        channel_counts = Counter(
            record["channel"]
            for record in records
        )

        severity_counts = Counter(
            record.get("severity")
            for record in records
            if record.get("severity")
        )

        # ------------------------------------------------------------
        # Dates
        # ------------------------------------------------------------

        dates = sorted(
            parse_date(record["date"])
            for record in records
        )

        date_start = dates[0].isoformat()
        date_end = dates[-1].isoformat()

        daily_counts = Counter(
            record["date"]
            for record in records
        )

        daily_counts = dict(
            sorted(daily_counts.items())
        )

        # ------------------------------------------------------------
        # Tags
        # ------------------------------------------------------------

        tag_counts = Counter()

        for record in records:

            for tag in record.get("tags", []):
                tag_counts[tag] += 1

        # ------------------------------------------------------------
        # Example evidence
        # ------------------------------------------------------------

        evidence_examples = []

        for record in records[:10]:

            evidence_examples.append({
                "source_id": record["source_id"],
                "date": record["date"],
                "source_type": record["source_type"],
                "raw_input": record["raw_input"],
                "signal": record.get("signal"),
                "evidence": record.get("evidence"),
            })

        # ------------------------------------------------------------
        # Aggregate
        # ------------------------------------------------------------

        evidence.append({
            "signal_theme": signal_theme,

            "region": region,

            "product_category": product_category,

            "observation_count": observation_count,

            "date_range": {
                "start": date_start,
                "end": date_end,
            },

            "source_distribution": dict(
                source_counts
            ),

            "channel_distribution": dict(
                channel_counts
            ),

            "severity_distribution": dict(
                severity_counts
            ),

            "tag_counts": dict(
                tag_counts
            ),

            "daily_observation_counts": daily_counts,

            "observation_trend": calculate_trend(
                daily_counts
            ),

            "evidence_examples": evidence_examples,
        })

    # Strongest evidence first.
    evidence.sort(
        key=lambda x: x["observation_count"],
        reverse=True,
    )

    return evidence


# ============================================================================
# MAIN
# ============================================================================


def main():

    print("=" * 75)
    print("INSIGHTAI UNSTRUCTURED DATA INTEGRATOR")
    print("=" * 75)

    # ------------------------------------------------------------
    # Load raw data
    # ------------------------------------------------------------

    print(f"\nReading raw data:\n  {RAW_DATA_PATH}")

    raw_records = load_jsonl(
        RAW_DATA_PATH
    )

    print(
        f"Raw records: {len(raw_records)}"
    )

    # ------------------------------------------------------------
    # Load SLM output
    # ------------------------------------------------------------

    print(f"\nReading SLM output:\n  {SLM_OUTPUT_PATH}")

    slm_data = load_json(
        SLM_OUTPUT_PATH
    )

    slm_records = get_slm_records(
        slm_data
    )

    print(
        f"SLM records: {len(slm_records)}"
    )

    # ------------------------------------------------------------
    # Join
    # ------------------------------------------------------------

    print("\nJoining raw records with SLM extraction...")

    joined_records = build_joined_records(
        raw_records,
        slm_records,
    )

    print(
        f"Joined records: {len(joined_records)}"
    )

    # ------------------------------------------------------------
    # Aggregate
    # ------------------------------------------------------------

    print("\nAggregating unstructured evidence...")

    evidence = aggregate_evidence(
        joined_records
    )

    print(
        f"Evidence groups: {len(evidence)}"
    )

    # ------------------------------------------------------------
    # Output
    # ------------------------------------------------------------

    output = {
        "generated_at": datetime.now().astimezone().isoformat(),

        "source": {
            "raw_records": len(raw_records),
            "slm_records": len(slm_records),
            "joined_records": len(joined_records),
        },

        "evidence_groups": evidence,
    }

    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with open(
        OUTPUT_PATH,
        "w",
        encoding="utf-8",
    ) as f:

        json.dump(
            output,
            f,
            indent=2,
            ensure_ascii=False,
        )

    print(
        f"\nSaved → {OUTPUT_PATH}"
    )


if __name__ == "__main__":
    main()
