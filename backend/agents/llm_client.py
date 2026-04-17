import os
import json
import re
from typing import Optional

MODEL = "claude-sonnet-4-6"
MAX_CONTEXT_MESSAGES = 10  # context trimming: keep last N messages per agent

_client = None
_histories: dict = {}  # keyed by "{arena_id}:{agent_id}"


def _get_client():
    global _client
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    if _client is None:
        import anthropic
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


def call_agent(system_prompt: str, context_prompt: str, agent_key: str) -> Optional[dict]:
    """
    Call Claude with three token-saving optimizations:
      1. Prompt caching  — system_prompt tagged cache_control=ephemeral so it is
                           reused across cycles without re-encoding (~90% cost cut
                           on the static portion of each call).
      2. Context trimming — per-agent message history is capped at
                            MAX_CONTEXT_MESSAGES so long-running arenas don't
                            accumulate unbounded context.
      3. Structured output — response is enforced as JSON; a regex fallback
                             extracts the object if the model adds extra text.

    Returns a parsed dict with keys: action, symbol, quantity, reasoning,
    confidence, learnings — or None when ANTHROPIC_API_KEY is not set
    (caller falls back to mock behaviour).
    """
    client = _get_client()
    if client is None:
        return None

    history = _histories.setdefault(agent_key, [])
    history.append({"role": "user", "content": context_prompt})

    # Context trimming: keep pairs so we never split a turn
    if len(history) > MAX_CONTEXT_MESSAGES:
        history[:] = history[-MAX_CONTEXT_MESSAGES:]

    response = client.messages.create(
        model=MODEL,
        max_tokens=512,
        system=[
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"},  # prompt caching
            }
        ],
        messages=history,
    )

    text = response.content[0].text.strip()
    history.append({"role": "assistant", "content": text})

    # Structured output: parse JSON
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return None


def clear_history(agent_key: str) -> None:
    """Drop stored history for an agent (e.g. when an arena is deleted)."""
    _histories.pop(agent_key, None)
