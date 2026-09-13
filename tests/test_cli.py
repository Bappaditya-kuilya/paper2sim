import pytest
from typer.testing import CliRunner
from paper2sim.cli import app

runner = CliRunner()


def test_help():
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    assert "paper2sim" in result.output


def test_extract_equation():
    result = runner.invoke(app, ["extract", "--equation", "y = mx + b"])
    assert result.exit_code == 0
    assert "y = mx + b" in result.output


def test_extract_no_args():
    result = runner.invoke(app, ["extract"])
    assert result.exit_code == 1


def test_models():
    result = runner.invoke(app, ["models"])
    assert result.exit_code == 0
    assert "trigonometric" in result.output


def test_render():
    result = runner.invoke(app, ["render", "--equation", "y = x^2"])
    assert result.exit_code == 0
    assert "Rendering" in result.output
