"""Loop 3 smoke — one abstract per domain through the full pipeline (mock LLM).

PRD build-order step 4 wants 3–5 real arXiv abstracts across math/CS/physics.
Without API keys this runs on the mock provider: proves ingest → summarize
holds for varied inputs. Re-run with GROQ_API_KEY set for the real check.
"""

import pytest

ABSTRACTS = {
    "math": "We prove the semicircle law for Wigner matrices with ergodic entries. "
    "The empirical spectral distribution converges weakly to the semicircle distribution "
    "with density rho(x) = sqrt(4-x^2)/(2*pi) on [-2,2]. Simulations with N=2000 confirm convergence.",
    "cs": "We present new cardinality estimation algorithms for HyperLogLog sketches. "
    "Our estimator achieves relative error 1.04/sqrt(m) with m=2048 registers. "
    "Experiments on synthetic streams of 10^7 distinct items confirm the error bound.",
    "physics": "We study dynamics and non-integrability of the double spring pendulum. "
    "Numerical integration of the equations of motion shows a positive maximal Lyapunov "
    "exponent ~1.34 with gravity, ~0 without, indicating chaotic versus regular regimes.",
}


@pytest.fixture()
def isolated_data(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("SANDBOX_TIMEOUT_SECONDS", "30")
    for k in ("GROQ_API_KEY", "OPENROUTER_API_KEY", "GOOGLE_AI_STUDIO_API_KEY", "JOBS_DB"):
        monkeypatch.delenv(k, raising=False)


@pytest.mark.parametrize("domain", ["math", "cs", "physics"])
def test_domain_smoke_completes(isolated_data, domain):
    from paper2sim import jobs as J
    from paper2sim.pipeline import run_pipeline
    from paper2sim.scene import validate_scene

    job = J.create(source_kind="text", source_ref=ABSTRACTS[domain], title=f"{domain} smoke")
    run_pipeline(job["id"])
    done = J.get(job["id"])
    assert done["status"] == "completed", done.get("error")
    assert done["verdict"] in ("supported", "refuted", "inconclusive")
    assert done["analysis"]["claim"]
    assert done["code"]
    assert done["execution"]["attempt"] >= 1
    validate_scene(done["scene"])  # fail closed: stored scene must re-validate
    assert done["summary"]
