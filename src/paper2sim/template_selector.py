"""Template selector for Paper2Sim visualization."""


TEMPLATE_MAP = {
    "trigonometric": ["TrigSurface", "WaveAnimation"],
    "polynomial": ["PolySurface", "CurvePlot"],
    "exponential": ["ExpSurface", "GrowthChart"],
    "logarithmic": ["LogSurface", "LogPlot"],
    "physics": ["ForceField", "VectorField"],
    "ode": ["SlopeField", "PhasePortrait"],
    "matrix": ["MatrixVis", "Heatmap"],
    "probability": ["ProbDiagram", "VennDiagram"],
    "statistical": ["DistChart", "Histogram"],
    "function": ["GenericSurface", "ParametricPlot"],
}


def select_template(equation_type: str) -> str | None:
    """Select best template for equation type."""
    templates = TEMPLATE_MAP.get(equation_type)
    if templates:
        return templates[0]
    return None


def list_templates(equation_type: str) -> list[str]:
    """List all templates for equation type."""
    return TEMPLATE_MAP.get(equation_type, [])
