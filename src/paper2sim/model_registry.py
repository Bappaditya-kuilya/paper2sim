"""Model registry — maps equation types to visualization parameters.

Each model type defines what parameters it needs for 3D visualization.
"""

from dataclasses import dataclass


@dataclass
class ParamSchema:
    name: str
    label: str
    min_val: float
    max_val: float
    default: float
    step: float


MODELS = {
    "trigonometric": {
        "renderer": "TrigSurface",
        "params": [
            ParamSchema("freq", "Frequency", 0.1, 10, 1, 0.1),
            ParamSchema("amp", "Amplitude", 0.1, 10, 1, 0.1),
            ParamSchema("phase", "Phase", -3.14, 3.14, 0, 0.1),
        ],
    },
    "polynomial": {
        "renderer": "PolySurface",
        "params": [
            ParamSchema("coeff", "Coefficient", -10, 10, 1, 0.1),
        ],
    },
    "exponential": {
        "renderer": "ExpSurface",
        "params": [
            ParamSchema("base", "Base", 0.1, 10, 2.718, 0.1),
            ParamSchema("rate", "Rate", 0.1, 10, 1, 0.1),
        ],
    },
    "logarithmic": {
        "renderer": "LogSurface",
        "params": [
            ParamSchema("base", "Base", 2, 10, 2.718, 0.1),
        ],
    },
    "physics": {
        "renderer": "ForceField",
        "params": [
            ParamSchema("mass", "Mass (kg)", 0.1, 100, 1, 0.1),
            ParamSchema("accel", "Acceleration (m/s²)", 0, 50, 9.8, 0.1),
        ],
    },
    "ode": {
        "renderer": "SlopeField",
        "params": [
            ParamSchema("init_y", "Initial Condition y(0)", -10, 10, 1, 0.1),
        ],
    },
    "matrix": {
        "renderer": "MatrixVis",
        "params": [],
    },
    "probability": {
        "renderer": "ProbDiagram",
        "params": [
            ParamSchema("p_a", "P(A)", 0, 1, 0.5, 0.01),
            ParamSchema("p_b", "P(B)", 0, 1, 0.5, 0.01),
        ],
    },
    "statistical": {
        "renderer": "DistChart",
        "params": [
            ParamSchema("mu", "Mean (μ)", -10, 10, 0, 0.1),
            ParamSchema("sigma", "Std Dev (σ)", 0.1, 10, 1, 0.1),
        ],
    },
    "function": {
        "renderer": "GenericSurface",
        "params": [],
    },
}


def get_model(model_type: str) -> dict | None:
    """Get model config by type."""
    return MODELS.get(model_type)


def list_models() -> list[dict]:
    """List all available models."""
    return [{"type": k, "renderer": v["renderer"], "params": [p.name for p in v["params"]]} for k, v in MODELS.items()]
