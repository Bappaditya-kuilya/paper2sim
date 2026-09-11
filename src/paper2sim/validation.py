"""Input validation for Paper2Sim API."""

from pydantic import BaseModel, field_validator, model_validator


class ValidatedExtractRequest(BaseModel):
    source: str
    url: str | None = None
    text: str | None = None

    @field_validator("source")
    @classmethod
    def source_must_be_valid(cls, v):
        valid = {"arxiv_url", "pdf_upload", "text"}
        if v not in valid:
            raise ValueError(f"source must be one of {valid}")
        return v

    @model_validator(mode="after")
    def check_required_fields(self):
        if self.source == "arxiv_url" and not self.url:
            raise ValueError("url required when source is arxiv_url")
        if self.source == "text" and not self.text:
            raise ValueError("text required when source is text")
        return self


class ValidatedRenderRequest(BaseModel):
    template: str
    params: dict = {}
    equation: str

    @field_validator("template")
    @classmethod
    def template_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("template cannot be empty")
        return v.strip()

    @field_validator("equation")
    @classmethod
    def equation_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("equation cannot be empty")
        return v.strip()
