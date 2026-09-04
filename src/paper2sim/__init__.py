"""
Paper2Sim - Convert academic papers into animated educational videos
"""

from paper2sim.client import Paper2SimAnimationClient, Paper2SimBreakdownClient, Paper2SimClient
from paper2sim.models import AnimationResult, AtomicTopic, Breakdown, Scene, TopicStoryboard

__version__ = "0.1.0"

__all__ = [
    "AnimationResult",
    "AtomicTopic",
    "Breakdown",
    "Paper2SimAnimationClient",
    "Paper2SimBreakdownClient",
    "Paper2SimClient",  # Backwards compatibility alias for Paper2SimBreakdownClient
    "Scene",
    "TopicStoryboard",
]

