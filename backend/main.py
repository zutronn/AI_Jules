import asyncio
import datetime
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from . import models, schemas, database
from .agents.orchestrator import Orchestrator
from .agents.monitoring import MonitoringAgent
from .agents.self_improvement import SelfImprovementAgent
from .services.stock_data import StockDataService

# Dictionary to keep track of running tasks for each arena
running_tasks: Dict[int, asyncio.Task] = {}

# Track last successful cycle per arena for watchdog
last_successful_cycle: Dict[int, datetime.datetime] = {}

# Maximum time (seconds) before watchdog considers a trading loop stale
WATCHDOG_STALE_THRESHOLD = 300  # 5 minutes

def seed_data():
    db = database.SessionLocal()
    if db.query(models.Arena).count() == 0:
        arenas = [
            models.Arena(
                name="AI PMs Storm Cup",
                tickers="DULL,GDX,SIL",
                tags="#Precious Metals,#Momentum,#Hedging",
                description="Live AI tradings by theme & strategy.",
                rule="Live Trading Cup 2024",
                prompt_text="Long/short strategies based on momentum and trend-following across multiple timeframes."
            ),
            models.Arena(
                name="Classic",
                tickers="BTC,ETH,SOL",
                tags="#Balance,#Quality",
                description="Jump in and copy-trade whoever's winning.",
                rule="Long-term Value",
                prompt_text="Identify undervalued assets based on fundamentals and technical analysis."
            ),
            models.Arena(
                name="Gemini 3 PK",
                tickers="TSLA,NVDA,AMD",
                tags="#PK,#Latest Models",
                description="Explore arenas. Copy-trade best models.",
                rule="Short-term Scalping",
                prompt_text="High-frequency trading signals based on order flow and volatility."
            ),
            models.Arena(
                name="AI Stock",
                tickers="AMZN,META,NFLX",
                tags="#AI,#Growth,#Tech",
                description="Browse live AI tradings.",
                rule="Trend Following",
                prompt_text="Analyze market trends and sentiments to identify growth opportunities."
            )
        ]
        db.add_all(arenas)
        db.commit()
    db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB and start autonomous trading for existing active arenas
    database.init_db()
    seed_data()
    db = database.SessionLocal()
    arenas = db.query(models.Arena).filter(models.Arena.is_active == 1).all()
    for arena in arenas:
        running_tasks[arena.id] = asyncio.create_task(run_autonomous_trading(arena.id))
        last_successful_cycle[arena.id] = datetime.datetime.utcnow()  # Grace period for first cycle
    db.close()

    # Start the watchdog that monitors and restarts stale trading loops
    watchdog_task = asyncio.create_task(trading_watchdog())

    yield

    # Shutdown: Cancel watchdog and all trading tasks
    watchdog_task.cancel()
    for task in running_tasks.values():
        task.cancel()

app = FastAPI(title="ROCKALPHA API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

stock_service = StockDataService()

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health")
def health_check():
    """Basic health check — confirms the API process is alive."""
    return {"status": "healthy"}

@app.get("/health/trading")
async def trading_health_check(db: Session = Depends(get_db)):
    """
    Deep health check — verifies trading loops are active and producing trades.
    Returns per-arena status with last trade time and staleness detection.
    """
    arenas = db.query(models.Arena).filter(models.Arena.is_active == 1).all()
    results = []
    now = datetime.datetime.utcnow()

    for arena in arenas:
        last_trade = (
            db.query(models.Trade)
            .filter(models.Trade.arena_id == arena.id)
            .order_by(models.Trade.timestamp.desc())
            .first()
        )
        last_log = (
            db.query(models.SystemLog)
            .filter(models.SystemLog.arena_id == arena.id)
            .order_by(models.SystemLog.timestamp.desc())
            .first()
        )

        task_running = arena.id in running_tasks and not running_tasks[arena.id].done()
        last_cycle = last_successful_cycle.get(arena.id)
        effective_threshold = max(WATCHDOG_STALE_THRESHOLD, arena.cycle_time + 120)
        cycle_stale = (
            last_cycle is None
            or (now - last_cycle).total_seconds() > effective_threshold
        )

        status = "healthy"
        if not task_running:
            status = "down"
        elif cycle_stale:
            status = "degraded"
        elif last_trade and (now - last_trade.timestamp).total_seconds() > 86400:
            status = "degraded"  # No trade in 24h

        results.append({
            "arena_id": arena.id,
            "arena_name": arena.name,
            "status": status,
            "task_running": task_running,
            "last_trade": last_trade.timestamp.isoformat() if last_trade else None,
            "last_log": last_log.timestamp.isoformat() if last_log else None,
            "last_cycle": last_cycle.isoformat() if last_cycle else None,
            "cycle_stale": cycle_stale,
        })

    all_healthy = all(r["status"] == "healthy" for r in results)
    return {
        "overall": "healthy" if all_healthy else "degraded",
        "arenas": results,
        "active_tasks": len([t for t in running_tasks.values() if not t.done()]),
        "total_arenas": len(arenas),
        "checked_at": now.isoformat(),
    }

@app.post("/trading/restart")
async def restart_trading(arena_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Force-restart trading loop(s). If arena_id is provided, restart only that arena.
    Otherwise restart all active arenas.
    """
    restarted = []

    if arena_id is not None:
        arenas = db.query(models.Arena).filter(
            models.Arena.id == arena_id, models.Arena.is_active == 1
        ).all()
    else:
        arenas = db.query(models.Arena).filter(models.Arena.is_active == 1).all()

    for arena in arenas:
        # Cancel existing task if running
        if arena.id in running_tasks:
            running_tasks[arena.id].cancel()
            del running_tasks[arena.id]  # Remove immediately to prevent watchdog from seeing a done() task

        # Start fresh task and give watchdog a grace period
        running_tasks[arena.id] = asyncio.create_task(run_autonomous_trading(arena.id))
        last_successful_cycle[arena.id] = datetime.datetime.utcnow()  # Grace period for watchdog
        restarted.append(arena.id)

        # Log the restart
        log = models.SystemLog(
            arena_id=arena.id,
            level="WARNING",
            source="TradingRestart",
            message=f"Trading loop manually restarted for Arena {arena.id} ({arena.name})"
        )
        db.add(log)

    db.commit()
    return {"restarted_arenas": restarted, "count": len(restarted)}

# --- Arena Endpoints ---

@app.get("/arenas", response_model=List[schemas.Arena])
def read_arenas(db: Session = Depends(get_db)):
    return db.query(models.Arena).all()

@app.post("/arenas", response_model=schemas.Arena)
async def create_arena(arena: schemas.ArenaCreate, db: Session = Depends(get_db)):
    db_arena = models.Arena(**arena.dict())
    db.add(db_arena)
    db.commit()
    db.refresh(db_arena)

    if db_arena.is_active:
        running_tasks[db_arena.id] = asyncio.create_task(run_autonomous_trading(db_arena.id))
        last_successful_cycle[db_arena.id] = datetime.datetime.utcnow()  # Grace period for watchdog

    return db_arena

@app.patch("/arenas/{arena_id}", response_model=schemas.Arena)
async def update_arena(arena_id: int, arena_update: schemas.ArenaUpdate, db: Session = Depends(get_db)):
    db_arena = db.query(models.Arena).filter(models.Arena.id == arena_id).first()
    if not db_arena:
        raise HTTPException(status_code=404, detail="Arena not found")

    update_data = arena_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_arena, key, value)

    db.commit()
    db.refresh(db_arena)

    # Update running task
    if arena_id in running_tasks:
        running_tasks[arena_id].cancel()
        del running_tasks[arena_id]

    if db_arena.is_active:
        running_tasks[arena_id] = asyncio.create_task(run_autonomous_trading(arena_id))
        last_successful_cycle[arena_id] = datetime.datetime.utcnow()  # Grace period for watchdog

    return db_arena

# --- Settings Endpoints ---

DEFAULT_SETTINGS = [
    {"key": "trading_cycle_seconds", "value": "10", "description": "Trading cycle interval in seconds (10-3600)"},
    {"key": "chat_min_interval", "value": "15", "description": "Minimum chat interval in seconds"},
    {"key": "chat_max_interval", "value": "45", "description": "Maximum chat interval in seconds"},
    {"key": "price_update_interval", "value": "3", "description": "Price update interval in seconds"},
    {"key": "ai_thinking_interval", "value": "7200", "description": "AI thinking interval in seconds (default 2 hours)"},
]

def seed_settings(db: Session):
    """Seed default settings if they don't exist."""
    for s in DEFAULT_SETTINGS:
        existing = db.query(models.Setting).filter(models.Setting.key == s["key"]).first()
        if not existing:
            db.add(models.Setting(**s))
    db.commit()

@app.get("/settings", response_model=List[schemas.Setting])
def read_settings(db: Session = Depends(get_db)):
    seed_settings(db)
    settings = db.query(models.Setting).all()
    return settings

@app.put("/settings/{key}")
def update_setting(key: str, update: schemas.SettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(models.Setting).filter(models.Setting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    setting.value = update.value
    db.commit()
    db.refresh(setting)
    return {"key": setting.key, "value": setting.value, "description": setting.description}

# --- Manual Trading Endpoint ---

@app.post("/trades/manual")
def create_manual_trade(trade_data: dict, db: Session = Depends(get_db)):
    """Submit a manual trade to compete with AI agents."""
    arena_id = trade_data.get("arena_id")
    agent_id = trade_data.get("agent_id", "human")
    action = trade_data.get("action", "").lower()
    symbol = trade_data.get("symbol", "")
    quantity = trade_data.get("quantity", 0)
    reasoning = trade_data.get("reasoning", "")

    if action not in ("buy", "sell"):
        raise HTTPException(status_code=400, detail="Action must be 'buy' or 'sell'")
    if not symbol or quantity <= 0:
        raise HTTPException(status_code=400, detail="Symbol and positive quantity are required")

    trade = models.Trade(
        arena_id=arena_id,
        symbol=symbol,
        side=action.upper(),
        price=0,  # Will be filled by the trading engine with current market price
        amount=quantity,
        timestamp=datetime.datetime.utcnow(),
    )
    db.add(trade)

    # Also log the reasoning
    log = models.SystemLog(
        arena_id=arena_id,
        level="INFO",
        source=f"Manual:{agent_id}",
        message=f"[{action.upper()}] {symbol} x{quantity} — {reasoning}",
        timestamp=datetime.datetime.utcnow(),
    )
    db.add(log)
    db.commit()
    return {"status": "ok", "message": f"Manual {action} {quantity} {symbol} submitted"}

# --- User Registration Endpoint ---

@app.post("/users/register")
def register_user(user_data: dict, db: Session = Depends(get_db)):
    """Register a user email for copy trading notifications."""
    email = (user_data.get("email") or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email is required")

    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        return {"status": "ok", "message": "Email already registered"}

    user = models.User(email=email)
    db.add(user)
    db.commit()
    return {"status": "ok", "message": "Registration successful! We'll notify you when copy trading is live."}

# --- Existing Endpoints (Updated) ---

@app.get("/trades", response_model=List[schemas.Trade])
def read_trades(arena_id: Optional[int] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(models.Trade)
    if arena_id:
        query = query.filter(models.Trade.arena_id == arena_id)
    return query.order_by(models.Trade.timestamp.desc()).offset(skip).limit(limit).all()

@app.get("/logs", response_model=List[schemas.SystemLog])
def read_logs(arena_id: Optional[int] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(models.SystemLog)
    if arena_id:
        query = query.filter(models.SystemLog.arena_id == arena_id)
    return query.order_by(models.SystemLog.timestamp.desc()).offset(skip).limit(limit).all()

@app.get("/ai-responses", response_model=List[schemas.AIResponse])
def read_ai_responses(arena_id: Optional[int] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(models.AIResponse)
    if arena_id:
        query = query.filter(models.AIResponse.arena_id == arena_id)
    return query.order_by(models.AIResponse.timestamp.desc()).offset(skip).limit(limit).all()

@app.get("/portfolio")
def read_portfolio(arena_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get portfolio positions for an arena, with computed P&L."""
    query = db.query(models.Portfolio)
    if arena_id:
        query = query.filter(models.Portfolio.arena_id == arena_id)
    positions = query.all()

    position_list = []
    total_assets = 0.0
    total_pnl = 0.0
    total_realized = 0.0

    for pos in positions:
        unrealized = (pos.current_price - pos.avg_entry_price) * pos.quantity if pos.quantity > 0 else 0.0
        market_value = pos.current_price * pos.quantity
        total_assets += market_value
        total_pnl += unrealized + pos.realized_pnl
        total_realized += pos.realized_pnl
        position_list.append({
            "id": pos.id,
            "arena_id": pos.arena_id,
            "symbol": pos.symbol,
            "quantity": pos.quantity,
            "avg_entry_price": round(pos.avg_entry_price, 2),
            "current_price": round(pos.current_price, 2),
            "market_value": round(market_value, 2),
            "unrealized_pnl": round(unrealized, 2),
            "realized_pnl": round(pos.realized_pnl, 2),
            "total_invested": round(pos.total_invested, 2),
            "total_returned": round(pos.total_returned, 2),
            "updated_at": pos.updated_at.isoformat() if pos.updated_at else None,
        })

    return {
        "arena_id": arena_id,
        "positions": position_list,
        "total_assets": round(total_assets, 2),
        "total_pnl": round(total_pnl, 2),
        "total_realized_pnl": round(total_realized, 2),
    }

# --- Portfolio Helper ---

def _update_portfolio(db: Session, trade: models.Trade):
    """
    Update portfolio position after a trade is executed.
    BUY: increases quantity, updates avg entry price (weighted average).
    SELL: decreases quantity, records realized P&L.
    Also updates current_price to the latest trade price.
    """
    pos = (
        db.query(models.Portfolio)
        .filter(
            models.Portfolio.arena_id == trade.arena_id,
            models.Portfolio.symbol == trade.symbol,
        )
        .first()
    )

    if pos is None:
        pos = models.Portfolio(
            arena_id=trade.arena_id,
            symbol=trade.symbol,
            quantity=0.0,
            avg_entry_price=0.0,
            current_price=trade.price,
            total_invested=0.0,
            total_returned=0.0,
            realized_pnl=0.0,
        )
        db.add(pos)

    if trade.side == "BUY":
        cost = trade.price * trade.amount
        new_qty = pos.quantity + trade.amount
        # Weighted average entry price
        if new_qty > 0:
            pos.avg_entry_price = (
                (pos.avg_entry_price * pos.quantity) + cost
            ) / new_qty
        pos.quantity = new_qty
        pos.total_invested += cost
    elif trade.side == "SELL":
        actual_sell_qty = min(trade.amount, pos.quantity)
        if actual_sell_qty <= 0:
            # Nothing to sell — update current_price but skip P&L/revenue
            pos.current_price = trade.price
            pos.updated_at = datetime.datetime.utcnow()
            db.commit()
            return
        revenue = trade.price * actual_sell_qty
        # Realize P&L on sold shares
        pos.realized_pnl += (trade.price - pos.avg_entry_price) * actual_sell_qty
        pos.quantity -= actual_sell_qty
        pos.total_returned += revenue

    pos.current_price = trade.price
    pos.updated_at = datetime.datetime.utcnow()
    db.commit()


# --- Autonomous Trading Logic ---

def run_cycle(db: Session, arena_id: int):
    arena = db.query(models.Arena).filter(models.Arena.id == arena_id).first()
    if not arena:
        return

    tickers = arena.tickers.split(",")
    orchestrator = Orchestrator(db)

    # Collect successful trades and error logs separately to avoid rollback
    # discarding earlier successful trades when a later symbol fails
    pending_trades = []
    pending_error_logs = []
    symbol_prices = {}  # Track latest prices for all symbols to update portfolio current_price

    for symbol in tickers:
        symbol = symbol.strip()
        try:
            market_data = stock_service.get_realtime_data(symbol)
            symbol_prices[symbol] = market_data["price"]
            decision = orchestrator.run_trading_cycle(market_data, arena_id)

            if decision == "BUY":
                pending_trades.append(models.Trade(
                    arena_id=arena_id,
                    symbol=symbol,
                    side=decision,
                    price=market_data["price"],
                    amount=10.0
                ))
            elif decision == "SELL":
                # Check portfolio position before creating SELL trade
                # to avoid phantom sell records when no shares are held
                pos = db.query(models.Portfolio).filter(
                    models.Portfolio.arena_id == arena_id,
                    models.Portfolio.symbol == symbol
                ).first()
                sell_qty = min(10.0, pos.quantity) if pos and pos.quantity > 0 else 0
                if sell_qty > 0:
                    pending_trades.append(models.Trade(
                        arena_id=arena_id,
                        symbol=symbol,
                        side=decision,
                        price=market_data["price"],
                        amount=sell_qty
                    ))
        except Exception as e:
            # Rollback to clear any failed session state (e.g. from orchestrator's
            # internal db.commit() failure). Safe because pending_trades is a Python
            # list, not in the DB session, so rollback won't discard collected trades.
            db.rollback()
            # Log per-symbol errors but continue processing other symbols
            pending_error_logs.append(models.SystemLog(
                arena_id=arena_id,
                level="ERROR",
                source="TradingCycle",
                message=f"Error processing {symbol}: {str(e)}"
            ))

    # Add all collected trades and error logs in one batch, then commit
    for trade in pending_trades:
        db.add(trade)
    for error_log in pending_error_logs:
        db.add(error_log)
    db.commit()

    # Update portfolio positions based on executed trades
    for trade in pending_trades:
        try:
            _update_portfolio(db, trade)
        except Exception as e:
            db.rollback()
            print(f"Portfolio update error for {trade.symbol} in Arena {arena_id}: {e}")

    # Update current_price for ALL portfolio positions (not just traded ones)
    # so unrealized P&L reflects latest market prices even on HOLD decisions
    try:
        for sym, price in symbol_prices.items():
            pos = db.query(models.Portfolio).filter(
                models.Portfolio.arena_id == arena_id,
                models.Portfolio.symbol == sym
            ).first()
            if pos is not None:
                pos.current_price = price
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Portfolio price refresh error for Arena {arena_id}: {e}")

    # Run monitoring and self-improvement
    try:
        monitoring = MonitoringAgent(db)
        monitoring.check_system_health(arena_id)

        si_agent = SelfImprovementAgent(db)
        si_agent.analyze_performance(arena_id)
    except Exception as e:
        db.rollback()
        print(f"Post-cycle monitoring error for Arena {arena_id}: {e}")

def _get_setting_value(db: Session, key: str, default: int) -> int:
    """Read a setting from the database, returning default if not found or invalid."""
    try:
        setting = db.query(models.Setting).filter(models.Setting.key == key).first()
        if setting and setting.value:
            return int(setting.value)
    except (ValueError, TypeError):
        pass
    return default


async def run_autonomous_trading(arena_id: int):
    """
    Main trading loop for an arena. Runs indefinitely with:
    - Proper DB session cleanup (try/finally)
    - Exponential backoff on repeated failures (caps at 5 min)
    - Logs errors to DB for visibility
    - Updates last_successful_cycle for watchdog monitoring
    - Reads ai_thinking_interval from settings DB on each cycle
    - Never exits unless arena is deactivated or task is cancelled
    """
    print(f"Starting autonomous trading cycle for Arena {arena_id}...")
    consecutive_errors = 0
    max_backoff = 300  # 5 minutes max backoff

    while True:
        db = None
        try:
            db = database.SessionLocal()
            arena = db.query(models.Arena).filter(models.Arena.id == arena_id).first()
            if not arena or not arena.is_active:
                print(f"Arena {arena_id} not found or inactive. Stopping trading loop.")
                break

            run_cycle(db, arena_id)

            # Read the AI thinking interval from the settings table (admin-configurable)
            # Falls back to arena.cycle_time if the setting doesn't exist
            cycle_time = _get_setting_value(db, "ai_thinking_interval", arena.cycle_time)

            # Mark successful cycle for watchdog
            last_successful_cycle[arena_id] = datetime.datetime.utcnow()
            consecutive_errors = 0  # Reset error counter on success

            print(f"Arena {arena_id}: cycle complete, sleeping {cycle_time}s (from settings)")
            db.close()
            db = None
            await asyncio.sleep(cycle_time)

        except asyncio.CancelledError:
            print(f"Trading loop for Arena {arena_id} cancelled.")
            raise  # Re-raise so the task actually gets cancelled

        except Exception as e:
            consecutive_errors += 1
            backoff = min(10 * (2 ** (consecutive_errors - 1)), max_backoff)
            error_msg = f"Error in trading cycle for Arena {arena_id} (attempt #{consecutive_errors}): {e}"
            print(error_msg)
            print(traceback.format_exc())

            # Try to log error to DB
            try:
                if db is None:
                    db = database.SessionLocal()
                else:
                    db.rollback()
                error_log = models.SystemLog(
                    arena_id=arena_id,
                    level="ERROR",
                    source="TradingLoop",
                    message=error_msg
                )
                db.add(error_log)
                db.commit()
            except Exception:
                pass  # DB logging failed too, just continue

            # Close DB session before sleeping to avoid holding connection during backoff
            if db is not None:
                try:
                    db.close()
                except Exception:
                    pass
                db = None

            await asyncio.sleep(backoff)

        finally:
            if db is not None:
                try:
                    db.close()
                except Exception:
                    pass


async def trading_watchdog():
    """
    Watchdog process that runs every 60 seconds and:
    1. Checks if any trading tasks have died (task.done())
    2. Checks if any active arenas are missing a running task
    3. Checks if any trading loop is stale (no successful cycle recently)
    4. Automatically restarts dead/stale trading loops
    5. Logs all restarts to DB for audit trail
    """
    print("Trading watchdog started. Monitoring trading loops...")
    await asyncio.sleep(30)  # Initial delay to let things start up

    while True:
        db = None
        try:
            db = database.SessionLocal()
            arenas = db.query(models.Arena).filter(models.Arena.is_active == 1).all()
            now = datetime.datetime.utcnow()

            for arena in arenas:
                needs_restart = False
                reason = ""

                # Check 1: Task doesn't exist
                if arena.id not in running_tasks:
                    needs_restart = True
                    reason = "no task found"

                # Check 2: Task exists but is done (crashed)
                elif running_tasks[arena.id].done():
                    needs_restart = True
                    # Retrieve exception if any
                    try:
                        exc = running_tasks[arena.id].exception()
                        reason = f"task crashed: {exc}"
                    except (asyncio.CancelledError, asyncio.InvalidStateError):
                        reason = "task was cancelled or in invalid state"

                # Check 3: Task is running but has never had a successful cycle
                elif arena.id not in last_successful_cycle:
                    needs_restart = True
                    reason = "no successful cycle ever recorded"

                # Check 4: Task is running but stale (no successful cycle recently)
                else:
                    effective_threshold = max(WATCHDOG_STALE_THRESHOLD, arena.cycle_time + 120)  # cycle_time + 2 min buffer
                    elapsed = (now - last_successful_cycle[arena.id]).total_seconds()
                    if elapsed > effective_threshold:
                        needs_restart = True
                        reason = f"stale - no successful cycle for {int(elapsed)}s (threshold: {effective_threshold}s)"

                if needs_restart:
                    print(f"Watchdog: Restarting trading for Arena {arena.id} ({arena.name}). Reason: {reason}")

                    # Cancel old task if it exists — del immediately to prevent
                    # concurrent restart_trading/update_arena from racing with us
                    if arena.id in running_tasks:
                        running_tasks[arena.id].cancel()
                        del running_tasks[arena.id]

                    # Start fresh task and give it a grace period
                    running_tasks[arena.id] = asyncio.create_task(run_autonomous_trading(arena.id))
                    last_successful_cycle[arena.id] = datetime.datetime.utcnow()  # Grace period for new task

                    # Log the watchdog restart
                    log = models.SystemLog(
                        arena_id=arena.id,
                        level="WARNING",
                        source="Watchdog",
                        message=f"Auto-restarted trading loop. Reason: {reason}"
                    )
                    db.add(log)

            db.commit()
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

        await asyncio.sleep(60)  # Check every 60 seconds
