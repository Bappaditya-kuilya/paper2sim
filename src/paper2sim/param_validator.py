"""Parameter validation for Paper2Sim render requests."""


def validate_params(params: dict, param_schema: list[dict]) -> dict:
    """Validate and clamp parameters to schema bounds.

    Args:
        params: User-provided parameters.
        param_schema: List of param definitions with min/max/default.

    Returns:
        Validated and clamped parameters.
    """
    validated = {}
    schema_map = {p["name"]: p for p in param_schema}

    for name, schema in schema_map.items():
        val = params.get(name, schema["default"])
        val = max(schema["min"], min(schema["max"], val))
        validated[name] = val

    return validated
