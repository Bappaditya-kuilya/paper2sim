"""Tests for template selector."""

from paper2sim.template_selector import select_template, list_templates


def test_select_template_trig():
    assert select_template("trigonometric") == "TrigSurface"


def test_select_template_physics():
    assert select_template("physics") == "ForceField"


def test_select_template_unknown():
    assert select_template("unknown") is None


def test_list_templates():
    templates = list_templates("polynomial")
    assert "PolySurface" in templates
    assert len(templates) == 2


def test_list_templates_empty():
    assert list_templates("nonexistent") == []
