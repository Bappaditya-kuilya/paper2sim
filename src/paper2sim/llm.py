"""LLM provider fallback chain — Groq → OpenRouter → Gemini → mock.

One function on day one (text.md §2.1). Every provider 429s during a demo;
the mock last resort keeps the app alive instead of erroring in front of a judge.
Uses httpx (already installed) + OpenAI-compatible endpoints. No new deps.
"""

import json
import logging
import os

import httpx

logger = logging.getLogger(__name__)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"


def strip_fences(content: str) -> str:
    """Reuse of breakdown_client.py:63-66 fence-strip for all providers."""
    if "```json" in content:
        return content.split("```json")[1].split("```")[0]
    if "```" in content:
        return content.split("```")[1].split("```")[0]
    return content


def _post(url: str, headers: dict, payload: dict) -> str:
    resp = httpx.post(url, headers=headers, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"] or ""


def _groq(system: str, user: str, max_tokens: int) -> str:
    key = os.environ.get("GROQ_API_KEY", "")
    if not key:
        raise RuntimeError("no groq key")
    model = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
    return _post(
        GROQ_URL,
        {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        {"model": model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}], "temperature": 0.3, "max_tokens": max_tokens},
    )


def _openrouter(system: str, user: str, max_tokens: int) -> str:
    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        raise RuntimeError("no openrouter key")
    # text.md §1.3: free list rotates — default to auto-router, allow override list via comma env
    models = os.environ.get("OPENROUTER_MODEL", "openrouter/free")
    last_err: Exception | None = None
    for model in [m.strip() for m in models.split(",") if m.strip()]:
        try:
            return _post(
                OPENROUTER_URL,
                {"Authorization": f"Bearer {key}", "Content-Type": "application/json", "HTTP-Referer": "https://paper2sim.local", "X-Title": "paper2sim"},
                {"model": model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}], "temperature": 0.3, "max_tokens": max_tokens},
            )
        except Exception as e:  # noqa: BLE001 — try next model in list
            last_err = e
    raise RuntimeError(f"openrouter failed: {last_err}")


def _gemini(system: str, user: str, max_tokens: int) -> str:
    key = os.environ.get("GOOGLE_AI_STUDIO_API_KEY", "")
    if not key:
        raise RuntimeError("no gemini key")
    model = os.environ.get("GOOGLE_MODEL", "gemini-2.0-flash")
    return _post(
        GEMINI_URL,
        {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        {"model": model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}], "temperature": 0.3, "max_tokens": max_tokens},
    )


def _mock(system: str, user: str) -> str:
    """Deterministic offline fallback (Monte Carlo π). Real models ignore TASK: lines."""
    if "TASK: ANALYZE" in system:
        payload = {
            "claim": "Monte Carlo pi converges at O(1/sqrt(N))",
            "why_it_matters": "Validates LLN",
            "simulation_plan": "Sample N points, estimate pi, check slope",
            "viz_type": "statistical",
        }
        return json.dumps(payload)
    if "TASK: GENERATE" in system:
        lines = [
            "import json, random",
            "random.seed(0)",
            "N=2000",
            "inside=sum(1 for _ in range(N) if random.random()**2+random.random()**2<=1)",
            "pi_est=4*inside/N",
            "open('scene.json','w').write(json.dumps({'type':'statistical'}))",
            "print('RESULT_JSON: ' + json.dumps({'metrics': {'pi': pi_est}, 'verdict': 'supported'}))",
        ]
        return "```python\n" + "\n".join(lines) + "\n```"
    return json.dumps({"verdict": "supported", "summary": "Mock run: π estimate within tolerance (offline mode)."})


def chat(system: str, user: str, max_tokens: int = 8000) -> str:
    """Try Groq → OpenRouter → Gemini → mock. Never raises for missing keys."""
    for fn in (_groq, _openrouter, _gemini):
        try:
            return fn(system, user, max_tokens)
        except Exception as e:  # noqa: BLE001 — failover is the point
            logger.warning(f"LLM provider {fn.__name__} failed, failing over: {e}")
    return _mock(system, user)
