import asyncio
import datetime
import json
import random
import re
import traceback
from contextlib import asynccontextmanager
import os
from fastapi import FastAPI, Depends, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, text
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
import models, database
from agents.prompts import build_system_prompt, build_context_prompt
from services.stock_data import StockDataService

running_tasks: Dict[str, asyncio.Task] = {}
last_successful_cycle: Dict[str, datetime.datetime] = {}
WATCHDOG_STALE_THRESHOLD = 300
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "lawliet2026")
STARTING_CAPITAL = 100_000.0


def seed_settings(db: Session):
    defaults = [
        {"key": "trading_cycle_seconds", "value": "10", "description": "Trading cycle interval in seconds (10-3600)"},
        {"key": "chat_min_interval", "value": "15", "description": "Minimum chat interval in seconds"},
        {"key": "chat_max_interval", "value": "45", "description": "Maximum chat interval in seconds"},
        {"key": "price_update_interval", "value": "3", "description": "Price update interval in seconds"},
        {"key": "ai_thinking_interval", "value": "7200", "description": "AI thinking interval in seconds (default 2 hours)"},
    ]
    for s in defaults:
        existing = db.query(models.Setting).filter(models.Setting.key == s["key"]).first()
        if not existing:
            db.add(models.Setting(**s))
    try:
        db.commit()
    except Exception:
        db.rollback()


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    db = database.SessionLocal()
    seed_settings(db)
    arenas = db.query(models.Arena).all()
    for arena in arenas:
        running_tasks[arena.id] = asyncio.create_task(run_autonomous_trading(arena.id))
        last_successful_cycle[arena.id] = datetime.datetime.utcnow()
    db.close()
    watchdog_task = asyncio.create_task(trading_watchdog())
    yield
    watchdog_task.cancel()
    for task in running_tasks.values():
        task.cancel()


app = FastAPI(title="Lawliet Labs API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
stock_service = StockDataService()


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_admin(x_admin_key: str = Header(None)):
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: invalid or missing X-Admin-Key header")


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/ai/status")
def ai_status(db: Session = Depends(get_db)):
    agents_db = db.query(models.Agent).all()
    agent_list = []
    connected_count = 0
    for agent in agents_db:
        latest_log = (
            db.query(models.ReasoningLog)
            .filter(models.ReasoningLog.agent_id == agent.id)
            .order_by(models.ReasoningLog.created_at.desc())
            .first()
        )
        now = datetime.datetime.utcnow()
        connected = False
        last_response_time = None
        if latest_log and latest_log.created_at:
            last_response_time = latest_log.created_at.isoformat()
            if (now - latest_log.created_at).total_seconds() < 86400:
                connected = True
                connected_count += 1
        agent_list.append({
            "agent_id": agent.id,
            "agent_name": agent.name,
            "connected": connected,
            "last_response_time": last_response_time,
            "last_error": None,
            "response_latency_ms": 0,
        })
    return {
        "agents": agent_list,
        "total_agents": len(agent_list),
        "connected_count": connected_count,
        "disconnected_count": len(agent_list) - connected_count,
    }


@app.get("/arenas")
def read_arenas(db: Session = Depends(get_db)):
    arenas = db.query(models.Arena).all()
    result = []
    for arena in arenas:
        tickers = arena.tickers.split(",") if arena.tickers else []
        tags = arena.tags.split(",") if arena.tags else []
        result.append({
            "id": arena.id,
            "name": arena.name,
            "description": arena.description or "",
            "tickers": [t.strip() for t in tickers],
            "rules": arena.rules or "",
            "prompt": arena.prompt or "",
            "tags": [t.strip() for t in tags],
        })
    return result


@app.post("/arenas")
def create_arena(arena_data: dict, db: Session = Depends(get_db)):
    arena_id = arena_data.get("id") or arena_data.get("name", "").lower().replace(" ", "-")
    tickers = arena_data.get("tickers", "")
    if isinstance(tickers, list):
        tickers = ",".join(tickers)
    tags = arena_data.get("tags", "")
    if isinstance(tags, list):
        tags = ",".join(tags)
    db_arena = models.Arena(
        id=arena_id,
        name=arena_data.get("name", ""),
        description=arena_data.get("description", ""),
        tickers=tickers,
        rules=arena_data.get("rules", ""),
        prompt=arena_data.get("prompt", ""),
        tags=tags,
    )
    db.add(db_arena)
    db.commit()
    db.refresh(db_arena)
    running_tasks[db_arena.id] = asyncio.create_task(run_autonomous_trading(db_arena.id))
    last_successful_cycle[db_arena.id] = datetime.datetime.utcnow()
    return {"id": db_arena.id, "name": db_arena.name}


@app.get("/trades/{arena_id}")
def read_trades(arena_id: str, agent_id: Optional[str] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(models.Trade).filter(models.Trade.arena_id == arena_id)
    if agent_id:
        query = query.filter(models.Trade.agent_id == agent_id)
    trades = query.order_by(models.Trade.created_at.desc()).offset(skip).limit(limit).all()
    agent_cache: Dict[str, str] = {}
    result = []
    for t in trades:
        if t.agent_id not in agent_cache:
            ag = db.query(models.Agent).filter(models.Agent.id == t.agent_id).first()
            agent_cache[t.agent_id] = ag.name if ag else t.agent_id
        result.append({
            "id": t.id,
            "agent_id": t.agent_id,
            "agent_name": agent_cache[t.agent_id],
            "symbol": t.symbol,
            "side": t.side,
            "quantity": t.quantity,
            "price": t.price,
            "total_value": t.total_value,
            "reasoning": t.reasoning or "",
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })
    return result


@app.post("/trades/manual")
def create_manual_trade(trade_data: dict, db: Session = Depends(get_db)):
    arena_id = trade_data.get("arena_id")
    agent_id = trade_data.get("agent_id", "human")
    action = trade_data.get("action", "").lower()
    symbol = trade_data.get("symbol", "").strip().upper()
    quantity = trade_data.get("quantity", 0)
    reasoning = trade_data.get("reasoning", "")
    if not arena_id:
        raise HTTPException(status_code=400, detail="arena_id is required")
    if action not in ("buy", "sell"):
        raise HTTPException(status_code=400, detail="Action must be 'buy' or 'sell'")
    try:
        quantity = float(quantity)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="quantity must be a number")
    if not symbol or quantity <= 0:
        raise HTTPException(status_code=400, detail="Symbol and positive quantity are required")
    try:
        price_data = stock_service.get_realtime_data(symbol)
        current_price = price_data.get("price", 0) if price_data else 0
    except Exception:
        current_price = 0
    if not current_price or current_price <= 0:
        raise HTTPException(status_code=422, detail=f"Could not determine current market price for '{symbol}'.")
    if action == "sell":
        portfolio = db.query(models.Portfolio).filter(
            models.Portfolio.agent_id == agent_id,
            models.Portfolio.arena_id == arena_id,
        ).first()
        if portfolio:
            holding = db.query(models.Holding).filter(
                models.Holding.portfolio_id == portfolio.id,
                models.Holding.symbol == symbol,
            ).first()
            held_qty = holding.quantity if holding and holding.quantity > 0 else 0
        else:
            held_qty = 0
        if held_qty <= 0:
            raise HTTPException(status_code=400, detail=f"Cannot sell {symbol}: no holdings found")
        if quantity > held_qty:
            raise HTTPException(status_code=400, detail=f"Cannot sell {quantity} {symbol}: only {held_qty} shares held")
    total_value = current_price * quantity
    trade = models.Trade(
        agent_id=agent_id, arena_id=arena_id, symbol=symbol, side=action,
        price=current_price, quantity=quantity, total_value=total_value,
        reasoning=reasoning, created_at=datetime.datetime.utcnow(),
    )
    db.add(trade)
    db.commit()
    try:
        _update_portfolio(db, agent_id, arena_id, symbol, action, quantity, current_price, total_value)
    except Exception as e:
        db.rollback()
        print(f"Portfolio update error for manual trade: {e}")
    try:
        log = models.ReasoningLog(
            agent_id=agent_id, arena_id=arena_id,
            message=f"[MANUAL TRADE] {action.upper()} {quantity} {symbol} @ ${current_price:.2f}\n\nReasoning: {reasoning}",
            created_at=datetime.datetime.utcnow(),
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()
    return {"status": "ok", "message": f"Manual {action} {quantity} {symbol} @ ${current_price:.2f} submitted"}


@app.get("/agents/logs/{arena_id}")
def read_agent_logs(arena_id: str, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    logs = (
        db.query(models.ReasoningLog)
        .filter(models.ReasoningLog.arena_id == arena_id)
        .order_by(models.ReasoningLog.created_at.desc())
        .offset(skip).limit(limit).all()
    )
    agent_cache: Dict[str, str] = {}
    result = []
    for log in logs:
        if log.agent_id not in agent_cache:
            ag = db.query(models.Agent).filter(models.Agent.id == log.agent_id).first()
            agent_cache[log.agent_id] = ag.name if ag else log.agent_id
        result.append({
            "id": log.id,
            "agent_id": log.agent_id,
            "agent_name": agent_cache[log.agent_id],
            "message": log.message or "",
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })
    return result


@app.get("/arenas/{arena_id}/leaderboard")
def read_arena_leaderboard(arena_id: str, db: Session = Depends(get_db)):
    portfolios = db.query(models.Portfolio).filter(models.Portfolio.arena_id == arena_id).all()
    leaderboard = []
    for p in portfolios:
        ag = db.query(models.Agent).filter(models.Agent.id == p.agent_id).first()
        agent_name = ag.name if ag else p.agent_id
        avatar_url = ag.avatar_url if ag else ""
        return_pct = ((p.total_value - STARTING_CAPITAL) / STARTING_CAPITAL) * 100 if p.total_value else 0
        leaderboard.append({
            "agent_id": p.agent_id,
            "agent_name": agent_name,
            "avatar_url": avatar_url or "",
            "total_value": round(p.total_value or STARTING_CAPITAL, 2),
            "return_percent": round(return_pct, 2),
            "rank": 0,
        })
    leaderboard.sort(key=lambda x: x["return_percent"], reverse=True)
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1
    return leaderboard


@app.get("/portfolio/all/{arena_id}")
def read_portfolio_all(arena_id: str, db: Session = Depends(get_db)):
    portfolios = db.query(models.Portfolio).filter(models.Portfolio.arena_id == arena_id).all()
    result = []
    for p in portfolios:
        ag = db.query(models.Agent).filter(models.Agent.id == p.agent_id).first()
        agent_name = ag.name if ag else p.agent_id
        avatar_url = ag.avatar_url if ag else ""
        return_pct = ((p.total_value - STARTING_CAPITAL) / STARTING_CAPITAL) * 100 if p.total_value else 0
        holdings = db.query(models.Holding).filter(models.Holding.portfolio_id == p.id).all()
        holdings_list = [
            {
                "symbol": h.symbol,
                "quantity": h.quantity,
                "avg_cost": round(h.avg_cost, 2),
                "current_value": round(h.current_value, 2),
                "pnl": round(h.pnl, 2),
            }
            for h in holdings if h.quantity > 0
        ]
        result.append({
            "agent_id": p.agent_id,
            "agent_name": agent_name,
            "avatar_url": avatar_url or "",
            "cash": round(p.cash or 0, 2),
            "total_value": round(p.total_value or STARTING_CAPITAL, 2),
            "return_percent": round(return_pct, 2),
            "today_pnl": 0.0,
            "holdings": holdings_list,
        })
    return result


@app.get("/portfolio/history/{arena_id}")
def read_portfolio_history(arena_id: str, db: Session = Depends(get_db)):
    portfolios = db.query(models.Portfolio).filter(models.Portfolio.arena_id == arena_id).all()
    result = []
    for p in portfolios:
        ag = db.query(models.Agent).filter(models.Agent.id == p.agent_id).first()
        agent_name = ag.name if ag else p.agent_id
        return_pct = ((p.total_value - STARTING_CAPITAL) / STARTING_CAPITAL) * 100 if p.total_value else 0
        history = (
            db.query(models.PortfolioHistory)
            .filter(models.PortfolioHistory.portfolio_id == p.id)
            .order_by(models.PortfolioHistory.timestamp.asc()).all()
        )
        history_list = [
            {
                "total_value": round(h.total_value, 2),
                "timestamp": h.timestamp.isoformat() if h.timestamp else None,
            }
            for h in history
        ]
        result.append({
            "agent_id": p.agent_id,
            "agent_name": agent_name,
            "total_value": round(p.total_value or STARTING_CAPITAL, 2),
            "return_percent": round(return_pct, 2),
            "history": history_list,
        })
    return result


SETTING_MIN_VALUES = {
    "trading_cycle_seconds": 10,
    "chat_min_interval": 1,
    "chat_max_interval": 1,
    "price_update_interval": 1,
    "ai_thinking_interval": 60,
}


@app.get("/settings")
def read_settings(db: Session = Depends(get_db), _: str = Depends(verify_admin)):
    seed_settings(db)
    settings = db.query(models.Setting).all()
    return [{"key": s.key, "value": s.value, "description": s.description or ""} for s in settings]


@app.put("/settings/{key}")
def update_setting(key: str, update: dict, db: Session = Depends(get_db), _: str = Depends(verify_admin)):
    setting = db.query(models.Setting).filter(models.Setting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    value = update.get("value", "")
    if key in SETTING_MIN_VALUES:
        try:
            val = int(value)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail=f"Setting '{key}' must be a valid integer")
        if val < SETTING_MIN_VALUES[key]:
            raise HTTPException(status_code=400, detail=f"Setting '{key}' must be >= {SETTING_MIN_VALUES[key]} seconds")
    setting.value = value
    db.commit()
    db.refresh(setting)
    return {"key": setting.key, "value": setting.value, "description": setting.description or ""}


@app.post("/users/register")
def register_user(user_data: dict, db: Session = Depends(get_db)):
    email = (user_data.get("email") or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email is required")
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        return {"status": "ok", "message": "Email already registered"}
    user = models.User(email=email)
    db.add(user)
    db.commit()
    return {"status": "ok", "message": "Registration successful!"}


@app.get("/admin/table/{table_name}")
def admin_table_browser(table_name: str, limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    allowed = [
        "arenas", "agents", "trades", "reasoning_logs", "portfolios",
        "holdings", "portfolio_history", "settings", "users",
        "agent_memories", "ai_connection_status", "price_history", "strategy_performance",
    ]
    if table_name not in allowed:
        raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")
    try:
        count_result = db.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
        total = count_result.scalar()
        result = db.execute(
            text(f"SELECT * FROM {table_name} LIMIT :limit OFFSET :offset"),
            {"limit": limit, "offset": offset},
        )
        columns = list(result.keys())
        data = [dict(zip(columns, row)) for row in result.fetchall()]
        return {"table": table_name, "total": total, "limit": limit, "offset": offset, "columns": columns, "data": data}
    except Exception as e:
        return {"table": table_name, "total": 0, "columns": [], "data": [], "error": str(e)}


def _update_portfolio(db: Session, agent_id: str, arena_id: str, symbol: str, side: str, quantity: float, price: float, total_value: float):
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.agent_id == agent_id,
        models.Portfolio.arena_id == arena_id,
    ).first()
    if not portfolio:
        portfolio = models.Portfolio(
            agent_id=agent_id, arena_id=arena_id,
            cash=STARTING_CAPITAL, total_value=STARTING_CAPITAL,
        )
        db.add(portfolio)
        db.commit()
        db.refresh(portfolio)
    holding = db.query(models.Holding).filter(
        models.Holding.portfolio_id == portfolio.id,
        models.Holding.symbol == symbol,
    ).first()
    if not holding:
        holding = models.Holding(
            portfolio_id=portfolio.id, symbol=symbol,
            quantity=0.0, avg_cost=0.0, current_value=0.0, pnl=0.0,
        )
        db.add(holding)
    if side == "buy":
        portfolio.cash -= total_value
        new_qty = holding.quantity + quantity
        if new_qty > 0:
            holding.avg_cost = ((holding.avg_cost * holding.quantity) + total_value) / new_qty
        holding.quantity = new_qty
        holding.current_value = holding.quantity * price
    elif side == "sell":
        actual_sell = min(quantity, holding.quantity)
        revenue = actual_sell * price
        portfolio.cash += revenue
        holding.pnl += (price - holding.avg_cost) * actual_sell
        holding.quantity -= actual_sell
        holding.current_value = holding.quantity * price
    all_holdings = db.query(models.Holding).filter(models.Holding.portfolio_id == portfolio.id).all()
    holdings_value = sum(h.current_value for h in all_holdings if h.quantity > 0)
    portfolio.total_value = portfolio.cash + holdings_value
    portfolio.updated_at = datetime.datetime.utcnow()
    holding.updated_at = datetime.datetime.utcnow()
    db.commit()
    try:
        history = models.PortfolioHistory(
            portfolio_id=portfolio.id,
            total_value=portfolio.total_value,
            timestamp=datetime.datetime.utcnow(),
        )
        db.add(history)
        db.commit()
    except Exception:
        db.rollback()


def _get_setting_value(db: Session, key: str, default: int) -> int:
    try:
        setting = db.query(models.Setting).filter(models.Setting.key == key).first()
        if setting and setting.value:
            val = int(setting.value)
            return max(val, 10)
    except Exception:
        pass
    return max(default, 10)


def run_cycle(db: Session, arena_id: str):
    arena = db.query(models.Arena).filter(models.Arena.id == arena_id).first()
    if not arena:
        return
    tickers = [t.strip() for t in arena.tickers.split(",") if t.strip()]
    agents = db.query(models.Agent).all()

    for agent in agents:
        portfolio = db.query(models.Portfolio).filter(
            models.Portfolio.agent_id == agent.id,
            models.Portfolio.arena_id == arena_id,
        ).first()
        if not portfolio:
            portfolio = models.Portfolio(
                agent_id=agent.id, arena_id=arena_id,
                cash=STARTING_CAPITAL, total_value=STARTING_CAPITAL,
            )
            db.add(portfolio)
            db.commit()
            db.refresh(portfolio)

        holdings = db.query(models.Holding).filter(
            models.Holding.portfolio_id == portfolio.id
        ).all()

        # Gather price data
        price_lines = []
        price_map = {}
        for ticker in tickers:
            try:
                data = stock_service.get_realtime_data(ticker)
                p = data["price"]
                change = data.get("price_change", 0)
                price_map[ticker] = p
                price_lines.append(f"  {ticker}: ${p:.2f} ({change:+.2f}%)")
            except Exception:
                price_lines.append(f"  {ticker}: (price unavailable)")

        # Holdings summary
        holdings_lines = []
        for h in holdings:
            if h.quantity > 0:
                holdings_lines.append(
                    f"  {h.symbol}: {h.quantity:.4f} shares @ avg ${h.avg_cost:.2f} (P&L: ${h.pnl:.2f})"
                )

        # Other agents' recent activity
        other_logs = (
            db.query(models.ReasoningLog)
            .filter(
                models.ReasoningLog.arena_id == arena_id,
                models.ReasoningLog.agent_id != agent.id,
            )
            .order_by(models.ReasoningLog.created_at.desc())
            .limit(10).all()
        )
        other_activity_lines = []
        for lg in other_logs:
            other_ag = db.query(models.Agent).filter(models.Agent.id == lg.agent_id).first()
            name = other_ag.name if other_ag else lg.agent_id
            other_activity_lines.append(f"  [{name}]: {(lg.message or '')[:200]}")

        # Leaderboard
        all_portfolios = db.query(models.Portfolio).filter(
            models.Portfolio.arena_id == arena_id
        ).all()
        sorted_portfolios = sorted(all_portfolios, key=lambda pp: pp.total_value or 0, reverse=True)
        leaderboard_lines = []
        for i, pp in enumerate(sorted_portfolios):
            a = db.query(models.Agent).filter(models.Agent.id == pp.agent_id).first()
            name = a.name if a else pp.agent_id
            ret = ((pp.total_value - STARTING_CAPITAL) / STARTING_CAPITAL * 100) if pp.total_value else 0
            leaderboard_lines.append(f"  {i+1}. {name}: ${pp.total_value:,.2f} ({ret:+.2f}%)")

        # Agent memories
        memories = (
            db.query(models.AgentMemory)
            .filter(models.AgentMemory.agent_id == agent.id)
            .order_by(models.AgentMemory.created_at.desc())
            .limit(5).all()
        )
        memory_lines = [f"  - {m.content}" for m in memories if m.content]

        return_pct = ((portfolio.total_value - STARTING_CAPITAL) / STARTING_CAPITAL * 100) if portfolio.total_value else 0

        # Build prompts
        system_prompt = build_system_prompt(agent_name=agent.name, arena_name=arena.name)
        context_prompt = build_context_prompt(
            arena_name=arena.name,
            allowed_tickers=arena.tickers,
            arena_strategy=arena.prompt or arena.description or "",
            price_data="\n".join(price_lines),
            cash=portfolio.cash or 0,
            total_value=portfolio.total_value or STARTING_CAPITAL,
            return_pct=return_pct,
            holdings_data="\n".join(holdings_lines),
            other_agents_activity="\n".join(other_activity_lines),
            leaderboard_data="\n".join(leaderboard_lines),
            agent_memories="\n".join(memory_lines),
        )

        # Use mock agents for now; replace with real AI API calls later
        from agents.mocks import MockAIModel
        mock_agent = MockAIModel(agent.name)
        response_text = mock_agent.run({"symbol": tickers[0] if tickers else "", "prices": price_map})

        decision = "hold"
        if "BUY" in response_text.upper():
            decision = "buy"
        elif "SELL" in response_text.upper():
            decision = "sell"

        chosen_symbol = random.choice(tickers) if tickers else None
        chosen_price = price_map.get(chosen_symbol, 0) if chosen_symbol else 0

        # Log reasoning
        log = models.ReasoningLog(
            agent_id=agent.id,
            arena_id=arena_id,
            message=f"[{decision.upper()}] {chosen_symbol or 'N/A'}\n\n{response_text}\n\nSystem Prompt: {system_prompt[:200]}...\nContext: {context_prompt[:300]}...",
            created_at=datetime.datetime.utcnow(),
        )
        db.add(log)
        db.commit()

        if decision in ("buy", "sell") and chosen_symbol and chosen_price > 0:
            trade_qty = 10.0

            if decision == "sell":
                hld = db.query(models.Holding).filter(
                    models.Holding.portfolio_id == portfolio.id,
                    models.Holding.symbol == chosen_symbol,
                ).first()
                if not hld or hld.quantity <= 0:
                    continue
                trade_qty = min(trade_qty, hld.quantity)

            if decision == "buy":
                cost = chosen_price * trade_qty
                if cost > (portfolio.cash or 0):
                    trade_qty = max(1, int((portfolio.cash or 0) / chosen_price))
                    cost = chosen_price * trade_qty
                if cost > (portfolio.cash or 0) or trade_qty <= 0:
                    continue

            total_val = chosen_price * trade_qty
            trade = models.Trade(
                agent_id=agent.id, arena_id=arena_id, symbol=chosen_symbol,
                side=decision, quantity=trade_qty, price=chosen_price,
                total_value=total_val, reasoning=response_text,
                created_at=datetime.datetime.utcnow(),
            )
            db.add(trade)
            db.commit()

            try:
                _update_portfolio(db, agent.id, arena_id, chosen_symbol, decision, trade_qty, chosen_price, total_val)
            except Exception as e:
                db.rollback()
                print(f"Portfolio update error for {agent.name} in Arena {arena_id}: {e}")


def _run_cycle_with_own_session(arena_id: str) -> int:
    """Wrapper that creates its own DB session for run_cycle.
    Returns the cycle_time setting value so the async caller can sleep."""
    db = database.SessionLocal()
    try:
        arena = db.query(models.Arena).filter(models.Arena.id == arena_id).first()
        if not arena:
            print(f"Arena {arena_id} not found.")
            return -1  # signal to stop

        run_cycle(db, arena_id)
        cycle_time = _get_setting_value(db, "ai_thinking_interval", 7200)
        return cycle_time
    finally:
        try:
            db.close()
        except Exception:
            pass


async def run_autonomous_trading(arena_id: str):
    print(f"Starting autonomous trading cycle for Arena {arena_id}...")
    # Give server time to finish startup before making blocking HTTP calls
    await asyncio.sleep(5)
    consecutive_errors = 0
    max_backoff = 300

    while True:
        try:
            # Run the entire cycle (including DB session) in a thread pool
            # to avoid blocking the event loop and avoid cross-thread session issues
            cycle_time = await asyncio.to_thread(_run_cycle_with_own_session, arena_id)
            if cycle_time < 0:
                print(f"Arena {arena_id} not found. Stopping trading loop.")
                break

            last_successful_cycle[arena_id] = datetime.datetime.utcnow()
            consecutive_errors = 0
            print(f"Arena {arena_id}: cycle complete, sleeping {cycle_time}s")
            await asyncio.sleep(cycle_time)

        except asyncio.CancelledError:
            print(f"Trading loop for Arena {arena_id} cancelled.")
            raise

        except Exception as e:
            consecutive_errors += 1
            backoff = min(10 * (2 ** (consecutive_errors - 1)), max_backoff)
            error_msg = f"Error in trading cycle for Arena {arena_id} (attempt #{consecutive_errors}): {e}"
            print(error_msg)
            print(traceback.format_exc())
            # Log the error to DB in a separate thread too
            try:
                def _log_error():
                    db2 = database.SessionLocal()
                    try:
                        error_log = models.ReasoningLog(
                            agent_id="system", arena_id=arena_id,
                            message=f"[ERROR] {error_msg}",
                            created_at=datetime.datetime.utcnow(),
                        )
                        db2.add(error_log)
                        db2.commit()
                    except Exception:
                        pass
                    finally:
                        try:
                            db2.close()
                        except Exception:
                            pass
                await asyncio.to_thread(_log_error)
            except Exception:
                pass
            await asyncio.sleep(backoff)


async def trading_watchdog():
    print("Trading watchdog started.")
    await asyncio.sleep(30)

    while True:
        db = None
        try:
            db = database.SessionLocal()
            arenas = db.query(models.Arena).all()
            now = datetime.datetime.utcnow()

            for arena in arenas:
                needs_restart = False
                reason = ""
                if arena.id not in running_tasks:
                    needs_restart = True
                    reason = "no task found"
                elif running_tasks[arena.id].done():
                    needs_restart = True
                    try:
                        exc = running_tasks[arena.id].exception()
                        reason = f"task crashed: {exc}"
                    except (asyncio.CancelledError, asyncio.InvalidStateError):
                        reason = "task was cancelled or in invalid state"
                elif arena.id not in last_successful_cycle:
                    needs_restart = True
                    reason = "no successful cycle ever recorded"
                else:
                    actual_cycle = _get_setting_value(db, "ai_thinking_interval", 7200)
                    effective_threshold = max(WATCHDOG_STALE_THRESHOLD, actual_cycle + 120)
                    elapsed = (now - last_successful_cycle[arena.id]).total_seconds()
                    if elapsed > effective_threshold:
                        needs_restart = True
                        reason = f"stale - no cycle for {int(elapsed)}s"

                if needs_restart:
                    print(f"Watchdog: Restarting Arena {arena.id}. Reason: {reason}")
                    if arena.id in running_tasks:
                        running_tasks[arena.id].cancel()
                        del running_tasks[arena.id]
                    running_tasks[arena.id] = asyncio.create_task(run_autonomous_trading(arena.id))
                    last_successful_cycle[arena.id] = datetime.datetime.utcnow()

            db.close()
            db = None
        except asyncio.CancelledError:
            raise
        except Exception as e:
            print(f"Watchdog error: {e}")
        finally:
            if db is not None:
                try:
                    db.close()
                except Exception:
                    pass
        await asyncio.sleep(60)
