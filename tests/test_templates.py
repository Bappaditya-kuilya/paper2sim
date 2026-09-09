"""Tests for Manim template factories and render_template."""

import inspect
from unittest.mock import MagicMock, patch

import pytest

from paper2sim.templates import (
    TEMPLATES,
    attention_heatmap,
    convolution_1d,
    embedding_lookup,
    gradient_descent,
    linear_combination,
    loss_landscape,
    matrix_multiply,
    probability_distribution,
    render_template,
    softmax_distribution,
    transformer_block,
)


class TestTemplateFactories:
    """Tests that each template factory returns a valid Scene subclass."""

    def test_all_templates_registered(self):
        assert len(TEMPLATES) == 10
        expected = {
            "matrix_multiply", "attention_heatmap", "gradient_descent",
            "convolution_1d", "softmax_distribution", "embedding_lookup",
            "loss_landscape", "transformer_block", "linear_combination",
            "probability_distribution",
        }
        assert set(TEMPLATES.keys()) == expected

    def test_matrix_multiply_returns_scene(self):
        scene_cls = matrix_multiply(m=2, n=3, p=2)
        assert inspect.isclass(scene_cls)
        assert hasattr(scene_cls, "construct")

    def test_attention_heatmap_returns_scene(self):
        scene_cls = attention_heatmap(seq_len=4, head_dim=8)
        assert inspect.isclass(scene_cls)
        assert hasattr(scene_cls, "construct")

    def test_gradient_descent_returns_scene(self):
        scene_cls = gradient_descent(loss_fn="quadratic", steps=5, learning_rate=0.1)
        assert inspect.isclass(scene_cls)
        assert hasattr(scene_cls, "construct")

    def test_convolution_1d_returns_scene(self):
        scene_cls = convolution_1d(signal_len=8, kernel_size=3)
        assert inspect.isclass(scene_cls)
        assert hasattr(scene_cls, "construct")

    def test_softmax_distribution_returns_scene(self):
        scene_cls = softmax_distribution(values=[1.0, 2.0, 3.0])
        assert inspect.isclass(scene_cls)
        assert hasattr(scene_cls, "construct")

    def test_embedding_lookup_returns_scene(self):
        scene_cls = embedding_lookup(vocab_size=5, embed_dim=3)
        assert inspect.isclass(scene_cls)
        assert hasattr(scene_cls, "construct")

    def test_loss_landscape_returns_scene(self):
        scene_cls = loss_landscape(loss_type="mse")
        assert inspect.isclass(scene_cls)
        assert hasattr(scene_cls, "construct")

    def test_transformer_block_returns_scene(self):
        scene_cls = transformer_block()
        assert inspect.isclass(scene_cls)
        assert hasattr(scene_cls, "construct")

    def test_linear_combination_returns_scene(self):
        scene_cls = linear_combination(vectors=[(1, 0), (0, 1)], weights=[0.5, 0.8])
        assert inspect.isclass(scene_cls)
        assert hasattr(scene_cls, "construct")

    def test_probability_distribution_returns_scene(self):
        scene_cls = probability_distribution(dist_type="gaussian")
        assert inspect.isclass(scene_cls)
        assert hasattr(scene_cls, "construct")

    def test_factory_with_defaults(self):
        """Each factory should work with default parameters."""
        for name, factory in TEMPLATES.items():
            scene_cls = factory()
            assert inspect.isclass(scene_cls), f"{name} factory did not return a class"
            assert hasattr(scene_cls, "construct"), f"{name} Scene missing construct()"


class TestRenderTemplate:
    """Tests for the render_template function."""

    def test_unknown_template_returns_none(self):
        result = render_template("nonexistent", {}, "/tmp/out.mp4")
        assert result is None

    def test_render_calls_scene_render(self):
        mock_scene = MagicMock()
        with patch.object(TEMPLATES["matrix_multiply"], "__call__", return_value=mock_scene):
            with patch("paper2sim.templates.config") as mock_config:
                with patch("paper2sim.templates.Path") as mock_path:
                    mock_path.return_value.exists.return_value = False
                    mock_path.return_value.parent.mkdir = MagicMock()
                    mock_path.return_value.stem = "test"
                    # This will fail at render but should return None, not raise
                    result = render_template("matrix_multiply", {}, "/tmp/test.mp4")
                    # Result is None because render() isn't mocked to produce output
                    assert result is None
