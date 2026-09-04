"""Equation extraction from LaTeX source or plain text."""

import json
import os
import re


EXTRACT_EQUATIONS_PROMPT = """Extract the key mathematical equations from this paper text. For each equation:
1. Rewrite it in clean LaTeX notation
2. Classify it as: matrix, sum, integral, equation, inequality, function_def, or unknown
3. Assign a template if applicable: matrix_multiply, attention_heatmap, gradient_descent, convolution_1d, softmax_distribution, embedding_lookup, loss_landscape, transformer_block, linear_combination, probability_distribution

Return a JSON array:
[{"latex": "...", "label": "...", "type": "display", "template": "template_name_or_null", "params": {}, "importance": "high|medium|low"}]

Focus on the 5-10 most important equations. Return ONLY valid JSON, no markdown."""




def extract_equations_from_tex(tex_content: str) -> list[dict]:
    """Extract equations from LaTeX source.

    Finds display equations (\\begin{equation}.., \\[.., $$..$$) and
    inline equations ($...$) that contain math operators.
    """
    equations: list[dict] = []

    # Display: \begin{equation}...\end{equation} (with optional \label)
    for m in re.finditer(r"\\begin\{equation\}.*?\\end\{equation\}", tex_content, re.DOTALL):
        label = _extract_label(tex_content, m.start())
        eq_text = m.group(0)
        equations.append({
            "latex": eq_text,
            "label": label,
            "type": "display",
            "position": m.start(),
        })

    # Display: \[...\]
    for m in re.finditer(r"\\\[(.+?)\\\]", tex_content, re.DOTALL):
        label = _extract_label(tex_content, m.start())
        equations.append({
            "latex": m.group(0),
            "label": label,
            "type": "display",
            "position": m.start(),
        })

    # Display: $$...$$
    for m in re.finditer(r"\$\$(.+?)\$\$", tex_content, re.DOTALL):
        label = _extract_label(tex_content, m.start())
        equations.append({
            "latex": m.group(0),
            "label": label,
            "type": "display",
            "position": m.start(),
        })

    # Inline: $...$ — only if it looks like math
    for m in re.finditer(r"(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)", tex_content):
        candidate = m.group(1)
        if _looks_like_math(candidate):
            label = _extract_label(tex_content, m.start())
            equations.append({
                "latex": m.group(0),
                "label": label,
                "type": "inline",
                "position": m.start(),
            })

    return equations


def _extract_label(text: str, offset: int) -> str | None:
    """Try to find a \\label{...} near the given position (within ~200 chars)."""
    window = text[max(0, offset - 200) : offset + 200]
    m = re.search(r"\\label\{([^}]+)\}", window)
    return m.group(1) if m else None


def _looks_like_math(content: str) -> bool:
    """Heuristic: does this inline content look like an equation?"""
    math_ops = r"[=+\-*/<>≤≥≈≠∑∫∏∂∇√∞]|\\(?:frac|sum|int|prod|partial|nabla|sqrt|alpha|beta|gamma|theta|delta|sigma|lambda|omega)"
    return bool(re.search(math_ops, content))


def extract_equations_from_text(text: str) -> list[dict]:
    """Fallback extraction from plain text (e.g. PDF output).

    Looks for lines with math operators, Greek letters, or symbols.
    """
    equations: list[dict] = []
    for line in text.splitlines():
        line = line.strip()
        if not line or _is_garbage(line):
            continue
        if _line_has_math(line):
            equations.append({
                "latex": line,
                "label": None,
                "type": "inferred",
                "position": text.find(line),
            })
    return equations


def extract_equations_with_llm(text: str, api_key: str | None = None, model: str = "openai/gpt-oss-120b") -> list[dict]:
    """Use LLM to extract equations from plain text (PDF fallback).

    Args:
        text: Plain text extracted from PDF.
        api_key: Groq API key. Falls back to GROQ_API_KEY env var.
        model: Model to use for extraction.

    Returns:
        List of equation dicts with latex, label, type, template, params.
    """
    from openai import OpenAI

    api_key = api_key or os.environ.get("GROQ_API_KEY")
    if not api_key:
        return []

    client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")

    # Truncate text to fit in context
    truncated = text[:12000]

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": EXTRACT_EQUATIONS_PROMPT},
                {"role": "user", "content": f"Extract equations from this paper:\n\n{truncated}"},
            ],
            max_tokens=2048,
            temperature=0.2,
        )

        raw = response.choices[0].message.content or ""

        # Strip thinking blocks and markdown
        raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL)
        raw = re.sub(r"```json\s*", "", raw)
        raw = re.sub(r"```\s*$", "", raw.strip())
        raw = re.sub(r"\*\*", "", raw)

        data = json.loads(raw)
        if isinstance(data, list):
            # Filter out garbage equations
            return [eq for eq in data if isinstance(eq, dict) and not _is_garbage(eq.get("latex", ""))]
        return []
    except Exception:
        return []


def _line_has_math(line: str) -> bool:
    """Check if a line looks mathematical."""
    # Greek letters or math symbols
    if re.search(r"[αβγδεζηθικλμνξπρστφχψω]", line):
        return True
    if re.search(r"[∑∫∏∂∇√∞≈≤≥≠±×÷]", line):
        return True
    # Lines with = and at least one operator
    if re.search(r"=", line) and re.search(r"[+\-*/^√∑∫]", line):
        return True
    return False


def _is_garbage(text: str) -> bool:
    """Filter out garbled/corrupted text that isn't real LaTeX."""
    if len(text.strip()) < 3:
        return True
    # Count non-ASCII characters — if >10% of the string, it's garbage
    non_ascii = sum(1 for c in text if ord(c) > 127)
    if len(text) > 0 and non_ascii / len(text) > 0.1:
        return True
    # Must contain at least one ASCII letter or common LaTeX char
    if not re.search(r"[a-zA-Z0-9=+\-*/^\\{}()]", text):
        return True
    return False


def classify_equation(latex: str) -> str:
    """Classify equation by type using keyword matching."""
    # Specific patterns FIRST (before generic \frac catch-all)
    if re.search(r"(?:attention|multihead|softmax|\\operatorname\{softmax\})", latex, re.IGNORECASE):
        return "function_def"
    if re.search(r"(?:\\(?:log|sin|cos|tan|exp|max|min|argmax|argmin|softmax)|\\text\{(?:log|sin|cos|tan|exp|max|min|argmax|argmin|softmax)\})\s*[\({]", latex):
        return "function_def"
    if re.search(r"(?:layernorm|layer.?norm|sublayer|residual)", latex, re.IGNORECASE):
        return "function_def"
    if re.search(r"(?:embedding|vocab|token)", latex, re.IGNORECASE):
        return "function_def"
    # Generic patterns
    if re.search(r"\\begin\{(?:bmatrix|pmatrix|vmatrix|matrix|array|cases)\}", latex):
        return "matrix"
    if re.search(r"\\(?:sum|prod|bigcup|bigcap)", latex):
        return "sum"
    if re.search(r"\\int", latex):
        return "integral"
    if re.search(r"\\frac\{[^}]*\}\{[^}]*[a-zA-Z]", latex):
        return "equation"
    if re.search(r"[≤≥<>](?!>)|\\leq|\\geq|\\leqslant|\\geqslant|\\nless|\\ngtr", latex):
        return "inequality"
    return "unknown"


def select_templates(equations: list[dict]) -> list[dict]:
    """Map equations to Manim template names."""
    results = []
    for eq in equations:
        eq_type = classify_equation(eq["latex"])
        template = _template_for_type(eq_type, eq["latex"])
        results.append({
            "equation": eq["latex"],
            "template": template,
            "params": {},
        })
    return results


def _template_for_type(eq_type: str, latex: str) -> str | None:
    """Select a template based on equation type and content."""
    if eq_type == "matrix":
        dims = _extract_matrix_dims(latex)
        if dims:
            return "matrix_multiply"
    if eq_type == "sum":
        if re.search(r"Q|K|V|attention|softmax", latex, re.IGNORECASE):
            return "attention_heatmap"
        return "softmax_distribution"
    if eq_type == "integral":
        return "probability_distribution"
    if eq_type == "function_def":
        # Attention-specific: softmax(QK^T/sqrt(d)) -> attention_heatmap
        if re.search(r"softmax|\\operatorname\{softmax\}", latex, re.IGNORECASE):
            if re.search(r"Q|K|V|query|key|value", latex):
                return "attention_heatmap"
            return "softmax_distribution"
        # MultiHead -> transformer_block
        if re.search(r"multi.?head|concat.*head", latex, re.IGNORECASE):
            return "transformer_block"
        # LayerNorm/Sublayer -> transformer_block
        if re.search(r"layernorm|layer.?norm|sublayer", latex, re.IGNORECASE):
            return "transformer_block"
        # Embedding -> embedding_lookup
        if re.search(r"embedding|vocab|token", latex, re.IGNORECASE):
            return "embedding_lookup"
        # Loss/cost -> loss_landscape
        if re.search(r"loss|cost|L\s*[=(]|J\s*\(|minimize", latex, re.IGNORECASE):
            return "loss_landscape"
        # Sin/cos wave -> linear_combination
        if re.search(r"\\sin|\\cos|\\sinh|\\cosh", latex):
            return "linear_combination"
        # Gradient -> gradient_descent
        if re.search(r"gradient|\\nabla|partial", latex):
            return "gradient_descent"
        # Generic function with equals -> linear_combination
        if re.search(r"=", latex):
            return "linear_combination"
    if eq_type == "equation":
        # Scaling factor 1/sqrt(d_k) -> attention_heatmap
        if re.search(r"frac.*sqrt.*d", latex):
            return "attention_heatmap"
        # Generic equation with equals sign -> linear_combination
        if re.search(r"=", latex):
            return "linear_combination"
    if eq_type == "unknown":
        # Last resort: try to find any plottable content
        if re.search(r"=", latex):
            return "linear_combination"
    return None


def _extract_matrix_dims(latex: str) -> tuple[int, int] | None:
    """Try to extract matrix dimensions from LaTeX."""
    for env in ("bmatrix", "pmatrix", "vmatrix", "matrix"):
        pattern = rf"\\begin\{{{env}\}}(.*?)\\end\{{{env}\}}"
        m = re.search(pattern, latex, re.DOTALL)
        if m:
            rows = m.group(1).strip().split("\\\\")
            if rows:
                cols = len(rows[0].split("&"))
                return (len(rows), cols)
    return None
