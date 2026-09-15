"""Pipeline prompts — analyze / generate / repair / summarize (PRD §7).

The GENERATE prompt carries the scene.json schema verbatim: that schema is
the one contract coupling the sandbox to the React 3D layer. Mock provider
keys off the TASK: lines (real models ignore them).
"""

RENDERER_TYPES = (
    "trigonometric, polynomial, exponential, logarithmic, hyperbolic, "
    "matrix, probability, statistical, ode, physics, generic, trajectory"
)

SCENE_SCHEMA = """{
  "type": "trigonometric | polynomial | exponential | logarithmic | hyperbolic | matrix | probability | statistical | ode | physics | generic | trajectory",
  "expression": "sin(x) * cos(y)",
  "coefficients": [1, 0, -3],
  "x_range": [-5, 5],
  "y_range": [-5, 5],
  "resolution": 60,
  "extra": { "trajectory": [[x, y, z], ...], "vectors": [{"origin": [x, y, z], "dir": [dx, dy, dz]}] }
}"""

ANALYZE_SYSTEM = """TASK: ANALYZE
Extract the single most important TESTABLE claim from this paper text.
Return ONLY JSON: {"claim": "...", "why_it_matters": "...", "simulation_plan": "...", "viz_type": "..."}.
viz_type must be one of: """ + RENDERER_TYPES + """.
Pick the closest match; use "trajectory" for particle paths / geodesics / orbits, "generic" if unsure."""

GENERATE_SYSTEM = """TASK: GENERATE
Write ONE self-contained Python script testing the plan below.
Allowed imports only: stdlib math/random/statistics/itertools/collections/json plus numpy, scipy, sympy, networkx, pandas, matplotlib (Agg backend, never plt.show()), PIL, imageio.
Rules: seed all randomness; save figures as figure_1.png, figure_2.gif, ... in the working directory.
In addition to figures, write scene.json matching this schema EXACTLY (this drives the 3D renderer — pick the closest type from: """ + RENDERER_TYPES + """):
""" + SCENE_SCHEMA + """
Final stdout line must be exactly:
RESULT_JSON: {"metrics": {...}, "verdict": "supported|refuted|inconclusive", "explanation": "..."}
Return ONLY a ```python code block. No prose."""

GENERATE_STRICT = GENERATE_SYSTEM + "\nSTRICT: your last attempt had no usable code block. Output NOTHING but the ```python block."

REPAIR_SYSTEM = """TASK: REPAIR
The script below crashed. Fix ONLY the bug described by stderr, keep the same scene.json contract and RESULT_JSON final line.
Allowed imports: stdlib math/random/statistics/itertools/collections/json plus numpy, scipy, sympy, networkx, pandas, matplotlib (Agg), PIL, imageio.
Return ONLY a ```python code block. No prose."""

SUMMARIZE_SYSTEM = """TASK: SUMMARIZE
Write a plain-language verdict (2-4 sentences) referencing the measured numbers below.
State whether the simulation supports, refutes, or is inconclusive about the claim, with one confidence caveat.
Return ONLY JSON: {"summary": "..."}."""
