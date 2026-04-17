# AI_Jules — Claude Code Guide

## Project Overview
**ROCKALPHA** — AI-driven autonomous trading platform. 6 mock trading agents compete in configurable arenas using real stock data (Finnhub). Stack: FastAPI + React 19 + Turso (SQLite serverless) + Fly.io.

## Communication Style (ALWAYS follow these)

Talk like caveman. Save tokens.

- Short sentences. 3-6 words max.
- No filler, preamble, pleasantries.
- Run tools first. Show result. Stop.
- No narration.
- Drop articles. ("Me fix code" not "I will fix the code.")

## Review
Codex will review output once done.

## Token-Saving Conventions (ALWAYS follow these)

### 1. Prompt Caching
All Claude API calls go through `backend/agents/llm_client.py::call_agent()`.
The system prompt uses `cache_control: {"type": "ephemeral"}` — **never remove this**.
This caches the static system prompt (~600 tokens) across all cycles, cutting costs ~90% on repeat calls.

### 2. Context Trimming
`llm_client.py` maintains per-agent message history keyed by `"{arena_id}:{agent_id}"`.
History is capped at `MAX_CONTEXT_MESSAGES = 10`. Do not raise this above 20.
When adding new agent conversation features, always use `call_agent()` — never bypass it with raw `client.messages.create()`.

### 3. Structured Outputs
All agent responses are enforced as JSON matching the schema in `backend/agents/prompts.py::SYSTEM_PROMPT`.
The `call_agent()` function includes a regex fallback to extract JSON if the model adds surrounding text.
Do not change `max_tokens=512` for trading agents — responses are small JSON objects.

## Architecture
```
backend/
  main.py               # FastAPI app — trading cycle at line ~706
  agents/
    llm_client.py       # ALL LLM calls go here (caching + trimming + JSON)
    prompts.py          # System + context prompt builders
    mocks.py            # Fallback mock agents (used when ANTHROPIC_API_KEY unset)
    orchestrator.py     # Simple voting orchestrator
    monitoring.py       # DB error scanner
    self_improvement.py # Performance log analyzer
  models.py             # SQLAlchemy ORM (Agent, Arena, Trade, Portfolio, AgentMemory, ReasoningLog)
  turso_dbapi.py        # Custom Turso HTTP adapter for SQLAlchemy

frontend/
  src/
    App.tsx             # Main app + routing
    components/         # 9 React components
  fly.toml              # Fly.io deployment (app: ai-jules, region: iad)
```

## Key Rules
- **ANTHROPIC_API_KEY** env var enables real LLM calls; without it agents fall back to mocks automatically.
- **Never** import `anthropic` directly in `main.py` or agent files — always use `llm_client.call_agent()`.
- **Never** store raw conversation history in the DB — `_histories` dict in `llm_client.py` is intentionally in-memory.
- Trading decisions flow: `main.py` builds prompts → `call_agent()` → parse JSON → `decision/symbol/reasoning/learnings`.
- Agent learnings are persisted to `models.AgentMemory` and fed back via `build_context_prompt()` on the next cycle.

## Deployment
- Backend: Docker (`backend/Dockerfile`) — `uvicorn main:app --host 0.0.0.0 --port 8000`
- Frontend: Fly.io — `cd frontend && fly deploy`
- Local: `docker-compose up`
- Branch: `claude/estimate-ai-jules-deployment-9MHcl`
