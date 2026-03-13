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
def trading_health_check(db: Session = Depends(get_db)):
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
        cycle_stale = (
            last_cycle is None
            or (now - last_cycle).total_seconds() > WATCHDOG_STALE_THRESHOLD
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
            try:
                await running_tasks[arena.id]
            except (asyncio.CancelledError, Exception):
                pass

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

# --- Autonomous Trading Logic ---

def run_cycle(db: Session, arena_id: int):
    arena = db.query(models.Arena).filter(models.Arena.id == arena_id).first()
    if not arena:
        return

    tickers = arena.tickers.split(",")
    orchestrator = Orchestrator(db)

    for symbol in tickers:
        symbol = symbol.strip()
        try:
            market_data = stock_service.get_realtime_data(symbol)
            decision = orchestrator.run_trading_cycle(market_data, arena_id)

            if decision in ["BUY", "SELL"]:
                trade = models.Trade(
                    arena_id=arena_id,
                    symbol=symbol,
                    side=decision,
                    price=market_data["price"],
                    amount=10.0
                )
                db.add(trade)
        except Exception as e:
            # Log per-symbol errors but continue processing other symbols
            error_log = models.SystemLog(
                arena_id=arena_id,
                level="ERROR",
                source="TradingCycle",
                message=f"Error processing {symbol}: {str(e)}"
            )
            db.add(error_log)

    db.commit()

    # Run monitoring and self-improvement
    try:
        monitoring = MonitoringAgent(db)
        monitoring.check_system_health(arena_id)

        si_agent = SelfImprovementAgent(db)
        si_agent.analyze_performance(arena_id)
    except Exception as e:
        print(f"Post-cycle monitoring error for Arena {arena_id}: {e}")

async def run_autonomous_trading(arena_id: int):
    """
    Main trading loop for an arena. Runs indefinitely with:
    - Proper DB session cleanup (try/finally)
    - Exponential backoff on repeated failures (caps at 5 min)
    - Logs errors to DB for visibility
    - Updates last_successful_cycle for watchdog monitoring
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
            cycle_time = arena.cycle_time

            # Mark successful cycle for watchdog
            last_successful_cycle[arena_id] = datetime.datetime.utcnow()
            consecutive_errors = 0  # Reset error counter on success

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
                elif (now - last_successful_cycle[arena.id]).total_seconds() > WATCHDOG_STALE_THRESHOLD:
                    needs_restart = True
                    elapsed = (now - last_successful_cycle[arena.id]).total_seconds()
                    reason = f"stale - no successful cycle for {int(elapsed)}s"

                if needs_restart:
                    print(f"Watchdog: Restarting trading for Arena {arena.id} ({arena.name}). Reason: {reason}")

                    # Cancel old task if it exists
                    if arena.id in running_tasks:
                        running_tasks[arena.id].cancel()
                        try:
                            await asyncio.wait_for(running_tasks[arena.id], timeout=5)
                        except asyncio.CancelledError:
                            raise  # Don't swallow our own cancellation during shutdown
                        except (asyncio.TimeoutError, Exception):
                            pass

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
