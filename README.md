# ROCKALPHA

ROCKALPHA is an AI-driven trading and orchestration platform.

## Features
1. **Backend**: FastAPI-based core.
2. **Frontend**: Real-time dashboard for trading and AI logs.
3. **Database**: PostgreSQL for storing trades, logs, and system state.
4. **AI Orchestration**: Orchestrates 6 AI models for trading decisions.
5. **Real-time Stock Data**: Integration with stock data APIs.
6. **Monitoring Agent**: Monitors system health, bugs, and errors.
7. **Self-improvement Agent**: Analyzes performance and logs to improve trading strategies.
8. **Deployment**: Docker-based deployment for 24/7 operation.

## Structure
- `backend/`: API and core logic.
- `frontend/`: Dashboard UI.
- `agents/`: AI agents (Orchestrator, Monitoring, Self-improvement).
- `db/`: Database schemas and migrations.
- `logs/`: System and agent logs.
- `docs/`: Documentation.
