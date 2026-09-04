"""Prompts for mapping equations to Manim templates.

Provides the LLM prompt that classifies equations and selects
the best matching animation template with parameters.
"""

# System prompt for mapping equations to Manim animation templates
MAPPING_PROMPT = """You are a math visualization expert. Given a list of equations extracted from a research paper, map each equation to the most appropriate animation template.

## Available Templates
{template_descriptions}

## Rules
- Each equation maps to at most one template
- If no template fits well, set template to null
- Extract reasonable parameter values from the equation context
- Prioritize the 3-5 most important equations for visualization
- Return ONLY a JSON object

## Output Format
Return a JSON array of objects:
[
  {{
    "equation": "the LaTeX equation",
    "template": "template_name_or_null",
    "params": {{...}},
    "importance": "high|medium|low",
    "reason": "brief explanation of why this equation maps to this template"
  }}
]

## Equations to map:
{equations}
"""

TEMPLATE_DESCRIPTIONS = {
    "matrix_multiply": "Matrix multiplication visualization — params: {{m, n, p}} (dimensions of matrices)",
    "attention_heatmap": "Attention mechanism heatmap — params: {{seq_len, head_dim}} (sequence and head dimensions)",
    "gradient_descent": "Gradient descent optimization — params: {{loss_fn, steps, learning_rate}} (loss function type and hyperparams)",
    "convolution_1d": "1D convolution operation — params: {{signal_len, kernel_size}} (signal and kernel dimensions)",
    "softmax_distribution": "Softmax normalization — params: {{values}} (list of input values)",
    "embedding_lookup": "Embedding lookup — params: {{vocab_size, embed_dim}} (vocabulary and embedding dimensions)",
    "loss_landscape": "Loss landscape visualization — params: {{loss_type}} (\"mse\" or \"cross_entropy\")",
    "transformer_block": "Transformer block — no params needed",
    "linear_combination": "Linear combination of vectors — params: {{num_vectors, dimension}} (number and size of vectors)",
    "probability_distribution": "Probability distribution plot — params: {{dist_type}} (\"gaussian\" or \"uniform\")",
}


def format_mapping_prompt(equations: list[dict]) -> str:
    """Format the mapping prompt with equations and template descriptions.

    Args:
        equations: List of dicts, each with 'label', 'type', and 'latex' keys.

    Returns:
        Complete prompt string ready for LLM submission.
    """
    # Build template description block
    template_descriptions = "\n".join(
        f"- **{name}**: {desc}" for name, desc in TEMPLATE_DESCRIPTIONS.items()
    )

    # Build equation list
    equation_lines = []
    for i, eq in enumerate(equations, 1):
        label = eq.get("label", f"equation_{i}")
        eq_type = eq.get("type", "unknown")
        latex = eq.get("latex", "")
        equation_lines.append(f"{i}. [{label}] ({eq_type}) `{latex}`")
    equations_text = "\n".join(equation_lines)

    return MAPPING_PROMPT.format(
        template_descriptions=template_descriptions,
        equations=equations_text,
    )
