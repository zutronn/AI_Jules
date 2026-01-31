import asyncio
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

def seed_data():
    db = database.SessionLocal()
    if db.query(models.Arena).count() == 0:
        arenas = [
            models.Arena(name="AI PMs Storm Cup", tickers="AAPL,MSFT,GOOGL", tags="#Precious Metals,#Momentum,#Hedging", description="Live AI tradings by theme & strategy."),
            models.Arena(name="Classic", tickers="BTC,ETH,SOL", tags="#Balance,#Quality", description="Jump in and copy-trade whoever's winning."),
            models.Arena(name="Gemini 3 PK", tickers="TSLA,NVDA,AMD", tags="#PK,#Latest Models", description="Explore arenas. Copy-trade best models."),
            models.Arena(name="AI Stock", tickers="AMZN,META,NFLX", tags="#AI,#Growth,#Tech", description="Browse live AI tradings.")
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
    db.close()
    yield
    # Shutdown: Cancel all tasks
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
    return {"status": "healthy"}

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

    db.commit()

    # Run monitoring and self-improvement
    monitoring = MonitoringAgent(db)
    monitoring.check_system_health(arena_id)

    si_agent = SelfImprovementAgent(db)
    si_agent.analyze_performance(arena_id)

async def run_autonomous_trading(arena_id: int):
    print(f"Starting autonomous trading cycle for Arena {arena_id}...")
    while True:
        try:
            db = database.SessionLocal()
            arena = db.query(models.Arena).filter(models.Arena.id == arena_id).first()
            if not arena or not arena.is_active:
                db.close()
                break

            run_cycle(db, arena_id)
            cycle_time = arena.cycle_time
            db.close()
            await asyncio.sleep(cycle_time)
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Error in trading cycle for Arena {arena_id}: {e}")
            await asyncio.sleep(10)
