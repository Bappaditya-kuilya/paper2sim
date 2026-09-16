"""Equation extraction from LaTeX source or plain text.

Slimmed port of ``paper2sim.equations``: keeps extraction + classification,
drops the Manim template map (``select_templates``) and the LLM fallback
(``extract_equations_with_llm`` pulls in ``openai``/GROQ). Stdlib only.
"""

import re


def extract_equations_from_tex(tex_content: str) -> list[dict[str, str]]:
    """Extract equations from LaTeX source.

    Finds display equations (\\begin{equation}.., \\[...\\], $$..$$) and
    inline equations ($...$) that contain math operators. Each result is
    ``{"latex": ..., "type": ..., "label": ...}`` with ``type`` from
    :func:`classify_equation` and ``label`` None when no ``\\label`` is near.
    Overlapping spans across patterns are emitted once (display wins).
    """
    found: list[tuple[int, dict]] = []
    spans: list[tuple[int, int]] = []

    def _add(start: int, end: int, latex: str, label: str | None) -> None:
        if any(start < taken_end and taken_start < end for taken_start, taken_end in spans):
            return
        spans.append((start, end))
        found.append((start, {"latex": latex, "type": classify_equation(latex), "label": label}))

    # Display: \begin{equation}...\end{equation} (with optional \label)
    for m in re.finditer(r"\\begin\{equation\}.*?\\end\{equation\}", tex_content, re.DOTALL):
        _add(m.start(), m.end(), m.group(0), _extract_label(tex_content, m.start()))

    # Display: \[...\]
    for m in re.finditer(r"\\\[(.+?)\\\]", tex_content, re.DOTALL):
        _add(m.start(), m.end(), m.group(0), _extract_label(tex_content, m.start()))

    # Display: $$...$$
    for m in re.finditer(r"\$\$(.+?)\$\$", tex_content, re.DOTALL):
        _add(m.start(), m.end(), m.group(0), _extract_label(tex_content, m.start()))

    # Inline: $...$ — only if it looks like math
    for m in re.finditer(r"(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)", tex_content):
        if _looks_like_math(m.group(1)):
            _add(m.start(), m.end(), m.group(0), _extract_label(tex_content, m.start()))

    return [entry for _, entry in found]


def _extract_label(text: str, offset: int) -> str | None:
    """Extract \\label{...} from LaTeX text near a given offset."""
    window = text[max(0, offset - 200) : offset + 200]
    m = re.search(r"\\label\{([^}]+)\}", window)
    return m.group(1) if m else None


def _looks_like_math(content: str) -> bool:
    """Heuristic check if inline content looks like math notation."""
    math_ops = r"[=+\-*/<>≤≥≈≠∑∫∏∂∇√∞]|\\(?:frac|sum|int|prod|partial|nabla|sqrt|alpha|beta|gamma|theta|delta|sigma|lambda|omega)"
    return bool(re.search(math_ops, content))


def extract_equations_from_text(text: str) -> list[dict[str, str]]:
    """Fallback extraction from plain text (e.g. PDF output).

    Looks for lines with math operators, Greek letters, or symbols.
    Offsets advance through the text so repeated lines each get their true
    span (``str.find`` would report the first occurrence's position twice).
    """
    equations: list[dict] = []
    seen: set[tuple[int, int]] = set()
    offset = 0
    for raw in text.splitlines(keepends=True):
        line = raw.strip()
        start = offset + (len(raw) - len(raw.lstrip()))
        offset += len(raw)
        if not line or _is_garbage(line):
            continue
        if _line_has_math(line):
            span = (start, start + len(line))
            if span in seen:
                continue
            seen.add(span)
            equations.append({"latex": line, "type": classify_equation(line), "label": None})
    return equations


def _line_has_math(line: str) -> bool:
    """Check if a line of text contains mathematical notation."""
    # Greek letters or math symbols
    if re.search(r"[αβγδεζηθικλμνξπρστφχψω]", line):
        return True
    if re.search(r"[∑∫∏∂∇√∞≈≤≥≠±×÷]", line):
        return True
    # Lines with = and at least one operator
    if re.search(r"=", line) and re.search(r"[+\-*/^√∑∫]", line):
        return True
    # Bare function calls carry no operator (y=sin(x), f(x)=x): mirror
    # classify_equation's function rules so functions reach the plot path.
    if re.search(r"=\s*[^=]*\b(sin|cos|tan|asin|acos|atan|exp|log|ln|sqrt|abs)\s*\(", line):
        return True
    if re.match(r"\s*[a-zA-Z]\w*\s*\([^()]*\)\s*=", line):
        return True
    return False


# Unicode ranges that are legitimate math content. _line_has_math treats
# Greek letters and operators as math signals, so the garbage filter must
# not penalize them: the old ">10% non-ASCII" rule flagged real equations
# like "α + β = γ". Only non-ASCII OUTSIDE these ranges (mojibake from
# corrupted PDF bytes, e.g. CJK/private-use soup) counts toward the ratio.
_MATH_UNICODE_RANGES = (
    (0x0370, 0x03FF),  # Greek and Coptic
    (0x1F00, 0x1FFF),  # Greek Extended
    (0x2190, 0x21FF),  # Arrows
    (0x2200, 0x22FF),  # Mathematical Operators
    (0x2300, 0x23FF),  # Miscellaneous Technical
)


def _is_math_symbol(char: str) -> bool:
    """Check if a character falls in a known math Unicode range."""
    code = ord(char)
    return any(start <= code <= end for start, end in _MATH_UNICODE_RANGES)


def _is_garbage(text: str) -> bool:
    """Filter out garbled/corrupted text that isn't real math.

    Catches: too short, mostly non-math non-ASCII (corrupted PDF Unicode),
    or no recognizable math characters.
    """
    if len(text.strip()) < 3:
        return True
    # Count non-ASCII characters that are NOT known math symbols.
    foreign = sum(1 for c in text if ord(c) > 127 and not _is_math_symbol(c))
    if len(text) > 0 and foreign / len(text) > 0.1:
        return True
    # Must contain at least one ASCII LaTeX char or recognized math content.
    if not re.search(r"[a-zA-Z=+\-*/^_{}\\]", text) and not _line_has_math(text):
        return True
    return False


def classify_equation(latex: str) -> str:
    """Classify equation by type using keyword matching.

    Returns one of: function_def, matrix, sum, integral, equation, inequality, unknown
    """
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
    # Inequality: symbolic forms are unambiguous; bare < > exclude arrows (x -> 0),
    # implications (=>) and shifts (<<, >>) via lookarounds
    if re.search(r"[≤≥]|\\leq|\\geq|\\leqslant|\\geqslant|\\nless|\\ngtr", latex):
        return "inequality"
    if re.search(r"<=|>=|!=|<>|(?<![\-=<>])[<>](?![\-=<>])", latex):
        return "inequality"
    # Plain-text math (paste/type path carries no TeX commands — same type intent).
    # ponytail: regexes only; an LLM re-classify pass would cost latency per keystroke-ish
    # request for zero accuracy gain on these closed forms.
    if re.search(r"∑|\bsum\s*[_(\[]", latex):
        return "sum"
    if re.search(r"∫|\bintegral\b", latex):
        return "integral"
    # Plain inequality, excluding arrows (x -> 0) and shifts (<<, >>, =>)
    if re.search(r"<=|>=|!=|<>|(?<![\-=<>])[<>](?![\-=<>])", latex):
        return "inequality"
    # Plain function: f(x) = ... | y = sin/cos/...(...) | polynomial/explicit in x
    if re.search(r"^\s*[a-zA-Z]\w*\s*\([^()]*\)\s*=", latex):
        return "function_def"
    if re.search(r"=\s*[^=]*\b(sin|cos|tan|asin|acos|atan|exp|log|ln|sqrt|abs)\s*\(", latex):
        return "function_def"
    # Single-var `Name = ...x-form...` with letter-glued x (`y = mx + c`): the
    # older x-rule only sees digit/space-glued x (`2x`), so `mx` fell to equation.
    if re.search(r"^\s*[a-zA-Z]\w*\s*=\s*[^=]*[A-Za-z0-9)]x\b", latex):
        return "function_def"
    if re.search(r"x\s*(\^|\*\*)|(\^|\*\*)\s*x\b|([\d\s+\-*/(\^])x\b", latex):
        return "function_def"
    # Arrows/implications (a=>b, x->0) are not formulas: unknown, not equation
    if re.search(r"=>|->", latex):
        return "unknown"
    # Generic formula with '=' (E = mc^2): equation, not unknown
    if "=" in latex:
        return "equation"
    return "unknown"
