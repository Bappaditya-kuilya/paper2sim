"""Tests for CLI."""

import subprocess
import sys


def test_cli_extract_text():
    result = subprocess.run(
        [sys.executable, "-m", "paper2sim.cli", "extract", "text", "--text", "sin(x)"],
        capture_output=True, text=True, cwd="/teamspace/studios/this_studio/p2s/paper2sim"
    )
    assert result.returncode == 0
    assert "sin(x)" in result.stdout


def test_cli_no_command():
    result = subprocess.run(
        [sys.executable, "-m", "paper2sim.cli"],
        capture_output=True, text=True, cwd="/teamspace/studios/this_studio/p2s/paper2sim"
    )
    assert result.returncode == 0


def test_cli_render():
    result = subprocess.run(
        [sys.executable, "-m", "paper2sim.cli", "render", "sin(x)", "--template", "trig"],
        capture_output=True, text=True, cwd="/teamspace/studios/this_studio/p2s/paper2sim"
    )
    assert result.returncode == 0
    assert "sin(x)" in result.stdout
