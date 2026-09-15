"""scene.json contract — the one coupling between sandbox and React 3D layer (PRD §7).

Fail closed: malformed or oversized payloads raise, never reach the renderer.
"""

from typing import Literal

from pydantic import BaseModel, Field, field_validator

SceneType = Literal[
    "trigonometric", "polynomial", "exponential", "logarithmic", "hyperbolic",
    "matrix", "probability", "statistical", "ode", "physics", "generic", "trajectory",
]

MAX_TRAJ_POINTS = 20000
MAX_VECTORS = 5000


class Scene(BaseModel):
    type: SceneType
    expression: str = Field(max_length=2000, default="")
    coefficients: list[float] = Field(default_factory=list, max_length=64)
    x_range: tuple[float, float] = (-5, 5)
    y_range: tuple[float, float] = (-5, 5)
    resolution: int = Field(default=60, ge=8, le=200)
    extra: dict = Field(default_factory=dict)

    @field_validator("x_range", "y_range")
    @classmethod
    def _valid_range(cls, v: tuple[float, float]) -> tuple[float, float]:
        lo, hi = v
        if not (lo < hi and abs(lo) <= 1e6 and abs(hi) <= 1e6):
            raise ValueError(f"invalid range: {v}")
        return v

    @field_validator("extra")
    @classmethod
    def _cap_extra(cls, v: dict) -> dict:
        traj = v.get("trajectory", [])
        if len(traj) > MAX_TRAJ_POINTS:
            raise ValueError(f"trajectory too large: {len(traj)}")
        for p in traj:
            if not (isinstance(p, (list, tuple)) and len(p) == 3 and all(isinstance(n, (int, float)) and abs(n) <= 1e9 for n in p)):
                raise ValueError(f"bad trajectory point: {p!r}"[:120])
        vecs = v.get("vectors", [])
        if len(vecs) > MAX_VECTORS:
            raise ValueError(f"vectors too large: {len(vecs)}")
        return v


def validate_scene(payload: dict) -> Scene:
    return Scene.model_validate(payload)
