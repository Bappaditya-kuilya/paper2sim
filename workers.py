"""Background job workers for async rendering."""

import uuid
from concurrent.futures import ProcessPoolExecutor
from enum import Enum

executor = ProcessPoolExecutor(max_workers=4)


class JobStatus(str, Enum):
    QUEUED = "queued"
    RENDERING = "rendering"
    COMPLETE = "complete"
    FAILED = "failed"


jobs: dict[str, dict] = {}


def create_job(template: str, params: dict, equation: str) -> str:
    """Create a new render job."""
    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {
        "job_id": job_id,
        "template": template,
        "params": params,
        "equation": equation,
        "status": JobStatus.QUEUED,
        "progress": 0.0,
        "error": None,
        "video_path": None,
    }
    return job_id


def get_job(job_id: str) -> dict | None:
    """Get job status."""
    return jobs.get(job_id)


def update_job(job_id: str, **kwargs):
    """Update job fields."""
    if job_id in jobs:
        jobs[job_id].update(kwargs)
