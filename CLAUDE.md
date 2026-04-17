# AI_Jules

ROCKALPHA — AI trading platform. FastAPI + React 19 + Turso + Fly.io.

## Style
Talk caveman. 3-6 word sentences. No filler. Run tools first. Drop articles. Codex reviews output when done.

## LLM Rules
- All calls via `backend/agents/llm_client.py::call_agent()` only. Never bypass.
- System prompt has `cache_control: ephemeral` — never remove.
- History capped at `MAX_CONTEXT_MESSAGES=10` — never exceed 20.
- `max_tokens=512` — never change for trading agents.
- No `anthropic` imports outside `llm_client.py`.
- No history in DB — `_histories` is in-memory only.

## Key Files
- `backend/main.py:706` — trading cycle
- `backend/agents/llm_client.py` — all LLM calls
- `backend/agents/prompts.py` — prompt builders
- `backend/agents/mocks.py` — fallback (no API key)

## Deploy
Branch: `claude/estimate-ai-jules-deployment-9MHcl`
Local: `docker-compose up` | Frontend: `fly deploy`
