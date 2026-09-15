"""AST import allowlist — cheapest, highest-value security addition (PRD §9.8).

20-line walk that rejects `import os/socket/subprocess`-style escapes
before the sandbox ever sees the file. Missing from the reference repo.
"""

import ast

ALLOWED_TOP = frozenset({
    "numpy", "scipy", "sympy", "networkx", "pandas", "matplotlib",
    "PIL", "imageio", "mpl_toolkits",
    "math", "random", "statistics", "itertools", "collections",
    "json", "dataclasses", "typing", "functools", "operator",
})


def check_imports(source: str) -> None:
    """Raise ValueError if any import falls outside the allowlist."""
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name.split(".")[0] not in ALLOWED_TOP:
                    raise ValueError(f"blocked import: {alias.name}")
        elif isinstance(node, ast.ImportFrom):
            if (node.module or "").split(".")[0] not in ALLOWED_TOP:
                raise ValueError(f"blocked import: {node.module}")
