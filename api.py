"""Paper2Sim API — FastAPI backend for equation extraction and visualization."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


class ExtractRequest(BaseModel):
    source: str  # "arxiv_url" | "pdf_upload" | "text"
    url: str | None = None
    text: str | None = None


class Equation(BaseModel):
    latex: str
    type: str
    label: str | None = None
    template: str | None = None


class ExtractResponse(BaseModel):
    equations: list[Equation]
    paper_info: dict | None = None


app = FastAPI(
    title="Paper2Sim API",
    description="Extract equations from papers and visualize them interactively",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/extract")
async def extract(req: ExtractRequest):
    return {"message": "not implemented"}
