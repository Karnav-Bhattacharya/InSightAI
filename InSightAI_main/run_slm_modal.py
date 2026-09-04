#! TAGS ARE NOT PROMPTED, NEED TO CHANGE.

import json
from datetime import datetime, UTC
from pathlib import Path
import gc

import modal


# ============================================================================
# MODAL CONFIG
# ============================================================================

app = modal.App("insightai-gemma-extraction")

# Persistent storage for input/output data.
volume = modal.Volume.from_name(
    "insightaiv2",
    create_if_missing=True,
)

# Container image with PyTorch, Unsloth, Transformers, etc.
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "unsloth",
        "transformers",
        "accelerate",
        "bitsandbytes",
        "tqdm",
    )
)

from tqdm import tqdm


INPUT_PATH = Path("/data/raw/unstructured_data.jsonl")

OUTPUT_PATH = Path("/data/slm_output.json")

# # If your fine-tuned model is stored in the Modal Volume:
# MODEL_PATH = Path(
#     "/data/models/my_finetuned_model"
# )

# If you want to use the Hugging Face model instead, set:
MODEL_PATH = "unsloth/gemma-2-9b-it" 

# ============================================================================
# MODEL CONFIG
# ============================================================================

BASE_MODEL = "unsloth/gemma-2-9b-it"
MAX_SEQ_LENGTH = 4096
MAX_NEW_TOKENS = 512

BATCH_SIZE = 32


# ============================================================================
# ALLOWED SIGNAL THEMES
# ============================================================================

ALLOWED_THEMES = {
    "shipment_delay",
    "marketing_spend_increase",
    "quality",
    "price_increase",
    "stockout",
    "competitor_promo",
    "organic_viral_demand",
    "website_outage",
    "paid_campaign",
    "sparse_history",
}


# ============================================================================
# SYSTEM PROMPT
# ============================================================================

SYSTEM_PROMPT = """
You are a business intelligence evidence extraction model.

Analyze exactly ONE business record.

Return ONLY one valid JSON object. No explanation. No markdown.

A business signal must be an observable condition or event explicitly
supported by the record.

Allowed signal_theme values:
- shipment_delay
- marketing_spend_increase
- quality
- price_increase
- stockout
- competitor_promo
- organic_viral_demand
- website_outage
- paid_campaign
- sparse_history

Rules:

shipment_delay:
Goods exist and were dispatched/ordered but are stuck or delayed.

stockout:
Goods are unavailable to sell or fulfill.

competitor_promo:
A named competitor is running a promotion or discount.

price_increase:
Our own price explicitly increased.

paid_campaign:
A specific paid campaign, campaign ID, or ad placement is active.

marketing_spend_increase:
Marketing/ad spend is explicitly higher than before.

organic_viral_demand:
Demand increased through organic/social/word-of-mouth activity
without paid advertising being the stated cause.

quality:
The product itself is defective, damaged, malfunctioning, or has a
product-quality complaint.

website_outage:
Website, app, or checkout is down, broken, or inaccessible.

sparse_history:
Historical/baseline/comparable data is explicitly unavailable or
insufficient.

If no supported signal exists, signal_theme, signal, and evidence must
be null and facts must be [].

Extract only facts explicitly supported by the record.
Never invent information.

Output exactly:

{
  "signal_theme": null,
  "signal": null,
  "severity": null,
  "evidence": null,
  "facts": [],
  "entities": {
    "sku": null,
    "warehouse": null,
    "campaign_id": null,
    "po_id": null,
    "competitor": null,
    "order_id": null,
    "ticket_id": null
  },
  "relevant_time": null,
  "direction": "unknown",
  "tags": []
}

severity must be one of:
low, medium, high, null

direction must be one of:
increase, decrease, elevated, reduced, unchanged, incident, unknown

facts: maximum 6 items.
tags: maximum 4 items.

Return JSON only. null should not be quoted. 
"""



# ============================================================================
# LOAD DATA
# ============================================================================

def load_records(input_path: Path):

    records = []

    with open(input_path, "r", encoding="utf-8") as f:

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

    from unsloth import FastModel

    # ------------------------------------------------------------------------
    # Choose your model.
    #
    # For the fine-tuned model:
    #     MODEL_PATH = "/data/models/my_finetuned_model"
    #
    # For the base model:
    #     MODEL_PATH = BASE_MODEL
    # ------------------------------------------------------------------------

    model_path = str(MODEL_PATH)

    print("=" * 70)
    print("LOADING GEMMA ON MODAL GPU")
    print("=" * 70)

    print(f"Model: {model_path}")

    model, tokenizer = FastModel.from_pretrained(
        model_name=model_path,
        max_seq_length=MAX_SEQ_LENGTH,
    )

    model.eval()

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
Analyze the following business record.

Determine whether it contains a meaningful business signal according to
the reasoning framework in the system instructions.

Extract only evidence supported by this record.

Record:

{json.dumps(record, indent=2, ensure_ascii=False)}

Return the required JSON object.
"""



# ============================================================================
# BUILD CHAT PROMPT
# ============================================================================

def build_messages(record):
    return [
        {
            "role": "user",
            "content": SYSTEM_PROMPT + "\n\n" + build_user_prompt(record),
        }
    ]


# ============================================================================
# RUN BATCH INFERENCE
# ============================================================================

def run_inference_batch(model, tokenizer, records):

    conversations = [
        build_messages(record)
        for record in records
    ]

    prompts = [
        tokenizer.apply_chat_template(
            conversation,
            tokenize=False,
            add_generation_prompt=True,
        )
        for conversation in conversations
    ]

    inputs = tokenizer(
        prompts,
        return_tensors="pt",
        padding=True,
        truncation=False,
    )

    # Modal container already has the GPU available.
    # Move tensors to CUDA.
    inputs = {
        key: value.cuda()
        for key, value in inputs.items()
    }

    input_length = inputs["input_ids"].shape[1]
    print("Max prompt tokens:", input_length)

    import torch
    if not torch.cuda.is_available():
        raise RuntimeError("No CUDA GPU available.")
    with torch.inference_mode():

        outputs = model.generate(
            input_ids=inputs["input_ids"],
            attention_mask=inputs["attention_mask"],
            max_new_tokens=MAX_NEW_TOKENS,
            do_sample=False,
            use_cache=True,
            pad_token_id=tokenizer.eos_token_id,
        )

    generated_tokens = outputs[:, input_length:]

    results = []

    for i in tqdm(range(len(records))):

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

    if text.startswith("```"):

        lines = text.splitlines()

        if lines and lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        text = "\n".join(lines).strip()

    try:
        return json.loads(text)

    except json.JSONDecodeError:
        pass

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
            "Gemma returned invalid JSON.\n\n"
            f"Raw output:\n{text}\n\n"
            f"JSON error:\n{e}"
        )


# ============================================================================
# VALIDATE MODEL OUTPUT
# ============================================================================

def validate_output(result):

    if not isinstance(result, dict):
        raise ValueError("SLM output must be a JSON object.")

    required = {
        "signal_theme",
        "signal",
        "severity",
        "evidence",
        "facts",
        "entities",
        "relevant_time",
        "direction",
        "tags",
    }

    missing = required - result.keys()

    if missing:
        raise ValueError(
            f"Missing fields: {sorted(missing)}"
        )

    if (
        result["signal_theme"] is not None
        and result["signal_theme"] not in ALLOWED_THEMES
    ):
        raise ValueError(
            f"Invalid signal_theme: {result['signal_theme']}"
        )

    if result["severity"] not in {
        "low",
        "medium",
        "high",
        None,
    }:
        raise ValueError("Invalid severity.")

    if result["direction"] not in {
        "increase",
        "decrease",
        "elevated",
        "reduced",
        "unchanged",
        "incident",
        "unknown",
    }:
        raise ValueError("Invalid direction.")

    if (
        not isinstance(result["facts"], list)
        or len(result["facts"]) > 6
    ):
        raise ValueError(
            "facts must be a list of at most 6 items."
        )

    if not isinstance(result["entities"], dict):
        raise ValueError(
            "entities must be an object."
        )

    if (
        not isinstance(result["tags"], list)
        or len(result["tags"]) > 4
    ):
        raise ValueError(
            "tags must be a list of at most 4 items."
        )

    if not isinstance(result["facts"], list):
        raise ValueError("facts must be a list.")

    if len(result["facts"]) > 6:
        raise ValueError("facts must contain at most 6 items.")

    if not all(isinstance(x, str) for x in result["facts"]):
        raise ValueError("Every fact must be a string.")



# ============================================================================
# PROCESS RESULT
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
# MODAL GPU FUNCTION
# ============================================================================

@app.function(
    image=image,
    gpu="A100-40GB",
    volumes={
        "/data": volume,
    },
    timeout=60 * 60 * 6,
)
def run_extraction():

    import torch
    from tqdm import tqdm

    print("=" * 70)
    print("INSIGHTAI — MODAL GEMMA SLM EXTRACTION")
    print("=" * 70)

    print(
        f"CUDA available: {torch.cuda.is_available()}"
    )

    if torch.cuda.is_available():

        print(
            f"GPU: {torch.cuda.get_device_name(0)}"
        )

    else:

        raise RuntimeError(
            "CUDA GPU is not available."
        )

    print(f"\nReading: {INPUT_PATH}")

    if not INPUT_PATH.exists():

        raise FileNotFoundError(
            f"Input file not found: {INPUT_PATH}"
        )

    records = load_records(INPUT_PATH)

    print(
        f"Records loaded: {len(records)}"
    )

    print(
        f"Batch size: {BATCH_SIZE}"
    )

    if not records:

        print("No records found.")
        return

    model, tokenizer = load_model()

    results = []

    successful = 0
    failed = 0

    print(
        "\nRunning Gemma batch extraction..."
    )

    for batch_start in tqdm(range(0, len(records), BATCH_SIZE), desc="Processing batches"):

        batch_records = records[batch_start:batch_start + BATCH_SIZE]

        try:
            raw_outputs = run_inference_batch(
                model,
                tokenizer,
                batch_records,
            )


            for record, raw_output in zip(batch_records,raw_outputs,):

                result = process_result(raw_output, record)
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
                    print("RAW OUTPUT FOR ", record.get('source_id'), ":", raw_output)

        except Exception as e:

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

        finally:
        # ADD THIS — force release of GPU memory every batch
            torch.cuda.empty_cache()
            gc.collect()

    # ========================================================================
    # OUTPUT
    # ========================================================================

    output = {

        "generated_at": datetime.now(
            UTC
        ).isoformat(),

        "model": str(MODEL_PATH),

        "gpu": torch.cuda.get_device_name(0),

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

    # Make the output visible to other Modal processes.
    volume.commit()

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
        f"GPU           : "
        f"{torch.cuda.get_device_name(0)}"
    )

    print(
        f"\nOutput:\n{OUTPUT_PATH}"
    )


# ============================================================================
# LOCAL ENTRYPOINT
# ============================================================================

@app.local_entrypoint()
def main():

    run_extraction.remote()
