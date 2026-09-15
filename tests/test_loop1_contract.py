"""Loop 1 contract check — fails if Loop 1 logic breaks. ~10s, no keys, no network."""

import json

import pytest


def test_allowlist_blocks_socket_but_allows_numpy():
    from paper2sim.allowlist import check_imports

    check_imports("import numpy as np\nimport math\nx=1")
    with pytest.raises(ValueError, match="blocked import"):
        check_imports("import socket\ns=socket.socket()")
    with pytest.raises(ValueError, match="blocked import"):
        check_imports("import subprocess\nsubprocess.run(['x'])")
    with pytest.raises(ValueError, match="blocked import"):
        check_imports("from os import system")


def test_scene_validates_trajectory_and_rejects_oversize():
    from paper2sim.scene import validate_scene

    ok = validate_scene({"type": "trajectory", "expression": "orbit", "x_range": [-5, 5], "y_range": [-5, 5], "resolution": 60, "extra": {"trajectory": [[0, 0, 0], [1, 1, 1]]}})
    assert ok.type == "trajectory"
    with pytest.raises(Exception):
        validate_scene({"type": "trajectory", "expression": "x", "x_range": [5, -5], "y_range": [-5, 5], "resolution": 60})
    with pytest.raises(Exception):
        validate_scene({"type": "generic", "expression": "x", "x_range": [-5, 5], "y_range": [-5, 5], "resolution": 999})


def test_sandbox_runs_clean_script_and_parses_contract():
    from paper2sim.sandbox import run_script

    scene = {"type": "trigonometric", "expression": "sin(x)*cos(y)"}
    result = {"metrics": {"v": 1}, "verdict": "supported", "explanation": "ok"}
    src = f"import json\nopen('scene.json','w').write(json.dumps({scene!r}))\nprint('RESULT_JSON: '+json.dumps({result!r}))"
    out = run_script(src, timeout_s=20)
    assert out["returncode"] == 0, out["stderr"]
    assert out["scene"]["type"] == "trigonometric"
    assert out["result_json"]["verdict"] == "supported"


def test_sandbox_blocks_import_before_exec():
    from paper2sim.sandbox import run_script

    out = run_script("import socket\nprint('hi')")
    assert out["returncode"] == -1
    assert "blocked import" in out["stderr"]


def test_sandbox_kills_infinite_loop():
    from paper2sim.sandbox import run_script

    out = run_script("while True:\n pass", timeout_s=3)
    assert out["timed_out"] or out["returncode"] != 0


def test_llm_mock_works_offline(monkeypatch):
    from paper2sim import llm as L

    for k in ("GROQ_API_KEY", "OPENROUTER_API_KEY", "GOOGLE_AI_STUDIO_API_KEY"):
        monkeypatch.delenv(k, raising=False)
    res = L.chat("TASK: ANALYZE", "test")
    assert "claim" in json.loads(res)
