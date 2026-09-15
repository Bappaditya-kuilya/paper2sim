"""Sandbox executor — rlimits + `python -I` + stripped env (PRD §9.1-2).

ponytail: no-network jail is the known ceiling (needs nsjail/bwrap per-job);
Loop 2 adds it before any public URL. Until then: localhost-only dev.
"""

import json
import os
import sys
import tempfile
from pathlib import Path

from paper2sim.allowlist import check_imports

TRUNC = 20000


def _no_net_cmd(cmd: list[str], rundir: str) -> list[str]:
    """PRD §9.3: no network egress for generated code. bwrap when present (opt out: SANDBOX_NO_NET=0)."""
    import shutil
    import sys as _sys

    if os.environ.get("SANDBOX_NO_NET", "") in ("0", "false"):
        return cmd
    if shutil.which("bwrap") is None:
        return cmd
    binds: list[str] = []
    for p in ("/usr", "/lib", "/lib64", "/etc", _sys.prefix):
        if os.path.exists(p):
            binds += ["--ro-bind", p, p]
    return ["bwrap", "--unshare-net", "--die-with-parent", *binds, "--proc", "/proc", "--dev", "/dev", "--bind", rundir, rundir, "--chdir", rundir, *cmd]


def _limits(max_cpu_s: int, max_mem_mb: int, max_output_mb: int, max_procs: int):
    import resource

    def _preexec():
        import os as _os

        _os.setsid()
        resource.setrlimit(resource.RLIMIT_CPU, (max_cpu_s, max_cpu_s))
        try:
            resource.setrlimit(resource.RLIMIT_AS, (max_mem_mb * 1024 * 1024,) * 2)
        except (ValueError, OSError):
            pass  # macOS over-reserves BLAS virtual memory; skip AS cap there
        resource.setrlimit(resource.RLIMIT_FSIZE, (max_output_mb * 1024 * 1024,) * 2)
        try:
            resource.setrlimit(resource.RLIMIT_NPROC, (max_procs, max_procs))
        except (ValueError, OSError):
            pass

    return _preexec


def run_script(source: str, timeout_s: int = 60, max_mem_mb: int = 2048, max_output_mb: int = 50, max_procs: int = 256, out_dir: str | None = None) -> dict:
    """Execute generated code isolated. Returns dict with returncode/stdout/stderr/scene/result_json."""
    try:
        check_imports(source)
    except ValueError as e:
        return {"returncode": -1, "stdout": "", "stderr": f"blocked import: {e}", "timed_out": False, "scene": None, "result_json": None, "artifacts": []}

    import contextlib
    import subprocess

    with contextlib.ExitStack() as stack:
        rundir = os.path.abspath(out_dir) if out_dir else stack.enter_context(tempfile.TemporaryDirectory(prefix="p2s_"))
        Path(rundir).mkdir(parents=True, exist_ok=True)
        main = Path(rundir) / "main.py"
        main.write_text(source)
        env = {"PATH": os.environ.get("PATH", "/usr/bin:/bin"), "HOME": rundir, "MPLBACKEND": "Agg", "MPLCONFIGDIR": rundir, "OMP_NUM_THREADS": "1", "OPENBLAS_NUM_THREADS": "1"}

        try:
            proc = subprocess.run(
                _no_net_cmd([sys.executable, "-I", str(main)], rundir),
                cwd=rundir, env=env, capture_output=True, text=True,
                timeout=timeout_s + 5, preexec_fn=_limits(timeout_s, max_mem_mb, max_output_mb, max_procs),
            )
            timed_out, returncode = False, proc.returncode
            stdout, stderr = proc.stdout[-TRUNC:], proc.stderr[-TRUNC:]
        except subprocess.TimeoutExpired as e:
            timed_out, returncode = True, 124
            out_s = e.stdout if isinstance(e.stdout, str) else ""
            err_s = e.stderr if isinstance(e.stderr, str) else ""
            stdout, stderr = out_s[-TRUNC:], (err_s + "\n[wall-clock kill]")[-TRUNC:]

        result_json = None
        for line in reversed((stdout or "").splitlines()):
            if line.startswith("RESULT_JSON:"):
                try:
                    result_json = json.loads(line[len("RESULT_JSON:"):].strip())
                except json.JSONDecodeError:
                    pass
                break

        scene = None
        scene_path = Path(rundir) / "scene.json"
        if scene_path.exists():
            try:
                from paper2sim.scene import validate_scene

                scene = validate_scene(json.loads(scene_path.read_text()[:500000])).model_dump()
            except Exception as e:  # noqa: BLE001 — fail closed, surface reason
                stderr = (stderr + f"\n[scene.json invalid: {e}]")[-TRUNC:]

        artifacts = sorted(p.name for p in Path(rundir).glob("figure_*") if p.suffix in (".png", ".gif"))
        return {"returncode": returncode, "stdout": stdout, "stderr": stderr, "timed_out": timed_out, "scene": scene, "result_json": result_json, "artifacts": artifacts}
