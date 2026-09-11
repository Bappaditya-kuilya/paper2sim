"""Equation normalization and classification for the API layer.

Converts user input (plain text, LaTeX, word equations) to canonical form
and classifies to a model type for renderer selection.
"""

import re

# Known function names — don't break these with implicit multiply
FUNCTION_NAMES = {"sin", "cos", "tan", "sec", "csc", "cot", "log", "ln", "exp", "sqrt", "abs", "min", "max"}


def normalize_input(raw: str) -> str:
    """Normalize equation input to canonical math expression.

    Handles: LaTeX, plain text, y=, f(x)=, word equations, Greek letters.
    """
    s = raw.strip()

    # Lowercase everything first (before any processing)
    s = s.lower()

    # Strip LaTeX commands
    s = re.sub(r"\\(?:begin|end)\{[^}]*\}", "", s)
    s = re.sub(r"\\frac\{([^}]+)\}\{([^}]+)\}", r"(\1) / (\2)", s)
    s = re.sub(r"\\sqrt\{([^}]+)\}", r"sqrt(\1)", s)
    s = re.sub(r"\\(sin|cos|tan|log|ln|exp|sqrt)", r"\1", s)
    s = re.sub(r"\\[a-zA-Z]+", lambda m: m.group(0)[1:], s)

    # Strip "y =", "f(x) =", etc. from left side
    s = re.sub(r"^[a-zA-Z_]\w*(?:\(.*?\))?\s*=\s*", "", s)
    # Keep right side of "="
    eq_idx = s.find("=")
    if eq_idx != -1:
        s = s[eq_idx + 1:]

    # Greek letters (before implicit multiply)
    greek = {
        "α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta",
        "θ": "theta", "λ": "lambda", "μ": "mu", "σ": "sigma",
        "π": "pi", "ω": "omega",
    }
    for sym, name in greek.items():
        s = s.replace(sym, name)

    # Lowercase function names (before paren multiply)
    s = re.sub(r"\b(Sin|Cos|Tan|Log|Ln|Exp|Sqrt)\b", lambda m: m.group(0).lower(), s)

    # Implicit multiply: digit→letter (2x → 2*x), letter→digit (x2 → x*2)
    s = re.sub(r"(\d)([a-zA-Z])", r"\1*\2", s)
    s = re.sub(r"([a-zA-Z])(\d)", r"\1*\2", s)

    # Paren→letter: )x → )*x
    s = re.sub(r"\)([a-zA-Z])", r")*\1", s)

    # Letter→paren: x( → x*( — but NOT for function names like sin(
    def add_multiply_before_paren(m):
        word = m.group(1)
        if word.lower() in FUNCTION_NAMES:
            return word + "("
        return word + "*("

    s = re.sub(r"([a-zA-Z]+)\(", add_multiply_before_paren, s)

    # Letter-letter multiply for known physics variables
    physics_vars = {"ma": "m*a", "mv": "m*v", "KE": "K*E", "PV": "P*V"}
    for k, v in physics_vars.items():
        s = re.sub(r"\b" + k + r"\b", v, s)

    return s.strip()


def classify_expression(expr: str) -> str:
    """Classify a normalized expression to a model type."""
    if re.search(r"\b(sin|cos|tan|sec|csc|cot)\b", expr):
        return "trigonometric"
    if re.search(r"\b(exp|e\^|2\^|\d+\^)", expr):
        return "exponential"
    if re.search(r"\^", expr) and not re.search(r"\bsin|cos|exp|log", expr):
        return "polynomial"
    if re.search(r"\b(log|ln|log_?\d)", expr):
        return "logarithmic"
    if re.search(r"\b(F|E|V|I|P|m|g|h|k|r|G|M|Q|n|R|T|S|W|τ|ω|v)\b", expr) and re.search(r"[=*]", expr):
        return "physics"
    if re.search(r"d[ya]\s*[/]", expr):
        return "ode"
    if re.search(r"[A-Z]\s*[*·]\s*[A-Z]", expr):
        return "matrix"
    if re.search(r"\b(P|Prob|P\(|Bayes|conditional)\b", expr):
        return "probability"
    if re.search(r"\b(μ|σ|Σ|var|std|mean|stddev)\b", expr):
        return "statistical"
    return "function"
