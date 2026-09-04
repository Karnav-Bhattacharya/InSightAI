# InSightAI — Runtime Telemetry & Cost Report

## Pipeline Stage Breakdown

| Stage | Model | Precision | Hardware | Records / Units | Batch Size | Avg. Latency | Wall-Clock Time |
|---|---|---|---|---|---|---|---|
| Unstructured signal extraction | Gemma-2-2B (fine-tuned) | 4-bit (bnb) | A100 (Modal) | ~600 records | 4 | ~3.2s / batch | ~8.0 min |
| KPI detection | pandas / NumPy | — | CPU (local) | 90 days × 20 series | — | ~0.4s total | <1 min |
| Investigation Agent | Qwen3-4B | 8-bit | A100 (Modal) | 5 movements | 1 | ~38s / movement | ~3.2 min |
| Recommendation Agent | Qwen3-4B | 4-bit (NF4) | A100 (Modal) | 5 movements | 1 | ~34s / movement | ~2.9 min |

**Total pipeline wall-clock (per run):** ~14.5 minutes
**Total GPU-backed wall-clock:** ~14.1 minutes (KPI detection is CPU-only, negligible)

---

## Token Usage

| Stage | Avg. Input Tokens | Avg. Output Tokens | Calls | Total Tokens (approx.) |
|---|---|---|---|---|
| Signal extraction | ~350 / record | ~120 / record | 150 batches (600 records) | ~282,000 |
| Investigation Agent | ~4,200 / movement | ~950 / movement | 5 | ~25,750 |
| Recommendation Agent | ~5,600 / movement | ~1,100 / movement | 5 | ~33,500 |
| **Total** | | | | **~341,250** |

---

## Estimated Cost per Pipeline Run

| Item | Value |
|---|---|
| Assumed A100 on-demand rate (Modal) | $2.10 / GPU-hour |
| Total GPU time | ~0.235 hours |
| **Estimated cost per full run** | **≈ $0.49** |
| Estimated cost per flagged movement (investigation + recommendation only) | ≈ $0.05 |

---

## Key Design Implication

GPU cost scales with **anomaly rate**, not raw data volume — the two LLM agents only run per *flagged movement*, not per data row. Doubling the underlying sales/marketing data volume does not double LLM spend; only a higher rate of material KPI movements does. The extraction stage (Gemma-2-2B, batched) is the main fixed cost driver since it runs once per unstructured record regardless of anomaly rate — this is why a small, fine-tuned model was used there instead of Qwen3-4B.

---
