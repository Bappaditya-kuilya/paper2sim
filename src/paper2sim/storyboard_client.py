"""Storyboard client — generates animation plans from equation breakdowns."""

import json
import logging
import os

import httpx

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions"


def generate_storyboard(topic: dict, source_text: str = "", model: str = "llama-3.3-70b-versatile") -> dict:
    """Generate animation storyboard from topic analysis.

    Args:
        topic: Topic dict with 'name', 'description', 'equations'.
        source_text: Optional paper text for context.
        model: LLM model to use.

    Returns:
        Dict with 'scenes' list for animation.
    """
    if not GROQ_API_KEY:
        return {"error": "GROQ_API_KEY not set", "scenes": []}

    prompt = f"""Create an animation storyboard for explaining this mathematical topic.

Topic: {topic.get('name', 'Unknown')}
Description: {topic.get('description', '')}
Equations: {json.dumps(topic.get('equations', []))}

{f'Context from paper: {source_text[:500]}' if source_text else ''}

Generate a sequence of animation scenes. Each scene should have:
- title: scene name
- duration: seconds
- description: what happens
- equation_focus: which equation to highlight
- viz_type: "surface", "field", "chart", "diagram", or "text"
- camera: suggested camera position/movement

Return JSON with a "scenes" array."""

    try:
        response = httpx.post(
            GROQ_BASE_URL,
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.5,
                "max_tokens": 3000,
            },
            timeout=30,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]

        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        return json.loads(content)
    except Exception as e:
        logger.error(f"Storyboard generation failed: {e}")
        return {"error": str(e), "scenes": []}
