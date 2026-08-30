
import json
from datetime import datetime, timedelta
from pathlib import Path
from tqdm import tqdm

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

import modal

app = modal.App("insightai-investigation")

volume = modal.Volume.from_name("insightai-data")

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

KPI_PATH = Path("/mnt/input/kpi_output.json")
UNSTRUCTURED_EVIDENCE_PATH = Path("/mnt/input/unstructured_evidence.json")
OUTPUT_PATH = Path("/mnt/output/investigation_output.json")


MODEL_NAME = "Qwen/Qwen3-4B"

DAYS_BEFORE = 14
DAYS_AFTER = 7

MAX_NEW_TOKENS = 2048

# System Prompt

SYSTEM_PROMPT = """
You are a business investigation analyst.

You are investigating a sales movement that has already been detected
by a deterministic KPI system.

The KPI system has already established that the movement is statistically
unusual and commercially material.

Your job is to investigate WHY it may have happened.

You will receive both structured evidence (KPI and marketing data) and
unstructured evidence (qualitative records grouped by signal theme).

Do not question whether the anomaly exists. Investigate its possible causes.

Generate 3 to 5 plausible hypotheses when the evidence allows it and rank
them from most plausible to least plausible.

For every hypothesis:

1. State the hypothesis clearly.
2. Explain why it could explain the movement.
3. Cite specific supporting evidence from the supplied data.
4. Identify contradicting evidence.
5. Identify important missing evidence.
6. Give a confidence score from 0 to 1.
7. Recommend the next check that would best distinguish this hypothesis
   from the alternatives.

Rules:

- Use ONLY the supplied evidence.
- Never invent facts.
- Never invent data.
- Do not treat correlation as proof of causation.
- Missing information must be explicitly identified.
- Prefer hypotheses supported by multiple independent signals, including
  structured KPI/marketing signals and unstructured evidence when available.
- Treat unstructured evidence as supporting evidence, not proof of causation.
- Use source_id/date/source_type from unstructured evidence when citing it.
- Contradicting evidence should reduce confidence.
- Do not give every hypothesis the same confidence.
- Be specific and quantitative where possible.
- If there is insufficient evidence to identify a likely cause, say so.
- The goal is investigation, not storytelling.

Return ONLY valid JSON.

Required structure:

{
  "summary": "short explanation of what happened",
  "hypotheses": [
    {
      "rank": 1,
      "hypothesis": "clear explanation",
      "confidence": 0.0,
      "supporting_evidence": [
        "specific evidence"
      ],
      "contradicting_evidence": [
        "specific evidence"
      ],
      "missing_evidence": [
        "data that would help verify this"
      ],
      "next_check": "most useful next investigation"
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

def parse_date(value):
    return datetime.strptime(value, "%Y-%m-%d").date()


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
        "marketing_evidence": marketing_rows,
        "unstructured_evidence": unstructured_groups,
    }

# Prompt construction

def build_user_prompt(context):
    return f"""
Investigate this sales movement.

Use ONLY the evidence below.

========================
MOVEMENT
========================

{json.dumps(context["movement"], indent=2)}

========================
SALES KPI EVIDENCE
========================

{json.dumps(context["sales_kpi_evidence"], indent=2)}

========================
MARKETING EVIDENCE
========================

{json.dumps(context["marketing_evidence"], indent=2)}

========================
UNSTRUCTURED EVIDENCE
========================

These are qualitative evidence groups derived from unstructured business
records. Use their signal themes, source distributions, trends, and
evidence examples as evidence. When citing an example, preserve its
source_id and date so the evidence can be traced back to the source.

{json.dumps(context["unstructured_evidence"], indent=2)}

========================
TASK
========================

Determine the most plausible explanations for this movement.

Rank the hypotheses.

For each hypothesis, distinguish clearly between:

- evidence supporting it
- evidence contradicting it
- evidence that is missing
- what should be checked next

Do not invent information.

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
        "summary",
        "hypotheses",
        "overall_confidence",
    }

    missing = required_top_level - result.keys()

    if missing:
        raise ValueError(
            f"Investigation missing fields: {sorted(missing)}"
        )

    if not isinstance(result["hypotheses"], list):
        raise ValueError("hypotheses must be a list")

    if not 0 <= float(result["overall_confidence"]) <= 1:
        raise ValueError("overall_confidence must be between 0 and 1")

    required_hypothesis_fields = {
        "rank",
        "hypothesis",
        "confidence",
        "supporting_evidence",
        "contradicting_evidence",
        "missing_evidence",
        "next_check",
    }

    for hypothesis in result["hypotheses"]:
        missing = required_hypothesis_fields - hypothesis.keys()

        if missing:
            raise ValueError(f"Hypothesis missing fields: {sorted(missing)}")

        confidence = float(hypothesis["confidence"])

        if not 0 <= confidence <= 1:
            raise ValueError(f"Invalid confidence: {confidence}")

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
    volumes={"/mnt": volume},
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
