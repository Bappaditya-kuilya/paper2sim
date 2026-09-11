"""Constants for Paper2Sim."""

# Equation types
EQUATION_TYPES = [
    "trigonometric", "polynomial", "exponential", "logarithmic",
    "physics", "ode", "matrix", "probability", "statistical", "function"
]

# Template names
TEMPLATES = [
    "TrigSurface", "PolySurface", "ExpSurface", "LogSurface",
    "ForceField", "SlopeField", "MatrixVis", "ProbDiagram",
    "DistChart", "GenericSurface"
]

# API defaults
DEFAULT_MODEL = "llama-3.3-70b-versatile"
MAX_EQUATIONS = 100
MAX_TEXT_LENGTH = 10000
