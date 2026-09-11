"""Paper2Sim API — FastAPI backend for equation extraction and visualization."""

import tempfile
from pathlib import Path

from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from paper2sim.arxiv import download_pdf, download_source, get_paper_info, parse_arxiv_url
from paper2sim.equations import classify_equation, extract_equations_from_tex, select_templates
from workers import create_job, get_job, jobs


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


class RenderRequest(BaseModel):
    template: str
    params: dict = {}
    equation: str


class RenderResponse(BaseModel):
    job_id: str
    status: str


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
    if req.source == "arxiv_url" and req.url:
        arxiv_id = parse_arxiv_url(req.url)
        if not arxiv_id:
            return {"error": "Invalid arXiv URL"}
        with tempfile.TemporaryDirectory() as tmpdir:
            dest = Path(tmpdir)
            source_path = download_source(arxiv_id, str(dest))
            if source_path:
                tex_files = list(dest.rglob("*.tex"))
                if tex_files:
                    tex_content = tex_files[0].read_text(errors="replace")
                    equations = extract_equations_from_tex(tex_content)
                    for eq in equations:
                        eq["type"] = classify_equation(eq["latex"])
                    result = select_templates(equations)
                    return ExtractResponse(
                        equations=[Equation(
                            latex=e["equation"],
                            type=classify_equation(e["equation"]),
                            template=e.get("template"),
                        ) for e in result],
                        paper_info={"arxiv_id": arxiv_id},
                    )
            pdf_path = download_pdf(arxiv_id, str(dest))
            if pdf_path:
                return {"error": "PDF extraction not yet implemented"}
        return {"error": "Failed to download paper"}
    elif req.source == "text" and req.text:
        equations = [{"latex": req.text, "type": "display"}]
        equations[0]["type"] = classify_equation(req.text)
        result = select_templates(equations)
        return ExtractResponse(equations=[Equation(
            latex=e["equation"],
            type=classify_equation(e["equation"]),
            template=e.get("template"),
        ) for e in result])
    return {"error": "Invalid request"}


@app.post("/api/render", response_model=RenderResponse)
async def render(req: RenderRequest):
    job_id = create_job(req.template, req.params, req.equation)
    return RenderResponse(job_id=job_id, status="queued")


@app.get("/api/render/{job_id}/status")
async def render_status(job_id: str):
    job = get_job(job_id)
    if not job:
        return {"error": "Job not found"}
    return {
        "job_id": job["job_id"],
        "status": job["status"],
        "progress": job["progress"],
        "error": job["error"],
    }


@app.get("/api/render/{job_id}/video")
async def render_video(job_id: str):
    job = get_job(job_id)
    if not job:
        return {"error": "Job not found"}
    if job["status"] != "complete":
        return {"error": "Video not ready"}
    return {"video_path": job["video_path"]}
