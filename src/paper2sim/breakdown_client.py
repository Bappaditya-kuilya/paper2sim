"""Breakdown client — uses LLM to analyze equations from papers."""

import json
import logging
import os

import httpx

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions"


def breakdown_equations(equations: list[dict], model: str = "llama-3.3-70b-versatile") -> dict:
    """Break down equations into concept explanations.

    Args:
        equations: List of equation dicts with 'latex' and 'type' keys.
        model: LLM model to use.

    Returns:
        Dict with 'breakdowns' list containing explanations per equation.
    """
    if not GROQ_API_KEY:
        return {"error": "GROQ_API_KEY not set", "breakdowns": []}

    eq_text = "\n".join(f"- {e['latex']} ({e.get('type', 'unknown')})" for e in equations)

    prompt = f"""Analyze these equations and explain each one in simple terms.
For each equation, provide:
1. What it represents
2. Key variables and their meaning
3. A plain-English explanation
4. What visual would help explain it

Equations:
{eq_text}

Return JSON with a "breakdowns" array, each containing:
- latex: the original equation
- name: common name if any
- explanation: plain English
- variables: dict of var -> meaning
- visualization_hint: what 3D viz would help"""

    try:
        response = httpx.post(
            GROQ_BASE_URL,
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "max_tokens": 2000,
            },
            timeout=30,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]

        # Try to extract JSON from response
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        return json.loads(content)
    except Exception as e:
        logger.error(f"Breakdown failed: {e}")
        return {"error": str(e), "breakdowns": []}
