"""
Reusable Manim scene templates for educational animations.

Each template is a factory function that returns a Manim Scene class
parameterized by the given arguments. No LLM code generation needed.
"""

import math
import shutil
from pathlib import Path
from typing import Callable

from manim import (
    Axes,
    BLUE,
    DOWN,
    LEFT,
    ORIGIN,
    RIGHT,
    UP,
    RED,
    WHITE,
    YELLOW,
    Arrow,
    Create,
    Dot,
    FadeIn,
    FadeOut,
    FunctionGraph,
    Line,
    Rectangle,
    Scene,
    Square,
    Text,
    VGroup,
    Write,
    config,
)

GREEN = "#58C4DD"
ORANGE = "#FF8C00"
PURPLE = "#9B59B6"
TEAL = "#1ABC9C"

PALETTE = [BLUE, GREEN, YELLOW, RED, WHITE]


def _make_scene(construct_fn: Callable) -> type[Scene]:
    """Wrap a construct function into a Scene subclass.

    Args:
        construct_fn: A callable that takes a Scene instance and runs the animation.

    Returns:
        A Scene subclass with the construct method implemented.
    """

    class _Scene(Scene):
        def construct(self):
            construct_fn(self)

    _Scene.__name__ = construct_fn.__name__
    _Scene.__qualname__ = construct_fn.__qualname__
    return _Scene


def _tex(text: str, **kwargs) -> Text:
    """Shorthand for Text with math-like font size."""
    return Text(text, font_size=kwargs.pop("font_size", 28), **kwargs)


# ---------------------------------------------------------------------------
# 1. Matrix Multiply
# ---------------------------------------------------------------------------

def matrix_multiply(m: int = 2, n: int = 3, p: int = 2, title: str = "Matrix Multiplication") -> type[Scene]:
    """Template: matrix_multiply - Matrix multiplication visualization A(m×n) × B(n×p) = C(m×p)."""
    def construct(self):
        title_mob = Text(title, font_size=36).to_edge(UP)
        self.play(Write(title_mob))

        def make_matrix(rows, cols, label, color):
            entries = []
            for i in range(rows):
                row = VGroup()
                for j in range(cols):
                    val = str(1 + i * cols + j)
                    cell = Square(side_length=0.45, fill_color=color, fill_opacity=0.15, stroke_color=color, stroke_width=1)
                    num = Text(val, font_size=20, color=WHITE)
                    row.add(VGroup(cell, num))
                row.arrange(RIGHT, buff=0.05)
                entries.append(row)
            table = VGroup(*entries).arrange(DOWN, buff=0.05)
            mat_label = Text(label, font_size=32, color=color)
            return VGroup(mat_label, table).arrange(RIGHT, buff=0.3)

        A = make_matrix(m, n, "A", BLUE).shift(LEFT * 3)
        B = make_matrix(n, p, "B", GREEN).shift(RIGHT * 3)
        self.play(FadeIn(A), FadeIn(B))
        self.wait(0.5)

        times = Text("×", font_size=40).move_to((A.get_center() + B.get_center()) / 2)
        self.play(Write(times))
        self.wait(1)

        eq = Text("=", font_size=40).next_to(B, RIGHT, buff=0.4)
        result_label = Text("C", font_size=32, color=YELLOW)
        result_mat = make_matrix(m, p, "", YELLOW).next_to(eq, RIGHT, buff=0.3)
        result_mat[0].set_opacity(0)
        result_mat.add(result_label.move_to(result_mat[0].get_center()))
        self.play(Write(eq), FadeIn(result_mat))
        self.wait(2)

        self.play(FadeOut(title_mob), FadeOut(A), FadeOut(B), FadeOut(times), FadeOut(eq), FadeOut(result_mat))

    return _make_scene(construct)


# ---------------------------------------------------------------------------
# 2. Attention Heatmap
# ---------------------------------------------------------------------------

def attention_heatmap(seq_len: int = 8, head_dim: int = 16, title: str = "Attention Scores") -> type[Scene]:
    """Template: attention_heatmap - Self-attention score heatmap showing Q×K^T similarity matrix."""
    def construct(self):
        title_mob = Text(title, font_size=36).to_edge(UP)
        self.play(Write(title_mob))

        cell_size = min(0.5, 5.0 / seq_len)
        grid = VGroup()
        for i in range(seq_len):
            row = VGroup()
            for j in range(seq_len):
                val = 1.0 if i == j else max(0.0, 1.0 - abs(i - j) * 0.2)
                cell = Square(side_length=cell_size)
                r = int(255 * (1 - val))
                g = int(100 * val)
                b = int(255 * val)
                cell.set_fill(color=f"#{r:02x}{g:02x}{b:02x}", opacity=0.3 + 0.7 * val)
                cell.set_stroke(WHITE, width=0.5)
                row.add(cell)
            row.arrange(RIGHT, buff=0.02)
            grid.add(row)
        grid.arrange(DOWN, buff=0.02)
        grid.move_to(ORIGIN)

        labels_q = VGroup(*[Text(f"q{i}", font_size=16) for i in range(seq_len)])
        labels_q.arrange(DOWN, buff=cell_size + 0.02).next_to(grid, LEFT, buff=0.15)
        labels_k = VGroup(*[Text(f"k{j}", font_size=16) for j in range(seq_len)])
        labels_k.arrange(RIGHT, buff=cell_size + 0.02).next_to(grid, UP, buff=0.15)

        self.play(FadeIn(grid), FadeIn(labels_q), FadeIn(labels_k))
        self.wait(0.5)

        formula = Text("Attention(Q,K) = softmax(QKᵀ / √dₖ)", font_size=24)
        formula.to_edge(DOWN)
        self.play(Write(formula))
        self.wait(2)

        self.play(FadeOut(title_mob), FadeOut(grid), FadeOut(labels_q), FadeOut(labels_k), FadeOut(formula))

    return _make_scene(construct)


# ---------------------------------------------------------------------------
# 3. Gradient Descent
# ---------------------------------------------------------------------------

def gradient_descent(loss_fn: str = "quadratic", steps: int = 10, learning_rate: float = 0.1, title: str = "Gradient Descent") -> type[Scene]:
    """Template: gradient_descent - Gradient descent optimization on a loss surface with step visualization."""
    def construct(self):
        title_mob = Text(title, font_size=36).to_edge(UP)
        self.play(Write(title_mob))

        axes = Axes(x_range=[-1, 5], y_range=[0, 10], axis_config={"include_numbers": False}).scale(0.8)

        if loss_fn == "quadratic":
            f = lambda x: (x - 2) ** 2
        else:
            f = lambda x: x ** 2

        graph = FunctionGraph(f, x_range=[-1, 5, 0.01], color=BLUE)
        graph_label = Text("L(θ)", font_size=28, color=BLUE).next_to(axes.c2p(5, f(5)), RIGHT)
        self.play(Create(axes), Create(graph), Write(graph_label))

        x = 4.5
        dot = Dot(axes.c2p(x, f(x)), color=RED, radius=0.08)
        self.play(FadeIn(dot))

        for step in range(steps):
            grad = 2 * (x - 2)
            x_new = x - learning_rate * grad
            arrow = Arrow(
                axes.c2p(x, f(x)),
                axes.c2p(x_new, f(x_new)),
                buff=0.05,
                color=YELLOW,
                stroke_width=2,
            )
            step_text = Text(f"θ{step} = {x:.2f}", font_size=22, color=WHITE)
            step_text.next_to(dot, UP, buff=0.15)
            self.play(Create(arrow), Write(step_text))
            x = x_new
            new_dot = Dot(axes.c2p(x, f(x)), color=RED, radius=0.08)
            self.play(FadeOut(dot), FadeOut(arrow), FadeOut(step_text), FadeIn(new_dot))
            dot = new_dot

        conv = Text("θ → θ*", font_size=28, color=GREEN).to_edge(DOWN)
        self.play(Write(conv))
        self.wait(1)
        self.play(FadeOut(title_mob), FadeOut(axes), FadeOut(graph), FadeOut(graph_label), FadeOut(dot), FadeOut(conv))

    return _make_scene(construct)


# ---------------------------------------------------------------------------
# 4. Convolution 1D
# ---------------------------------------------------------------------------

def convolution_1d(signal_len: int = 10, kernel_size: int = 3, title: str = "1D Convolution") -> type[Scene]:
    """Template: convolution_1d - 1D convolution sliding kernel over signal with output computation."""
    def construct(self):
        title_mob = Text(title, font_size=36).to_edge(UP)
        self.play(Write(title_mob))

        signal = list(range(1, signal_len + 1))
        kernel = [1, 0, -1][:kernel_size]

        sig_cells = VGroup()
        for v in signal:
            cell = VGroup(
                Square(side_length=0.55),
                Text(str(v), font_size=22),
            )
            cell[0].set_fill(BLUE, opacity=0.3)
            cell[0].set_stroke(WHITE, width=1)
            sig_cells.add(cell)
        sig_cells.arrange(RIGHT, buff=0.05).shift(UP * 1)

        kern_cells = VGroup()
        for v in kernel:
            cell = VGroup(
                Square(side_length=0.55),
                Text(str(v), font_size=22),
            )
            cell[0].set_fill(RED, opacity=0.3)
            cell[0].set_stroke(WHITE, width=1)
            kern_cells.add(cell)
        kern_cells.arrange(RIGHT, buff=0.05).shift(DOWN * 1)

        sig_label = Text("Signal", font_size=22, color=BLUE).next_to(sig_cells, LEFT, buff=0.3)
        kern_label = Text("Kernel", font_size=22, color=RED).next_to(kern_cells, LEFT, buff=0.3)

        self.play(FadeIn(sig_cells), FadeIn(kern_cells), Write(sig_label), Write(kern_label))
        self.wait(0.5)

        out_len = signal_len - kernel_size + 1
        out_cells = VGroup()
        for _ in range(out_len):
            cell = VGroup(
                Square(side_length=0.55),
                Text("0", font_size=22),
            )
            cell[0].set_fill(GREEN, opacity=0.3)
            cell[0].set_stroke(WHITE, width=1)
            out_cells.add(cell)
        out_cells.arrange(RIGHT, buff=0.05).shift(DOWN * 2.5)
        out_label = Text("Output", font_size=22, color=GREEN).next_to(out_cells, LEFT, buff=0.3)
        self.play(FadeIn(out_cells), Write(out_label))

        highlight = Square(side_length=0.6, stroke_color=YELLOW, stroke_width=3, fill_opacity=0)
        highlight.move_to(sig_cells[0])
        self.play(FadeIn(highlight))

        for i in range(out_len):
            self.play(highlight.animate.move_to(sig_cells[i]), run_time=0.3)

            result = sum(signal[i + j] * kernel[j] for j in range(kernel_size))
            out_cells[i][1] = Text(str(result), font_size=22)
            self.wait(0.2)

        self.wait(1)
        self.play(
            FadeOut(title_mob), FadeOut(sig_cells), FadeOut(kern_cells),
            FadeOut(sig_label), FadeOut(kern_label), FadeOut(out_cells),
            FadeOut(out_label), FadeOut(highlight),
        )

    return _make_scene(construct)


# ---------------------------------------------------------------------------
# 5. Softmax Distribution
# ---------------------------------------------------------------------------

def softmax_distribution(values: list[float] | None = None, title: str = "Softmax") -> type[Scene]:
    """Template: softmax_distribution - Softmax probability distribution from logits with bar chart."""
    if values is None:
        values = [2.0, 1.0, 0.1]

    def construct(self):
        title_mob = Text(title, font_size=36).to_edge(UP)
        self.play(Write(title_mob))

        exp_vals = [math.exp(v) for v in values]
        sum_exp = sum(exp_vals)
        probs = [e / sum_exp for e in exp_vals]

        formula = Text("softmax(zᵢ) = eᶻⁱ / Σⱼ eᶻʲ", font_size=28)
        formula.shift(UP * 2)
        self.play(Write(formula))
        self.wait(0.5)

        input_vals = VGroup()
        for i, v in enumerate(values):
            t = Text(f"z{i} = {v:.1f}", font_size=24, color=BLUE)
            input_vals.add(t)
        input_vals.arrange(RIGHT, buff=0.5).shift(UP * 0.5)
        self.play(FadeIn(input_vals))

        exp_vals_mob = VGroup()
        for i, e in enumerate(exp_vals):
            t = Text(f"e^{values[i]:.1f} = {e:.2f}", font_size=22, color=YELLOW)
            exp_vals_mob.add(t)
        exp_vals_mob.arrange(RIGHT, buff=0.4).shift(DOWN * 0.5)
        self.play(FadeIn(exp_vals_mob))

        bar_group = VGroup()
        max_prob = max(probs)
        for i, p in enumerate(probs):
            bar_height = 2.5 * (p / max_prob)
            bar = Rectangle(
                width=0.6,
                height=bar_height,
                fill_color=PALETTE[i % len(PALETTE)],
                fill_opacity=0.8,
                stroke_color=WHITE,
                stroke_width=1,
            )
            label = Text(f"{p:.2f}", font_size=20).next_to(bar, DOWN, buff=0.1)
            bar_group.add(VGroup(bar, label))
        bar_group.arrange(RIGHT, buff=0.4).shift(DOWN * 2)
        self.play(FadeIn(bar_group))

        self.wait(2)
        self.play(
            FadeOut(title_mob), FadeOut(formula), FadeOut(input_vals),
            FadeOut(exp_vals_mob), FadeOut(bar_group),
        )

    return _make_scene(construct)


# ---------------------------------------------------------------------------
# 6. Embedding Lookup
# ---------------------------------------------------------------------------

def embedding_lookup(vocab_size: int = 10, embed_dim: int = 4, title: str = "Embedding Lookup") -> type[Scene]:
    """Template: embedding_lookup - Embedding table lookup showing word-to-vector retrieval."""
    def construct(self):
        title_mob = Text(title, font_size=36).to_edge(UP)
        self.play(Write(title_mob))

        words = [f"w{i}" for i in range(vocab_size)]

        table = VGroup()
        header = VGroup(
            Text("Word", font_size=20, color=WHITE),
            Text("Embedding", font_size=20, color=WHITE),
        ).arrange(RIGHT, buff=1.2)
        table.add(header)

        rows = []
        for i, word in enumerate(words):
            vec = [f"{(i * 0.3 + j * 0.7) % 5:.1f}" for j in range(embed_dim)]
            row = VGroup(
                Text(word, font_size=18),
                Text(f"[{', '.join(vec)}]", font_size=16),
            ).arrange(RIGHT, buff=0.8)
            rows.append(row)
        table.add(*rows)
        table.arrange(DOWN, buff=0.12, center=True).shift(LEFT * 2)

        bg = Rectangle(
            width=table.width + 0.4,
            height=table.height + 0.3,
            fill_color="#1a1a2e",
            fill_opacity=0.8,
            stroke_color=BLUE,
            stroke_width=2,
        )
        bg.move_to(table)
        self.play(FadeIn(bg), FadeIn(table))
        self.wait(0.5)

        query = Text("Query: w3", font_size=26, color=YELLOW).to_edge(RIGHT).shift(UP * 1)
        self.play(Write(query))

        arrow = Arrow(query.get_left(), table[4].get_right(), buff=0.1, color=YELLOW)
        self.play(Create(arrow))

        highlight = Rectangle(
            width=table[4].width + 0.2,
            height=table[4].height + 0.08,
            stroke_color=YELLOW,
            stroke_width=3,
            fill_opacity=0,
        )
        highlight.move_to(table[4])
        self.play(FadeIn(highlight))

        result = Text("e_w3", font_size=28, color=GREEN).to_edge(RIGHT).shift(DOWN * 1)
        self.play(Write(result))
        self.wait(2)

        self.play(
            FadeOut(title_mob), FadeOut(bg), FadeOut(table),
            FadeOut(query), FadeOut(arrow), FadeOut(highlight), FadeOut(result),
        )

    return _make_scene(construct)


# ---------------------------------------------------------------------------
# 7. Loss Landscape
# ---------------------------------------------------------------------------

def loss_landscape(loss_type: str = "mse", title: str = "Loss Function") -> type[Scene]:
    """Template: loss_landscape - Loss function landscape (MSE or cross-entropy) with gradient descent path."""
    def construct(self):
        title_mob = Text(title, font_size=36).to_edge(UP)
        self.play(Write(title_mob))

        axes = Axes(x_range=[-1, 7], y_range=[0, 16], axis_config={"include_numbers": False}).scale(0.8)

        if loss_type == "mse":
            f = lambda x: (x - 3) ** 2
            label = Text("L = (y - ŷ)²", font_size=28, color=BLUE)
        else:
            f = lambda x: -math.log(max(1e-6, 1 / (1 + math.exp(-x))))
            label = Text("L = -log(σ(z))", font_size=28, color=BLUE)

        graph = FunctionGraph(f, x_range=[-1, 7, 0.01], color=BLUE)
        label.next_to(axes.c2p(7, f(7)), RIGHT)
        self.play(Create(axes), Create(graph), Write(label))

        x = 6.0
        dot = Dot(axes.c2p(x, f(x)), color=RED, radius=0.1)
        self.play(FadeIn(dot))

        for _ in range(8):
            if loss_type == "mse":
                grad = 2 * (x - 3)
            else:
                grad = 1 - 1 / (1 + math.exp(-x))
            x_new = x - 0.3 * grad
            new_dot = Dot(axes.c2p(x_new, f(x_new)), color=RED, radius=0.1)
            arrow = Arrow(
                axes.c2p(x, f(x)),
                axes.c2p(x_new, f(x_new)),
                buff=0.05,
                color=YELLOW,
                stroke_width=2,
            )
            self.play(Create(arrow), run_time=0.3)
            self.play(FadeOut(dot), FadeOut(arrow), FadeIn(new_dot), run_time=0.3)
            dot = new_dot
            x = x_new

        self.wait(1)
        self.play(FadeOut(title_mob), FadeOut(axes), FadeOut(graph), FadeOut(label), FadeOut(dot))

    return _make_scene(construct)


# ---------------------------------------------------------------------------
# 8. Transformer Block
# ---------------------------------------------------------------------------

def transformer_block(title: str = "Transformer Block") -> type[Scene]:
    """Template: transformer_block - Transformer encoder block with attention, FFN, and skip connections."""
    def construct(self):
        title_mob = Text(title, font_size=36).to_edge(UP)
        self.play(Write(title_mob))

        boxes = [
            ("Input", BLUE),
            ("Multi-Head\nAttention", GREEN),
            ("Add & Norm", YELLOW),
            ("Feed-Forward\nNetwork", PURPLE),
            ("Add & Norm", YELLOW),
            ("Output", BLUE),
        ]

        block_group = VGroup()
        for i, (label, color) in enumerate(boxes):
            rect = Rectangle(width=3, height=0.7, fill_color=color, fill_opacity=0.3, stroke_color=color, stroke_width=2)
            text = Text(label, font_size=18)
            block = VGroup(rect, text)
            block_group.add(block)
        block_group.arrange(DOWN, buff=0.3).move_to(ORIGIN)

        for i in range(len(block_group) - 1):
            arrow = Arrow(
                block_group[i].get_bottom(),
                block_group[i + 1].get_top(),
                buff=0.05,
                color=WHITE,
                stroke_width=2,
                max_tip_length_to_length_ratio=0.15,
            )
            self.play(FadeIn(block_group[i]), Create(arrow), run_time=0.4)
        self.play(FadeIn(block_group[-1]), run_time=0.4)

        skip1 = Arrow(
            block_group[0].get_right(),
            block_group[2].get_right(),
            buff=0.1,
            color=ORANGE,
            stroke_width=2,
            max_tip_length_to_length_ratio=0.15,
        )
        skip1.shift(RIGHT * 2.2)
        skip_label1 = Text("skip", font_size=14, color=ORANGE).next_to(skip1, RIGHT, buff=0.1)

        skip2 = Arrow(
            block_group[2].get_right(),
            block_group[4].get_right(),
            buff=0.1,
            color=ORANGE,
            stroke_width=2,
            max_tip_length_to_length_ratio=0.15,
        )
        skip2.shift(RIGHT * 2.2)
        skip_label2 = Text("skip", font_size=14, color=ORANGE).next_to(skip2, RIGHT, buff=0.1)

        self.play(Create(skip1), Write(skip_label1), Create(skip2), Write(skip_label2))
        self.wait(2)

        all_mobs = VGroup(block_group, skip1, skip_label1, skip2, skip_label2, title_mob)
        self.play(FadeOut(all_mobs))

    return _make_scene(construct)


# ---------------------------------------------------------------------------
# 9. Linear Combination
# ---------------------------------------------------------------------------

def linear_combination(
    vectors: list[tuple[float, float]] | None = None,
    weights: list[float] | None = None,
    title: str = "Linear Combination",
) -> type[Scene]:
    """Template: linear_combination - Weighted sum of vectors Σ wᵢvᵢ with geometric visualization."""
    if vectors is None:
        vectors = [(2, 1), (1, 2)]
    if weights is None:
        weights = [0.5, 0.8]

    def construct(self):
        title_mob = Text(title, font_size=36).to_edge(UP)
        self.play(Write(title_mob))

        origin = ORIGIN + DOWN * 0.5
        colors = [BLUE, GREEN, RED]

        vec_mobs = []
        for i, (vx, vy) in enumerate(vectors):
            end = origin + RIGHT * vx * 0.8 + UP * vy * 0.8
            arrow = Arrow(origin, end, buff=0, color=colors[i % len(colors)], stroke_width=3)
            label = Text(f"v{i+1}", font_size=24, color=colors[i % len(colors)])
            label.next_to(end, RIGHT, buff=0.1)
            vec_mobs.append((arrow, label))
            self.play(Create(arrow), Write(label))

        self.wait(0.5)

        scaled = VGroup()
        for i, (vx, vy) in enumerate(vectors):
            w = weights[i] if i < len(weights) else 1.0
            sx, sy = vx * w, vy * w
            end = origin + RIGHT * sx * 0.8 + UP * sy * 0.8
            arrow = Arrow(origin, end, buff=0, color=colors[i % len(colors)], stroke_width=2, stroke_opacity=0.5)
            w_label = Text(f"{w:.1f} * v{i+1}", font_size=20, color=colors[i % len(colors)])
            w_label.next_to(end, RIGHT, buff=0.1)
            scaled.add(arrow)
            self.play(Create(arrow), Write(w_label), run_time=0.5)

        total_x = sum(v[0] * (weights[i] if i < len(weights) else 1.0) for i, v in enumerate(vectors))
        total_y = sum(v[1] * (weights[i] if i < len(weights) else 1.0) for i, v in enumerate(vectors))
        result_end = origin + RIGHT * total_x * 0.8 + UP * total_y * 0.8
        result_arrow = Arrow(origin, result_end, buff=0, color=YELLOW, stroke_width=4)
        result_label = Text("Σ wᵢvᵢ", font_size=26, color=YELLOW).next_to(result_end, RIGHT, buff=0.15)

        self.play(Create(result_arrow), Write(result_label))
        self.wait(2)

        all_mobs = VGroup(title_mob, result_arrow, result_label)
        for a, l in vec_mobs:
            all_mobs.add(a, l)
        all_mobs.add(*scaled)
        self.play(FadeOut(all_mobs))

    return _make_scene(construct)


# ---------------------------------------------------------------------------
# 10. Probability Distribution
# ---------------------------------------------------------------------------

def probability_distribution(dist_type: str = "gaussian", title: str = "Probability Distribution") -> type[Scene]:
    """Template: probability_distribution - Probability density (Gaussian or Uniform) with random sampling."""
    def construct(self):
        title_mob = Text(title, font_size=36).to_edge(UP)
        self.play(Write(title_mob))

        axes = Axes(x_range=[-4, 4], y_range=[0, 0.5], axis_config={"include_numbers": False}).scale(0.8)

        if dist_type == "gaussian":
            mu, sigma = 0, 1
            f = lambda x: (1 / (sigma * math.sqrt(2 * math.pi))) * math.exp(-0.5 * ((x - mu) / sigma) ** 2)
            label = Text("f(x) = (1/σ√2π) e^(-(x-μ)²/2σ²)", font_size=22, color=BLUE)
        else:
            f = lambda x: 0.25 if -2 <= x <= 2 else 0
            label = Text("f(x) = 0.25 for -2 ≤ x ≤ 2", font_size=22, color=BLUE)

        graph = FunctionGraph(f, x_range=[-4, 4, 0.01], color=BLUE)
        label.to_edge(RIGHT).shift(UP * 0.5)
        self.play(Create(axes), Create(graph), Write(label))
        self.wait(0.5)

        sample_text = Text("Sampling...", font_size=24, color=GREEN).to_edge(DOWN)
        self.play(Write(sample_text))

        import random

        for _ in range(6):
            if dist_type == "gaussian":
                sample = random.gauss(mu, sigma)
            else:
                sample = random.uniform(-2, 2)
            sample = max(-3.5, min(3.5, sample))
            y_val = f(sample)
            dot = Dot(axes.c2p(sample, y_val), color=RED, radius=0.07)
            line = Line(axes.c2p(sample, 0), axes.c2p(sample, y_val), color=RED, stroke_width=1, stroke_opacity=0.5)
            self.play(FadeIn(dot), Create(line), run_time=0.3)

        self.wait(1)
        self.play(
            FadeOut(title_mob), FadeOut(axes), FadeOut(graph),
            FadeOut(label), FadeOut(sample_text),
        )

    return _make_scene(construct)


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

TEMPLATES: dict[str, Callable] = {
    "matrix_multiply": matrix_multiply,
    "attention_heatmap": attention_heatmap,
    "gradient_descent": gradient_descent,
    "convolution_1d": convolution_1d,
    "softmax_distribution": softmax_distribution,
    "embedding_lookup": embedding_lookup,
    "loss_landscape": loss_landscape,
    "transformer_block": transformer_block,
    "linear_combination": linear_combination,
    "probability_distribution": probability_distribution,
}


def render_template(template_name: str, params: dict, output_path: str) -> Path:
    """Render a named template to an MP4 video using Manim."""
    if template_name not in TEMPLATES:
        print(f"Unknown template: {template_name}. Available: {list(TEMPLATES.keys())}")
        return False

    import inspect
    factory = TEMPLATES[template_name]
    valid_params = inspect.signature(factory).parameters
    safe_params = {k: v for k, v in params.items() if k in valid_params}

    # Coerce types to match signatures
    for k, sig_param in valid_params.items():
        if k in safe_params:
            expected_type = sig_param.annotation if sig_param.annotation != inspect.Parameter.empty else None
            if expected_type == int:
                safe_params[k] = int(safe_params[k])
            elif expected_type == float:
                safe_params[k] = float(safe_params[k])

    scene_cls = factory(**safe_params)

    media_dir = "/tmp/manim_media"
    output_stem = Path(output_path).stem
    config.media_dir = media_dir
    config.output_file = output_stem
    config.quality = "low_quality"

    scene = scene_cls()
    try:
        scene.render()
    except Exception as e:
        print(f"Render failed: {e}")
        return False

    # Find the rendered file - manim outputs to videos/{SceneName}/{quality}/{filename}.mp4
    videos_dir = Path(media_dir) / "videos"
    rendered = None

    # Search two levels deep: scene_name/quality/
    for scene_dir in videos_dir.iterdir():
        if not scene_dir.is_dir():
            continue
        for quality_dir in scene_dir.iterdir():
            if not quality_dir.is_dir():
                continue
            candidate = quality_dir / f"{output_stem}.mp4"
            if candidate.exists():
                rendered = candidate
                break
        if rendered:
            break

    if rendered is None:
        # Fallback: glob for the file anywhere under videos/
        for candidate in videos_dir.rglob(f"{output_stem}.mp4"):
            rendered = candidate
            break

    if rendered and rendered.exists():
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(rendered), output_path)
        return True

    print(f"Rendered file not found")
    return False
