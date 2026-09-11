"""Error response format for Paper2Sim API."""

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    error: str
    details: dict | None = None
    status_code: int


class SuccessResponse(BaseModel):
    data: dict
    status_code: int = 200
