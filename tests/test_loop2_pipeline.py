"""Loop 2 contract — pipeline + job endpoints. Mock LLM (no keys), isolated DATA_DIR."""

import pytest


@pytest.fixture()
def isolated_data(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("SANDBOX_TIMEOUT_SECONDS", "30")
    monkeypatch.setenv("MAX_REPAIR_ATTEMPTS", "2")
    for k in ("GROQ_API_KEY", "OPENROUTER_API_KEY", "GOOGLE_AI_STUDIO_API_KEY", "JOBS_DB"):
        monkeypatch.delenv(k, raising=False)
    return tmp_path


def test_db_uses_wal_mode(isolated_data):
    import sqlite3

    from paper2sim import jobs as J

    J.init_db()
    conn = sqlite3.connect(J.db_path())
    try:
        mode = conn.execute("PRAGMA journal_mode;").fetchone()[0]
    finally:
        conn.close()
    assert mode == "wal"


def test_parse_analysis_valid_and_fallback():
    from paper2sim.pipeline import parse_analysis

    ok = parse_analysis('pre {"claim": "c", "viz_type": "trajectory"} post')
    assert ok["claim"] == "c" and ok["viz_type"] == "trajectory"
    bad = parse_analysis("no json here")
    assert bad["claim"] == "no json here" and bad["viz_type"] == "generic"
    weird = parse_analysis('{"claim": "c", "viz_type": "nope"}')
    assert weird["viz_type"] == "generic"


def test_extract_code():
    from paper2sim.pipeline import extract_code

    assert extract_code("```python\nprint(1)\n```") == "print(1)"
    assert extract_code("```\nprint(2)\n```") == "print(2)"
    assert extract_code("no fences") is None


def test_pipeline_text_mock_completes(isolated_data):
    from paper2sim import jobs as J
    from paper2sim.pipeline import run_pipeline

    job = J.create(source_kind="text", source_ref="We claim Monte Carlo pi converges.", title="t")
    run_pipeline(job["id"])
    done = J.get(job["id"])
    assert done["status"] == "completed", done.get("error")
    assert done["verdict"] == "supported"
    assert done["scene"]["type"] == "statistical"
    assert done["analysis"]["claim"]
    assert "Mock run" in done["summary"] or "supported" in done["summary"]


def test_pipeline_repair_exhaustion_fails(isolated_data, monkeypatch):
    import paper2sim.pipeline as P
    from paper2sim import jobs as J

    monkeypatch.setattr(P, "chat", lambda s, u, max_tokens=8000: "```python\nimport socket\n```")
    job = J.create(source_kind="text", source_ref="anything", title="t")
    P.run_pipeline(job["id"])
    done = J.get(job["id"])
    assert done["status"] == "failed"
    assert done["execution"]["attempt"] == 3  # 1 + 2 repairs


def test_api_papers_validation(isolated_data):
    from fastapi.testclient import TestClient

    from api import app

    c = TestClient(app)
    assert c.post("/api/papers", data={}).status_code == 400
    assert c.post("/api/papers", data={"arxiv": "not-a-url"}).status_code == 400
    assert c.post("/api/papers", data={"text": "a", "arxiv": "1706.03762"}).status_code == 400
    r = c.post("/api/papers", files={"file": ("x.txt", b"hi", "text/plain")})
    assert r.status_code == 400


def test_api_papers_text_submits_and_completes(isolated_data):
    import time

    from fastapi.testclient import TestClient

    from api import app

    c = TestClient(app)
    job_id = c.post("/api/papers", data={"text": "We claim Monte Carlo pi converges at 1/sqrt(N)."}).json()["job_id"]
    assert len(job_id) == 12
    for _ in range(60):
        job = c.get(f"/api/jobs/{job_id}").json()
        if job["status"] in ("completed", "failed"):
            break
        time.sleep(1)
    assert job["status"] == "completed", job.get("error")
    assert job["scene"]["type"] == "statistical"
    assert c.get("/api/jobs").json()["jobs"]
    assert c.get("/api/jobs/nope12345678").status_code == 404
