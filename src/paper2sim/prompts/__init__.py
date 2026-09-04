"""Prompts for Paper2Sim document processing."""

from paper2sim.prompts.animate import (
    MANIM_CODING_AGENT_PROMPT,
    SCENE_BOILERPLATE,
    format_storyboard_prompt,
)
from paper2sim.prompts.breakdown import BREAKDOWN_PROMPT
from paper2sim.prompts.mapping import MAPPING_PROMPT, format_mapping_prompt
from paper2sim.prompts.storyboard import STORYBOARD_PROMPT, format_topic_input

__all__ = [
    "BREAKDOWN_PROMPT",
    "MAPPING_PROMPT",
    "MANIM_CODING_AGENT_PROMPT",
    "SCENE_BOILERPLATE",
    "STORYBOARD_PROMPT",
    "format_mapping_prompt",
    "format_storyboard_prompt",
    "format_topic_input",
]

