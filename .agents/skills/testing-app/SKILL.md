# Testing the AI Jules Trading Platform

## Deployment URLs
- **Frontend (Devin deploy):** https://project-link-checker-7qiks3jn.devinapps.com/
- **Frontend (Fly.io):** https://ai-jules.fly.dev/
- **Backend API:** https://lawliet-labs-backend.fly.dev/api
- **Turso Database:** libsql://lawliet-labs-lawliet-labs.aws-ap-northeast-1.turso.io

## Admin Access
- Admin page: Click "Admin" in the nav bar
- Password: stored in `VITE_ADMIN_PASSWORD` env var
- Backend admin header: `X-Admin-Key` header with value from `ADMIN_API_KEY` env var

## Key Test Flows

### 1. Home Page
- Should load 8 arena cards with real data from Turso
- Market status badge (orange "US Market Closed" or green "US Market Open")
- AI Agent Health Monitor section shows connected agents
- No white-screen crashes

### 2. Arena Detail Page
- Click any arena card to enter detail view
- Left: Agent Leaderboard (ranked by return %)
- Center: Model Chats with AI trading logs (Feb 9 2026 earliest)
- Right sidebar: Portfolio tab with per-agent switcher dropdown

### 3. Portfolio Switcher
- Default: "All Combined" view (aggregated across all agents)
- Dropdown lists each agent with colored avatar and return %
- Selecting individual agent shows their holdings, cash balance, P&L
- Cash Balance section only appears for individual agents (not All Combined)

### 4. Manual Trading
- Click "Manual Trade" on arena detail page
- Select action (BUY/SELL), enter symbol and quantity
- Backend validates: cash balance for buys, holdings for sells

### 5. AI Logs / Full Logs
- Click "Full Logs" link in Model Chats section
- Shows expanded view with BUY/SELL/HOLD decision badges
- Timestamps show date + time (e.g. "Apr 3, 07:05 PM")

## Common Issues

### Backend Hibernation
Turso free-tier databases hibernate after inactivity. First request may take 15-75 seconds. The `turso_dbapi.py` adapter has retry logic with exponential backoff.

### Old vs New Backend
The deployed backend at `lawliet-labs-backend.fly.dev` may be running older code. New features (like `/market/status` endpoint) only work after redeploying with latest GitHub code.

### Arena Navigation
Clicking arena cards may require using JavaScript click (`onClick`) rather than coordinate clicks due to the card's overlay structure.

## API Endpoints for Testing
```
GET /api/arenas                    # List all arenas
GET /api/arenas/{id}/leaderboard   # Agent rankings
GET /api/trades/{arena_id}?limit=1000  # Trade history
GET /api/agents/logs/{arena_id}?limit=1000  # AI reasoning logs
GET /api/portfolio/all/{arena_id}  # All agent portfolios
GET /api/portfolio/history/{arena_id}  # Portfolio value over time
GET /api/ai/status                 # Agent health status
GET /api/market/status             # US market open/closed
GET /api/settings                  # Admin settings
POST /api/trades/manual            # Place manual trade
```

## Branch Info
- Default branch: `feature/multi-arena-orchestrator-12773577014267413766`
- Working branch: `devin/1775212061-restore-full-app`
- PR: https://github.com/zutronn/AI_Jules/pull/6
