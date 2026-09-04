
import json
from datetime import datetime, timedelta
from pathlib import Path
from tqdm import tqdm

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

import modal

app = modal.App("insightai-investigation")

volume = modal.Volume.from_name("insightaiv2")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch",
        "transformers",
        "accelerate",
        "bitsandbytes",
        "safetensors",
        "tqdm",
    )
)


# Config    

# ROOT = Path(__file__).parent

# KPI_PATH = ROOT / "data" / "kpi_output.json"
# OUTPUT_PATH = ROOT / "data" / "investigation_output.json"

KPI_PATH = Path("/data/data/kpi_output.json")
UNSTRUCTURED_EVIDENCE_PATH = Path("/data/data/unstructured_evidence.json")
OUTPUT_PATH = Path("/data/data/investigation_output.json")


MODEL_NAME = "Qwen/Qwen3-4B"

DAYS_BEFORE = 14
DAYS_AFTER = 7

MAX_NEW_TOKENS = 2048

# System Prompt

SYSTEM_PROMPT = """
You are the final investigation analyst in a business intelligence system.

A deterministic KPI system has already detected a statistically unusual and
commercially material sales movement. Do not re-detect or dispute it.
Investigate which explanations are best supported by the supplied evidence.

INPUTS:
1. detected movement;
2. sales KPI rows;
3. deterministic cross-domain diagnostics: inventory, logistics, pricing,
   web traffic, competitor activity and promotions;
4. marketing evidence;
5. provenance-rich unstructured evidence.

USE ONLY THE SUPPLIED EVIDENCE.

For each hypothesis evaluate:
- temporal alignment: the proposed cause must occur before or during the movement;
- quantitative support using only supplied measurements and baselines;
- qualitative support using source_id/date/source_type;
- contradictory evidence;
- alternative explanations;
- independence of evidence (repeated reports are not automatically independent);
- whether the evidence actually distinguishes the hypothesis from alternatives.

Correlation is not causation. Prefer "supports", "consistent with", or
"makes more likely" unless the supplied evidence establishes more.

If the evidence cannot distinguish plausible causes, say so. Do not manufacture
a winner. Do not introduce outside explanations unless they appear in the data.

Generate 2 to 5 hypotheses when warranted. Fewer is better than weak filler.

Return ONLY valid JSON:
{
  "summary": "concise evidence-based summary",
  "conclusion": "supported_cause | multiple_plausible_causes | insufficient_evidence",
  "hypotheses": [
    {
      "rank": 1,
      "hypothesis": "specific explanation",
      "confidence": 0.0,
      "supporting_evidence": ["specific evidence with provenance"],
      "contradicting_evidence": ["specific evidence with provenance"],
      "missing_evidence": ["specific missing evidence"],
      "next_check": "best discriminating check"
    }
  ],
  "overall_confidence": 0.0
}
"""

# Load input data

def load_kpi_output():
    with open(KPI_PATH, "r") as f:
        return json.load(f)


def load_unstructured_evidence():
    with open(UNSTRUCTURED_EVIDENCE_PATH, "r") as f:
        return json.load(f)

# Date helpers

# def parse_date(value):
#     return datetime.strptime(value, "%Y-%m-%d").date()

def parse_date(value):
    return datetime.fromisoformat(value).date()


# Build focused investigation context

def build_investigation_context(data, movement):
    region = movement["region"]
    category = movement["product_category"]

    start_date = parse_date(movement["start_date"])
    end_date = parse_date(movement["end_date"])

    context_start = start_date - timedelta(days=DAYS_BEFORE)
    context_end = end_date + timedelta(days=DAYS_AFTER)

    # Sales KPI rows
    sales_rows = []

    for row in data["kpi_table"]:
        if row["region"] != region:
            continue

        if row["product_category"] != category:
            continue

        row_date = parse_date(row["date"])

        if context_start <= row_date <= context_end:
            sales_rows.append(row)

    # Marketing rows for the same region

    marketing_rows = []

    for row in data["marketing_weekly"]:
        if row["region"] != region:
            continue

        week_start = parse_date(row["week_start"])

        if context_start <= week_start <= context_end:
            marketing_rows.append(row)

    # Unstructured evidence groups for the same region/category.
    # Keep groups whose observed date range overlaps the investigation window.
    unstructured_groups = []

    for group in data["unstructured_evidence"]["evidence_groups"]:
        if group.get("region") != region:
            continue

        if group.get("product_category") != category:
            continue

        date_range = group.get("date_range", {})
        group_start = parse_date(date_range["start"])
        group_end = parse_date(date_range["end"])

        if group_end < context_start or group_start > context_end:
            continue

        unstructured_groups.append(group)

    return {
        "movement": movement,
        "sales_kpi_evidence": sales_rows,
        "structured_diagnostics": movement.get("diagnostics", {}),
        "diagnostic_hints": movement.get("diagnostic_hints", []),
        "marketing_evidence": marketing_rows,
        "unstructured_evidence": unstructured_groups,
    }

# Prompt construction

def build_user_prompt(context):
    return f"""
Investigate this sales movement using ONLY the supplied evidence.

========================
MOVEMENT
========================
{json.dumps(context["movement"], indent=2)}

========================
SALES KPI EVIDENCE
========================
{json.dumps(context["sales_kpi_evidence"], indent=2)}

========================
STRUCTURED DIAGNOSTICS
========================
These are deterministic observations, not causal conclusions.

{json.dumps(context["structured_diagnostics"], indent=2)}

Diagnostic hints:
{json.dumps(context["diagnostic_hints"], indent=2)}

========================
MARKETING EVIDENCE
========================
{json.dumps(context["marketing_evidence"], indent=2)}

========================
UNSTRUCTURED EVIDENCE
========================
These are qualitative records aggregated from individual sources.
Do not treat observation count as proof of causality. Preserve source_id,
date and source_type when citing examples.

{json.dumps(context["unstructured_evidence"], indent=2)}

========================
TASK
========================
1. Describe exactly what changed.
2. Generate only evidence-supported hypotheses.
3. Check temporal alignment.
4. Compare quantitative and qualitative evidence.
5. Include contradictory evidence.
6. Avoid double-counting repeated observations.
7. Rank hypotheses by comparative evidence strength.
8. Use "multiple_plausible_causes" or "insufficient_evidence" when appropriate.
9. Give the most useful discriminating next check for each leading hypothesis.

Do not invent facts, data, baselines, events, or external context.

Return ONLY valid JSON.
"""


# JSON extraction

def extract_json(text):
    """
    Qwen can occasionally wrap JSON in markdown fences despite being told
    not to. Strip those fences and extract the outermost JSON object.
    """

    text = text.strip()

    if text.startswith("```"):
        lines = text.splitlines()

        if lines and lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        text = "\n".join(lines).strip()

    start = text.find("{")
    end = text.rfind("}")

    if start == -1 or end == -1 or end <= start:
        raise ValueError(
            "Model did not return a JSON object.\n\n"
            f"Raw output:\n{text}"
        )

    return json.loads(text[start:end + 1])

# Basic output validation

def validate_investigation(result):
    required_top_level = {
        "summary", "conclusion", "hypotheses", "overall_confidence"
    }
    missing = required_top_level - result.keys()
    if missing:
        raise ValueError(f"Investigation missing fields: {sorted(missing)}")

    if result["conclusion"] not in {
        "supported_cause",
        "multiple_plausible_causes",
        "insufficient_evidence",
    }:
        raise ValueError("Invalid conclusion.")

    if not isinstance(result["hypotheses"], list):
        raise ValueError("hypotheses must be a list.")

    if not 1 <= len(result["hypotheses"]) <= 5:
        raise ValueError("hypotheses must contain between 1 and 5 items.")

    if not 0 <= float(result["overall_confidence"]) <= 1:
        raise ValueError("overall_confidence must be between 0 and 1.")

    required_hypothesis_fields = {
        "rank", "hypothesis", "confidence",
        "supporting_evidence", "contradicting_evidence",
        "missing_evidence", "next_check"
    }

    for hypothesis in result["hypotheses"]:
        missing = required_hypothesis_fields - hypothesis.keys()
        if missing:
            raise ValueError(f"Hypothesis missing fields: {sorted(missing)}")

        if not 0 <= float(hypothesis["confidence"]) <= 1:
            raise ValueError(
                f"Invalid confidence: {hypothesis['confidence']}"
            )

        for field in (
            "supporting_evidence",
            "contradicting_evidence",
            "missing_evidence",
        ):
            if not isinstance(hypothesis[field], list):
                raise ValueError(f"{field} must be a list.")


# Load model

def load_model():
    print(f"Loading {MODEL_NAME}...")

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

    bnb_config = BitsAndBytesConfig(
    load_in_8bit=True,
)

    model = AutoModelForCausalLM.from_pretrained(MODEL_NAME, torch_dtype=torch.float16, device_map="auto", quantization_config=bnb_config,)

    model.eval()

    print("Model loaded.")

    return tokenizer, model

# Run investigation

def generate_investigation(tokenizer, model, context):
    user_prompt = build_user_prompt(context)

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        },
        {
            "role": "user",
            "content": user_prompt,
        },
    ]

    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
        enable_thinking=False,
    )

    inputs = tokenizer(
        prompt,
        return_tensors="pt",
    )

    inputs = {k: v.to(model.device) for k, v in inputs.items()}

    print(
        f"Prompt tokens: {inputs['input_ids'].shape[-1]}"
    )

    with torch.inference_mode():
        outputs = model.generate(
            **inputs,
            max_new_tokens=MAX_NEW_TOKENS,
            do_sample=False,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
)


    generated_tokens = outputs[
        0,
        inputs["input_ids"].shape[-1]:,
    ]

    response = tokenizer.decode(
        generated_tokens,
        skip_special_tokens=True,
    )

    return response


# Main

@app.function(
    image=image,
    gpu="A100",
    volumes={"/data": volume},
    timeout=60 * 30,
)
def run_investigation():
    print(f"Reading KPI data: {KPI_PATH}")
    print(f"Reading unstructured evidence: {UNSTRUCTURED_EVIDENCE_PATH}")

    kpi_data = load_kpi_output()
    unstructured_evidence = load_unstructured_evidence()

    # Keep the existing KPI structure intact while making the new evidence
    # available to build_investigation_context().
    data = {
        **kpi_data,
        "unstructured_evidence": unstructured_evidence,
    }

    movements = [m for m in data["flagged_movements"] if m.get("direction") in {"drop", "spike"}]

    if not movements:
        print("No material movements found.")
        return

    print(f"Material movements available: {len(movements)}")

    # -----------------------------------------------------------------------
    # V1: investigate ONE movement.
    # Change this to a loop after we inspect the quality of the output.
    # -----------------------------------------------------------------------

    # movement = movements[0]

    tokenizer, model = load_model()
    investigations = []
    movements_to_investigate = movements[:5]
    for index, movement in tqdm(enumerate(movements_to_investigate, start=1)):
        print("\n" + "=" * 70)
        print(f"INVESTIGATION {index}/{len(movements_to_investigate)}")
        print("=" * 70)

        print(
            f"Region:       {movement['region']}"
        )
        print(
            f"Category:     {movement['product_category']}"
        )
        print(
            f"Period:       {movement['start_date']} → "
            f"{movement['end_date']}"
        )
        print(
            f"Direction:    {movement['direction']}"
        )
        print(
            f"Peak |z|:     {movement['peak_abs_zscore']:.2f}"
        )

        context = build_investigation_context(
            data,
            movement,
        )

        print(
            f"\nSales evidence rows: "
            f"{len(context['sales_kpi_evidence'])}"
        )

        print(
            f"Marketing evidence rows: "
            f"{len(context['marketing_evidence'])}"
        )
        print(
            f"Unstructured evidence groups: "
            f"{len(context['unstructured_evidence'])}"
        )

        # Inference


        print("\nRunning investigation...")

        raw_response = generate_investigation(
            tokenizer,
            model,
            context,
        )

        print("\n" + "=" * 70)
        print("RAW MODEL RESPONSE")
        print("=" * 70)
        print(raw_response)

        # Parse + validate

        try:
            investigation = extract_json(raw_response)
            validate_investigation(investigation)
            # valid = True
            # error = None
        except Exception as e:
            print("\nWARNING: Could not validate model output.")
            print(e)

            investigation = {
                "parse_error": str(e),
                "raw_response": raw_response,
            }
        investigations.append({
            "movement": movement,
            "investigation": investigation,
            # "valid": valid,
            # "error": error,
        })

    # Save
    output = {
    "generated_at": datetime.now().astimezone().isoformat(),
    "model": MODEL_NAME,
    "number_of_movements": len(investigations),
    "investigations": investigations,
}


    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with open(OUTPUT_PATH, "w") as f:
        json.dump(
            output,
            f,
            indent=2,
        )

    print(
        f"\nSaved → {OUTPUT_PATH}"
    )


@app.local_entrypoint()
def main():
    run_investigation.remote()
