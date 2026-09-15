"""LLM fallback chain — proves Groq → OpenRouter → Gemini → mock ordering.

No keys, no network: httpx.post is faked. The one thing standing between
the deployed Render backend and a dead demo is this failover working.
"""


class _Resp:
    def __init__(self, content):
        self._content = content

    def raise_for_status(self):
        pass

    def json(self):
        return {"choices": [{"message": {"content": self._content}}]}


def _fake(monkeypatch, calls, behaviors):
    """behaviors: dict url-substring -> content str (return) or Exception (raise)."""
    from paper2sim import llm as L

    def post(url, headers=None, json=None, timeout=None):
        calls.append(url)
        for key, behavior in behaviors.items():
            if key in url:
                if isinstance(behavior, Exception):
                    raise behavior
                return _Resp(behavior)
        raise AssertionError(f"unexpected url {url}")

    monkeypatch.setattr(L.httpx, "post", post)


def _keys(monkeypatch, **kw):
    for k in ("GROQ_API_KEY", "OPENROUTER_API_KEY", "GOOGLE_AI_STUDIO_API_KEY"):
        monkeypatch.delenv(k, raising=False)
    for k, v in kw.items():
        monkeypatch.setenv(k, v)


def test_groq_first_when_healthy(monkeypatch):
    from paper2sim import llm as L

    _keys(monkeypatch, GROQ_API_KEY="g", OPENROUTER_API_KEY="o", GOOGLE_AI_STUDIO_API_KEY="x")
    calls = []
    _fake(monkeypatch, calls, {"groq": "GROQ-OK", "openrouter": "O-OK", "googleapis": "X-OK"})
    assert L.chat("s", "u") == "GROQ-OK"
    assert len(calls) == 1 and "groq" in calls[0]


def test_groq_429_fails_over_to_openrouter_then_gemini(monkeypatch):
    from paper2sim import llm as L

    _keys(monkeypatch, GROQ_API_KEY="g", OPENROUTER_API_KEY="o", GOOGLE_AI_STUDIO_API_KEY="x")
    calls = []
    _fake(monkeypatch, calls, {"groq": RuntimeError("429"), "openrouter": RuntimeError("429"), "googleapis": "GEMINI-OK"})
    assert L.chat("s", "u") == "GEMINI-OK"
    assert [c.split("/")[2] for c in calls] == ["api.groq.com", "openrouter.ai", "generativelanguage.googleapis.com"]


def test_openrouter_tries_model_list_in_order(monkeypatch):
    from paper2sim import llm as L

    _keys(monkeypatch, OPENROUTER_API_KEY="o", OPENROUTER_MODEL="m1, m2")
    seen = []

    def post(url, headers=None, json=None, timeout=None):
        seen.append(json["model"])
        if json["model"] == "m1":
            raise RuntimeError("404")
        return _Resp("M2-OK")

    monkeypatch.setattr(L.httpx, "post", post)
    assert L.chat("s", "u") == "M2-OK"
    assert seen == ["m1", "m2"]


def test_all_dark_falls_back_to_mock(monkeypatch):
    import json as J

    from paper2sim import llm as L

    _keys(monkeypatch)
    assert "claim" in J.loads(L.chat("TASK: ANALYZE", "u"))
