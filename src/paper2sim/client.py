"""Paper2Sim clients for document processing and animation generation.

Provides Paper2SimBreakdownClient for Groq API-based document analysis
and Paper2SimAnimationClient for LLM-driven Manim code generation.
"""

import copy
import json
import os
import pathlib
import re
import subprocess
import time
from collections.abc import Callable

from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend
from langchain_core.language_models import BaseChatModel
from openai import OpenAI

from paper2sim.models import AnimationResult, AtomicTopic, Breakdown, TopicStoryboard
from paper2sim.prompts import (
    MANIM_CODING_AGENT_PROMPT,
    SCENE_BOILERPLATE,
    STORYBOARD_PROMPT,
    format_storyboard_prompt,
    format_topic_input,
)
from paper2sim.prompts.breakdown import BREAKDOWN_PROMPT


def _extract_pdf_text(file_path: pathlib.Path) -> str:
    """Extract text from a PDF using PyMuPDF.

    Args:
        file_path: Path to the PDF file.

    Returns:
        Extracted text with double newlines between pages.
    """
    import pymupdf

    doc = pymupdf.open(str(file_path))
    text_parts = []
    for page in doc:
        text_parts.append(page.get_text())
    doc.close()
    return "\n\n".join(text_parts)


def _extract_json(text: str) -> str:
    """Extract JSON from a response that may contain markdown fences, thinking blocks, and bold formatting.

    Handles: <think> blocks, **bold**, ```json fences, and raw JSON with brace tracking.
    """
    # Strip thinking blocks
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    # Strip markdown bold
    text = re.sub(r'\*\*', '', text)
    # Try to extract from code block first
    match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        return match.group(1)
    match = re.search(r"```\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        return match.group(1)
    # Otherwise find raw JSON object
    start = text.find('{')
    if start == -1:
        return text
    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(text)):
        c = text[i]
        if escape:
            escape = False
            continue
        if c == '\\' and in_string:
            escape = True
            continue
        if c == '"' and not escape:
            in_string = not in_string
            continue
        if not in_string:
            if c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    return text[start : i + 1]
    return text[start:]


def _fix_json_strings(text: str) -> str:
    """Fix common JSON issues: unescaped newlines/tabs inside string values."""
    result = []
    in_string = False
    escape = False
    for c in text:
        if escape:
            result.append(c)
            escape = False
            continue
        if c == '\\' and in_string:
            result.append(c)
            escape = True
            continue
        if c == '"':
            in_string = not in_string
            result.append(c)
            continue
        if in_string:
            if c == '\n':
                result.append('\\n')
            elif c == '\r':
                result.append('\\r')
            elif c == '\t':
                result.append('\\t')
            else:
                result.append(c)
        else:
            result.append(c)
    return ''.join(result)


class Paper2SimBreakdownClient:
    """Client for breaking down documents and generating storyboards."""

    def __init__(self, api_key: str | None = None, base_url: str = "https://api.groq.com/openai/v1"):
        """Initialize the breakdown client.

        Args:
            api_key: API key for the LLM provider. Falls back to GROQ_API_KEY env var.
            base_url: Base URL for the OpenAI-compatible API.
        """
        api_key = api_key or os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise ValueError("No API key provided. Set GROQ_API_KEY env var or pass api_key.")
        self.client = OpenAI(api_key=api_key, base_url=base_url)

    def breakdown(
        self,
        file_path: str | pathlib.Path,
        model: str = "openai/gpt-oss-120b",
    ) -> tuple[Breakdown | None, str]:
        """Break down a PDF document into atomic, self-contained topics.

        Args:
            file_path: Path to the PDF file to analyze.
            model: Model to use for the breakdown.

        Returns:
            A tuple of (Breakdown object or None, raw response text).
        """
        file_path = pathlib.Path(file_path)
        pdf_text = _extract_pdf_text(file_path)

        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": BREAKDOWN_PROMPT},
                {"role": "user", "content": f"Analyze this document:\n\n{pdf_text[:10000]}"},
            ],
            max_tokens=2048,
            temperature=0.3,
        )

        raw_text = response.choices[0].message.content or ""

        try:
            json_str = _extract_json(raw_text)
            json_str = _fix_json_strings(json_str)
            data = json.loads(json_str)
            breakdown = Breakdown.model_validate(data)
        except Exception as e:
            print(f"Error parsing breakdown: {e}")
            print("Raw response:", raw_text[:500])
            return None, raw_text

        return breakdown, raw_text

    def storyboard(
        self,
        topic: AtomicTopic,
        source_text: str | None = None,
        model: str = "openai/gpt-oss-120b",
    ) -> tuple[TopicStoryboard | None, str]:
        """Create a storyboard for an atomic topic.

        Args:
            topic: The AtomicTopic to transform into a storyboard.
            source_text: Optional source text for additional context.
            model: Model to use for storyboard generation.

        Returns:
            A tuple of (TopicStoryboard object or None, raw response text).
        """
        final_prompt = STORYBOARD_PROMPT + format_topic_input(topic)

        user_content = final_prompt
        if source_text:
            user_content = f"Source context (use for accuracy, don't repeat verbatim):\n\n{source_text[:30000]}\n\n---\n\n{final_prompt}"

        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "user", "content": user_content},
            ],
            max_tokens=8192,
            temperature=0.7,
        )

        raw_text = response.choices[0].message.content or ""

        try:
            json_str = _extract_json(raw_text)
            json_str = _fix_json_strings(json_str)
            data = json.loads(json_str)
            storyboard = TopicStoryboard.model_validate(data)
        except Exception as e:
            print(f"Error parsing storyboard: {e}")
            print("Raw response:", raw_text[:500])
            return None, raw_text

        return storyboard, raw_text


class Paper2SimAnimationClient:
    """Client for generating Manim animations from storyboards.

    This client uses a coding agent to generate Manim code from storyboards
    and renders them to video files.

    Example usage:
        ```python
        from langchain_openai import ChatOpenAI

        langchain_model = ChatOpenAI(
            model="llama-3.3-70b-versatile",
            base_url="https://api.groq.com/openai/v1",
            api_key="your_groq_key",
            temperature=0.7,
        )

        animation_client = Paper2SimAnimationClient(
            langchain_model=langchain_model,
            agent_workspace_path="./agent_workspace",
        )
        ```
    """

    def __init__(
        self,
        langchain_model: BaseChatModel,
        agent_workspace_path: str | pathlib.Path,
    ):
        self.langchain_model = langchain_model
        self.agent_workspace_path = pathlib.Path(agent_workspace_path).resolve()
        self.manim_docs_path = self.agent_workspace_path / "manim_docs"
        self.animation_workspace_path = self.agent_workspace_path / "animation_workspace"
        self.rendered_videos_path = self.agent_workspace_path / "rendered_videos"

        if not self.agent_workspace_path.exists():
            raise ValueError(f"agent_workspace_path does not exist: {self.agent_workspace_path}")
        if not self.manim_docs_path.exists():
            raise ValueError(f"manim_docs folder not found: {self.manim_docs_path}")
        self.animation_workspace_path.mkdir(parents=True, exist_ok=True)
        self.rendered_videos_path.mkdir(parents=True, exist_ok=True)

    def _create_agent(self):
        return create_deep_agent(
            model=self.langchain_model,
            system_prompt=MANIM_CODING_AGENT_PROMPT,
            backend=FilesystemBackend(root_dir=str(self.agent_workspace_path), virtual_mode=True),
        )

    def _prepare_workspace(self):
        for item in self.animation_workspace_path.iterdir():
            if item.is_file():
                item.unlink()
            elif item.is_dir():
                import shutil
                shutil.rmtree(item)
        scene_file = self.animation_workspace_path / "scene.py"
        scene_file.write_text(SCENE_BOILERPLATE)

    def _render_scene(self) -> subprocess.CompletedProcess:
        my_env = os.environ.copy()
        my_env["PATH"] = "/Library/TeX/texbin:" + os.environ.get("PATH", "")
        return subprocess.run(
            ["uv", "run", "manim", "-ql", "scene.py"],
            capture_output=True,
            text=True,
            cwd=str(self.animation_workspace_path),
            env=my_env,
        )

    def _check_render_success(self) -> bool:
        # -ql renders to 480p15
        video_dir = self.animation_workspace_path / "media" / "videos" / "scene" / "480p15"
        if not video_dir.exists():
            # Fallback: search recursively for any .mp4 under media/videos/
            videos_root = self.animation_workspace_path / "media" / "videos"
            return any(videos_root.rglob("*.mp4")) if videos_root.exists() else False
        return len(list(video_dir.glob("*.mp4"))) > 0

    def _get_video_path(self) -> pathlib.Path | None:
        # -ql renders to 480p15
        video_dir = self.animation_workspace_path / "media" / "videos" / "scene" / "480p15"
        if video_dir.exists():
            video_files = list(video_dir.glob("*.mp4"))
            if video_files:
                return video_files[0]
        # Fallback: search recursively
        videos_root = self.animation_workspace_path / "media" / "videos"
        if videos_root.exists():
            for f in videos_root.rglob("*.mp4"):
                return f
        return None

    def _sanitize_filename(self, name: str) -> str:
        sanitized = name.replace(" ", "_")
        sanitized = re.sub(r"[^\w\-]", "", sanitized)
        return sanitized[:50].lower()

    def animate(
        self,
        breakdown: Breakdown,
        storyboards: list[TopicStoryboard],
        topic_indices: list[int] | None = None,
        max_iterations: int = 5,
        on_progress: Callable[[int, int, str], None] | None = None,
        ratelimit: int = 0,
    ) -> list[AnimationResult]:
        import shutil

        if topic_indices is None:
            topic_indices = list(range(len(storyboards)))

        results: list[AnimationResult] = []

        for topic_idx in topic_indices:
            if topic_idx >= len(storyboards):
                results.append(AnimationResult(
                    topic_index=topic_idx,
                    topic_name=breakdown.topics[topic_idx].name if topic_idx < len(breakdown.topics) else "Unknown",
                    success=False,
                    error_message=f"No storyboard found for topic index {topic_idx}",
                ))
                continue

            if topic_idx >= len(breakdown.topics):
                results.append(AnimationResult(
                    topic_index=topic_idx,
                    topic_name="Unknown",
                    success=False,
                    error_message=f"No topic found in breakdown for index {topic_idx}",
                ))
                continue

            storyboard = storyboards[topic_idx]
            topic_name = breakdown.topics[topic_idx].name

            if on_progress:
                on_progress(topic_idx, 0, f"Starting animation for topic: {topic_name}")

            self._prepare_workspace()
            agent = self._create_agent()
            prompt = format_storyboard_prompt(breakdown, storyboard, topic_idx)

            if on_progress:
                on_progress(topic_idx, 0, "Running coding agent...")

            if ratelimit > 0:
                time.sleep(ratelimit)
            result = agent.invoke({"messages": [{"role": "user", "content": prompt}]})

            manim_result = self._render_scene()
            success = self._check_render_success()

            iteration = 0
            while not success and iteration < max_iterations:
                iteration += 1
                if on_progress:
                    on_progress(topic_idx, iteration, f"Render failed, retrying ({iteration}/{max_iterations})...")

                history = copy.deepcopy(result["messages"])
                history.append({"role": "assistant", "content": manim_result.stderr})
                result = agent.invoke({"messages": history})
                if ratelimit > 0:
                    time.sleep(ratelimit)
                manim_result = self._render_scene()
                success = self._check_render_success()

            scene_file = self.animation_workspace_path / "scene.py"
            scene_code = scene_file.read_text() if scene_file.exists() else None

            if success:
                video_path = self._get_video_path()
                if video_path is not None:
                    sanitized_name = self._sanitize_filename(topic_name)
                    output_file = self.rendered_videos_path / f"{sanitized_name}_{topic_idx}.mp4"
                    shutil.copy(video_path, output_file)
                    video_path = output_file
                if on_progress:
                    on_progress(topic_idx, iteration, f"Success! Video saved to {video_path}")
                results.append(AnimationResult(
                    topic_index=topic_idx, topic_name=topic_name, success=True,
                    video_path=video_path, scene_code=scene_code, iterations=iteration,
                ))
            else:
                if on_progress:
                    on_progress(topic_idx, iteration, f"Failed after {iteration} iterations")
                results.append(AnimationResult(
                    topic_index=topic_idx, topic_name=topic_name, success=False,
                    scene_code=scene_code, error_message=manim_result.stderr if manim_result else "Unknown error",
                    iterations=iteration,
                ))

        return results

    def animate_single(
        self,
        breakdown: Breakdown,
        storyboard: TopicStoryboard,
        topic_index: int,
        max_iterations: int = 5,
        on_progress: Callable[[int, int, str], None] | None = None,
        ratelimit: int = 0,
    ) -> AnimationResult:
        import shutil

        topic_name = breakdown.topics[topic_index].name if topic_index < len(breakdown.topics) else "Unknown"

        if on_progress:
            on_progress(topic_index, 0, f"Starting animation for topic: {topic_name}")

        self._prepare_workspace()
        agent = self._create_agent()
        prompt = format_storyboard_prompt(breakdown, storyboard, topic_index)

        if on_progress:
            on_progress(topic_index, 0, "Running coding agent...")

        if ratelimit > 0:
            time.sleep(ratelimit)
        result = agent.invoke({"messages": [{"role": "user", "content": prompt}]})

        manim_result = self._render_scene()
        success = self._check_render_success()

        iteration = 0
        while not success and iteration < max_iterations:
            iteration += 1
            if on_progress:
                on_progress(topic_index, iteration, f"Render failed, retrying ({iteration}/{max_iterations})...")

            history = copy.deepcopy(result["messages"])
            history.append({"role": "assistant", "content": manim_result.stderr})
            result = agent.invoke({"messages": history})
            if ratelimit > 0:
                time.sleep(ratelimit)
            manim_result = self._render_scene()
            success = self._check_render_success()

        scene_file = self.animation_workspace_path / "scene.py"
        scene_code = scene_file.read_text() if scene_file.exists() else None

        if success:
            video_path = self._get_video_path()
            if video_path is not None:
                sanitized_name = self._sanitize_filename(topic_name)
                output_file = self.rendered_videos_path / f"{sanitized_name}_{topic_index}.mp4"
                shutil.copy(video_path, output_file)
                video_path = output_file
            if on_progress:
                on_progress(topic_index, iteration, f"Success! Video saved to {video_path}")
            return AnimationResult(
                topic_index=topic_index, topic_name=topic_name, success=True,
                video_path=video_path, scene_code=scene_code, iterations=iteration,
            )
        else:
            if on_progress:
                on_progress(topic_index, iteration, f"Failed after {iteration} iterations")
            return AnimationResult(
                topic_index=topic_index, topic_name=topic_name, success=False,
                scene_code=scene_code, error_message=manim_result.stderr if manim_result else "Unknown error",
                iterations=iteration,
            )


# Backwards compatibility alias
Paper2SimClient = Paper2SimBreakdownClient
