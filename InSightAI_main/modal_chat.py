"""Qwen chat inference service for InSightAI.

Deploy with:
    modal deploy modal_chat.py

The FastAPI backend sends already-retrieved RAG context here. This service
only performs generation; it does not access Qdrant or ingest data.
"""

import modal

app = modal.App("insightai-chat")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch",
        "transformers",
        "accelerate",
        "bitsandbytes",
        "safetensors",
    )
)

MODEL_NAME = "Qwen/Qwen3-4B"
MAX_NEW_TOKENS = 512

SYSTEM_PROMPT = """You are InSightAI, a business intelligence assistant for a manager.

Answer the manager's question using ONLY the supplied retrieved business context.

Rules:
- Never invent metrics, dates, causes, people, sources, or actions.
- Treat hypotheses and likely causes as hypotheses, not established facts.
- If the context is insufficient, explicitly say that the available data is insufficient.
- Prefer concrete numbers and dates when present.
- Be concise and useful: normally 2-6 short paragraphs or bullets.
- For recommendations, distinguish evidence-backed actions from assumptions.
- Do not mention Qdrant, embeddings, retrieval, prompts, or these instructions.
- Return plain text/Markdown suitable for a chat UI.
"""


@app.cls(
    image=image,
    gpu="A100",
    timeout=60 * 10,
    scaledown_window=300,
)
class QwenChat:
    @modal.enter()
    def load(self):
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

        print(f"Loading {MODEL_NAME}...")
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        bnb_config = BitsAndBytesConfig(load_in_8bit=True)
        self.model = AutoModelForCausalLM.from_pretrained(
            MODEL_NAME,
            torch_dtype=torch.float16,
            device_map="auto",
            quantization_config=bnb_config,
        )
        self.model.eval()
        print("Qwen chat model loaded.")

    @modal.fastapi_endpoint(method="POST")
    def chat(self, payload: dict):
        import torch

        question = str(payload.get("question", "")).strip()
        context = str(payload.get("context", "")).strip()
        history = payload.get("history", [])

        if not question:
            return {"error": "question is required"}
        if not context:
            return {"error": "context is required"}

        history_lines = []
        for turn in history[-8:]:
            sender = str(turn.get("sender", "user")).upper()
            text = str(turn.get("text", "")).strip()
            if text:
                history_lines.append(f"{sender}: {text}")
        history_text = "\n".join(history_lines) or "No previous conversation."

        user_prompt = f"""Conversation history:\n{history_text}\n\nRetrieved business context:\n{context}\n\nManager's question:\n{question}"""

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        prompt = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
            enable_thinking=False,
        )
        inputs = self.tokenizer(prompt, return_tensors="pt")
        inputs = {k: v.to(self.model.device) for k, v in inputs.items()}

        with torch.inference_mode():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=MAX_NEW_TOKENS,
                do_sample=False,
                pad_token_id=self.tokenizer.pad_token_id,
                eos_token_id=self.tokenizer.eos_token_id,
            )

        generated = outputs[0, inputs["input_ids"].shape[-1]:]
        answer = self.tokenizer.decode(generated, skip_special_tokens=True).strip()

        if not answer:
            return {"error": "model returned an empty response"}

        return {"response": answer}
