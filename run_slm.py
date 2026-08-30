
import json
from datetime import datetime, UTC
from pathlib import Path

from tqdm import tqdm

import torch
from unsloth import FastModel


# ============================================================================
# PATHS
# ============================================================================

# ROOT = Path(__file__).resolve().parent.parent

# INPUT_PATH = ROOT / "data" / "raw" / "unstructured_data.jsonl"
# OUTPUT_PATH = ROOT / "data" / "slm_output.json"


# ============================================================================
# MODEL CONFIG
# ============================================================================

BASE_MODEL = "unsloth/gemma-2-2b-it-bnb-4bit"

# If you later fine-tune Gemma, change this to the fine-tuned model path.
MODEL_PATH = None

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

print("DEVICE:", DEVICE)

MAX_SEQ_LENGTH = 2048
MAX_NEW_TOKENS = 512

# Number of independent records processed simultaneously.
BATCH_SIZE = 4


# ============================================================================
# ALLOWED SIGNAL THEMES
# ============================================================================

ALLOWED_THEMES = {
    "shipment_delay",
    "marketing_spend_increase",
    "ambiguous_quality",
    "price_increase",
    "stockout",
    "competitor_promo",
    "organic_viral_demand",
}


# ============================================================================
# SYSTEM PROMPT
# ============================================================================

SYSTEM_PROMPT = """
You are a record-level business signal extraction model.

You will receive EXACTLY ONE unstructured business record at a time.

Your job is to extract structured evidence from THIS RECORD ONLY.

You are the first stage of a larger business intelligence pipeline.

You are NOT:
- a trend detection system
- an investigation agent
- a recommendation agent
- an aggregation system

You cannot see other records.

Therefore you MUST NOT infer:
- trends
- increases or decreases across records
- recurrence
- frequency across customers
- market-wide behavior
- organizational impact
- business impact
- causality
- statistical significance

Only describe what this individual record itself supports.

The record may be:
- a customer support ticket
- a product review
- a social media post
- an internal message
- an external/news item

Some records are ordinary background noise.

SIGNAL THEME:

Business themes that may appear include:

shipment_delay
marketing_spend_increase
price_increase
stockout
competitor_promo
organic_viral_demand
quality
Use the theme that best represents the actual meaning of the record.

For example, a record saying:
"The packaging was neat and the finish looked premium."

could have:

signal_theme: "packaging_quality"

IMPORTANT:

signal_theme describes the semantic business signal expressed by THIS
RECORD.

Do not classify a record merely because a keyword appears.

For example:

"The product arrived quickly and was packaged nicely."

does NOT indicate shipment_delay.

"The product took almost twice as long to arrive."

does indicate shipment_delay.

Hard stress on the 7 example themes that are mentioned above,
if they seem to be matching keep the wordings same for these 7 themes.

SEVERITY:

Severity describes the strength or seriousness of the issue expressed
inside THIS RECORD ONLY.

Use:
- low
- medium
- high

If the record contains a positive signal rather than a problem, severity
should normally be low.

If severity cannot reasonably be determined, use low.

EVIDENCE:

The evidence field must quote or closely paraphrase the specific statement
from THIS RECORD that supports the extracted signal.

Do not introduce information that is not present in the record.

SIGNAL:

The signal field should be a concise description of what THIS RECORD says.

Do not write conclusions about other customers, the market, or the company.

TAGS:

Provide 1 to 4 useful keywords derived from the record.

If there is no meaningful signal:

- signal_theme = null
- signal = null
- severity = null
- evidence = null
- tags = []

Return ONLY valid JSON.

Required structure:

{
  "signal_theme": "theme",
  "signal": "short description of what this record indicates or null",
  "severity": "low | medium | high | null",
  "evidence": "specific evidence from this record or null",
  "tags": [
    "tag1",
    "tag2"
  ]
}
"""


# ============================================================================
# LOAD DATA
# ============================================================================


def load_records():

    records = []

    with open(INPUT_PATH, "r", encoding="utf-8") as f:

        for line_number, line in enumerate(f, 1):

            line = line.strip()

            if not line:
                continue

            try:
                record = json.loads(line)

            except json.JSONDecodeError as e:

                print(
                    f"WARNING: invalid JSON on line "
                    f"{line_number}: {e}"
                )

                continue

            records.append(record)

    return records


# ============================================================================
# LOAD MODEL
# ============================================================================


def load_model():

    model_path = (
        str(MODEL_PATH)
        if MODEL_PATH is not None
        else BASE_MODEL
    )

    print("=" * 70)
    print("LOADING GEMMA")
    print("=" * 70)

    print(f"Model: {model_path}")
    print(f"Device: {DEVICE}")

    model, tokenizer = FastModel.from_pretrained(
        model_name=model_path,
        max_seq_length=MAX_SEQ_LENGTH,
    )

    model.eval()

    # ------------------------------------------------------------------------
    # The model's generation config may contain max_length=8192.
    #
    # We control generation using max_new_tokens instead.
    # Clearing max_length prevents the:
    #
    # "Both max_new_tokens and max_length seem to have been set"
    #
    # warning.
    # ------------------------------------------------------------------------

    if hasattr(model, "generation_config"):
        model.generation_config.max_length = None

    if hasattr(tokenizer, "padding_side"):
        tokenizer.padding_side = "left"

    if getattr(tokenizer, "pad_token_id", None) is None:
        tokenizer.pad_token = tokenizer.eos_token

    print("Gemma loaded.")

    return model, tokenizer


# ============================================================================
# BUILD PROMPT
# ============================================================================


def build_user_prompt(record):

    return f"""
Extract the business signal from this ONE record.

Analyze ONLY this record.

Do not use information from previous or future records.

========================
RECORD
========================

{json.dumps(record, indent=2, ensure_ascii=False)}

========================
TASK
========================

Determine whether this individual record contains meaningful evidence
of one of the supported business signal themes.

If it contains a signal:

- classify signal_theme
- describe the signal
- assign severity
- identify the exact supporting evidence
- provide useful tags

If it does NOT contain a meaningful signal:

- signal_theme = null
- signal = null
- severity = null
- evidence = null
- tags = []

Remember:

Do not infer a trend.

Do not infer frequency.

Do not infer recurrence.

Do not infer business impact.

Do not infer causality.

Do not infer information from other records.

Return ONLY valid JSON.
"""


# ============================================================================
# BUILD ONE CHAT PROMPT
# ============================================================================


def build_messages(record):

    prompt = build_user_prompt(record)

    return [
        {
            "role": "user",
            "content": SYSTEM_PROMPT + "\n\n" + prompt,
        }
    ]


# ============================================================================
# RUN BATCH INFERENCE
# ============================================================================


def run_inference_batch(model, tokenizer, records):

    """
    Process multiple records simultaneously.

    IMPORTANT:

    Each record has its own completely independent prompt.

    Example with batch size 4:

        record A -> prompt A -> output A
        record B -> prompt B -> output B
        record C -> prompt C -> output C
        record D -> prompt D -> output D

    The records are NOT concatenated and cannot see one another.
    """

    # ------------------------------------------------------------------------
    # Build one independent conversation for every record.
    # ------------------------------------------------------------------------

    conversations = [
        build_messages(record)
        for record in records
    ]

    # ------------------------------------------------------------------------
    # Render each conversation separately using the model's chat template.
    #
    # We render them individually because your Gemma chat template does not
    # support a system role. The system prompt is already embedded into the
    # user message.
    # ------------------------------------------------------------------------

    prompts = [
        tokenizer.apply_chat_template(
            conversation,
            tokenize=False,
            add_generation_prompt=True,
        )
        for conversation in conversations
    ]

    # ------------------------------------------------------------------------
    # Tokenize the prompts together.
    #
    # Padding makes all sequences the same tensor width so they can be
    # processed together by the GPU.
    # ------------------------------------------------------------------------

    inputs = tokenizer(
        prompts,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=MAX_SEQ_LENGTH,
    ).to(DEVICE)

    input_length = inputs["input_ids"].shape[1]

    with torch.inference_mode():

        outputs = model.generate(
            input_ids=inputs["input_ids"],
            attention_mask=inputs["attention_mask"],
            max_new_tokens=MAX_NEW_TOKENS,
            do_sample=False,
            use_cache=True,
            pad_token_id=tokenizer.eos_token_id,
        )

    # ------------------------------------------------------------------------
    # Because left padding is used, every sequence has the same padded input
    # width. Therefore generated tokens begin at input_length for every item.
    # ------------------------------------------------------------------------

    generated_tokens = outputs[:, input_length:]

    results = []

    for i in range(len(records)):

        result = tokenizer.decode(
            generated_tokens[i],
            skip_special_tokens=True,
        ).strip()

        results.append(result)

    return results


# ============================================================================
# PARSE JSON
# ============================================================================


def parse_json(text):

    text = text.strip()

    # ------------------------------------------------------------------------
    # Remove markdown fences if Gemma adds them.
    # ------------------------------------------------------------------------

    if text.startswith("```"):

        lines = text.splitlines()

        if lines and lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        text = "\n".join(lines).strip()

    # ------------------------------------------------------------------------
    # First try parsing the entire response.
    # ------------------------------------------------------------------------

    try:
        return json.loads(text)

    except json.JSONDecodeError:
        pass

    # ------------------------------------------------------------------------
    # Fallback: locate the outermost JSON object.
    # ------------------------------------------------------------------------

    start = text.find("{")
    end = text.rfind("}")

    if start == -1 or end == -1 or end <= start:

        raise ValueError(
            "Gemma did not return a JSON object.\n\n"
            f"Raw output:\n{text}"
        )

    candidate = text[start:end + 1]

    try:
        return json.loads(candidate)

    except json.JSONDecodeError as e:

        raise ValueError(
            "Gemma returned text containing something that looked "
            "like JSON, but it could not be parsed.\n\n"
            f"Raw output:\n{text}\n\n"
            f"JSON error:\n{e}"
        )


# ============================================================================
# VALIDATE MODEL OUTPUT
# ============================================================================


def validate_output(result):

    if not isinstance(result, dict):

        raise ValueError(
            "SLM output must be a JSON object."
        )

    required = {
        "signal_theme",
        "signal",
        "severity",
        "evidence",
        "tags",
    }

    missing = required - set(result.keys())

    if missing:

        raise ValueError(
            f"Missing fields: {sorted(missing)}"
        )

    # ------------------------------------------------------------------------
    # signal_theme
    # ------------------------------------------------------------------------

    theme = result["signal_theme"]

    # ------------------------------------------------------------------------
    # severity
    # ------------------------------------------------------------------------

    severity = result["severity"]

    if severity not in {
        "low",
        "medium",
        "high",
        None,
    }:

        raise ValueError(
            f"Invalid severity: {severity}"
        )

    # ------------------------------------------------------------------------
    # tags
    # ------------------------------------------------------------------------

    if not isinstance(result["tags"], list):

        raise ValueError(
            "tags must be a list"
        )

    if len(result["tags"]) > 4:

        raise ValueError(
            "Maximum of 4 tags allowed."
        )

    # ------------------------------------------------------------------------
    # Null consistency
    # ------------------------------------------------------------------------

    if theme is None:

        if result["signal"] is not None:
            raise ValueError(
                "signal must be null when signal_theme is null."
            )

        if result["severity"] is not None:
            raise ValueError(
                "severity must be null when signal_theme is null."
            )

        if result["evidence"] is not None:
            raise ValueError(
                "evidence must be null when signal_theme is null."
            )

        if result["tags"] != []:
            raise ValueError(
                "tags must be [] when signal_theme is null."
            )

    else:

        if not isinstance(result["signal"], str):
            raise ValueError(
                "signal must be a string when a theme exists."
            )

        if not result["signal"].strip():
            raise ValueError(
                "signal cannot be empty when a theme exists."
            )

        if not isinstance(result["evidence"], str):
            raise ValueError(
                "evidence must be a string when a theme exists."
            )

        if not result["evidence"].strip():
            raise ValueError(
                "evidence cannot be empty when a theme exists."
            )


# ============================================================================
# PROCESS ONE RESULT
# ============================================================================


def process_result(raw_output, record):

    try:

        extraction = parse_json(raw_output)

        validate_output(extraction)

        valid = True
        error = None

    except Exception as e:

        extraction = None
        valid = False
        error = str(e)

    # ------------------------------------------------------------------------
    # Metadata comes from the ORIGINAL RECORD.
    #
    # Gemma does not generate:
    #     source_id
    #     source_type
    #     date
    #     region
    #     product_category
    #     channel
    # ------------------------------------------------------------------------

    return {

        "source_id": record.get("source_id"),

        "source_type": record.get("source_type"),

        "date": record.get("date"),

        "region": record.get("region"),

        "product_category": record.get(
            "product_category"
        ),

        "channel": record.get("channel"),

        "slm_extraction": extraction,

        "valid": valid,

        "error": error,

        "raw_slm_output": raw_output,

    }


# ============================================================================
# MAIN
# ============================================================================


def main():

    INPUT_PATH = (
        "/kaggle/input/datasets/karnavbhattacharya/"
        "unstructured-tickets/unstructured_data.jsonl"
    )

    OUTPUT_PATH = (
        "/kaggle/working/data/slm_output.json"
    )

    MODEL_PATH = (
        "/kaggle/input/models/karnavbhattacharya/"
        "finetuned-gemma/pytorch/default/1/my_finetuned_model"
    )

    print("=" * 70)
    print("INSIGHTAI — GEMMA SLM EXTRACTION")
    print("=" * 70)

    print("\nReading:")
    print(INPUT_PATH)

    INPUT_PATH = Path(INPUT_PATH)
    OUTPUT_PATH = Path(OUTPUT_PATH)
    MODEL_PATH = Path(MODEL_PATH)

    if not INPUT_PATH.exists():
        raise FileNotFoundError(
            f"Input file not found: {INPUT_PATH}"
        )

    records = load_records()

    print(f"Records loaded: {len(records)}")
    print(f"Batch size: {BATCH_SIZE}")

    if not records:
        print("No records found.")
        return

    model, tokenizer = load_model()

    results = []

    successful = 0
    failed = 0

    print("\nRunning Gemma batch extraction...")

    # =========================================================================
    # BATCH LOOP
    # =========================================================================

    for batch_start in tqdm(
        range(0, len(records), BATCH_SIZE),
        desc="Processing batches",
    ):

        batch_records = records[
            batch_start:
            batch_start + BATCH_SIZE
        ]

        try:

            # ---------------------------------------------------------------
            # ONE GPU generation call for the whole batch.
            # ---------------------------------------------------------------

            raw_outputs = run_inference_batch(
                model,
                tokenizer,
                batch_records,
            )

            # ---------------------------------------------------------------
            # Parse and validate each output independently.
            # ---------------------------------------------------------------

            for record, raw_output in zip(
                batch_records,
                raw_outputs,
            ):

                result = process_result(
                    raw_output,
                    record,
                )

                results.append(result)

                if result["valid"]:

                    successful += 1

                else:

                    failed += 1

                    print(
                        f"\nWARNING: invalid output for "
                        f"{record.get('source_id')}: "
                        f"{result['error']}"
                    )

        except Exception as e:

            # ----------------------------------------------------------------
            # If an entire batch fails, preserve one failed result per record.
            # ----------------------------------------------------------------

            print(
                f"\nERROR processing batch "
                f"{batch_start} - "
                f"{batch_start + len(batch_records) - 1}: "
                f"{e}"
            )

            failed += len(batch_records)

            for record in batch_records:

                results.append({

                    "source_id": record.get(
                        "source_id"
                    ),

                    "source_type": record.get(
                        "source_type"
                    ),

                    "date": record.get(
                        "date"
                    ),

                    "region": record.get(
                        "region"
                    ),

                    "product_category": record.get(
                        "product_category"
                    ),

                    "channel": record.get(
                        "channel"
                    ),

                    "slm_extraction": None,

                    "valid": False,

                    "error": str(e),

                    "raw_slm_output": None,

                })

    # =========================================================================
    # OUTPUT
    # =========================================================================

    output = {

        "generated_at": datetime.now(
            UTC
        ).isoformat(),

        "model": str(MODEL_PATH),

        "batch_size": BATCH_SIZE,

        "n_records": len(records),

        "n_valid": successful,

        "n_failed": failed,

        "results": results,

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

    # =========================================================================
    # SUMMARY
    # =========================================================================

    print("\n" + "=" * 70)
    print("EXTRACTION COMPLETE")
    print("=" * 70)

    print(
        f"Total records : {len(records)}"
    )

    print(
        f"Valid         : {successful}"
    )

    print(
        f"Failed        : {failed}"
    )

    print(
        f"Success rate  : "
        f"{successful / len(records):.1%}"
    )

    print(
        f"Batch size    : {BATCH_SIZE}"
    )

    print(
        f"\nOutput:\n{OUTPUT_PATH}"
    )


main()
