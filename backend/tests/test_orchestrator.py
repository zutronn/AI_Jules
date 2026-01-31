import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import Base
from backend.agents.orchestrator import Orchestrator

# Setup in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def test_orchestrator_cycle(db):
    # Setup an arena
    from backend.models import Arena
    arena = Arena(name="Test Arena", tickers="BTC", cycle_time=10)
    db.add(arena)
    db.commit()
    db.refresh(arena)

    orchestrator = Orchestrator(db)
    market_data = {
        "symbol": "BTC",
        "price_change": 0.02,
        "volatility": 0.02,
        "volume": 6000,
        "rsi": 25  # Oversold, TrendFollower should say BUY
    }
    decision = orchestrator.run_trading_cycle(market_data, arena_id=arena.id)
    assert decision in ["BUY", "SELL", "HOLD"]

    # Check if responses were saved
    from backend.models import AIResponse, SystemLog
    responses = db.query(AIResponse).all()
    assert len(responses) == 6

    logs = db.query(SystemLog).all()
    assert len(logs) >= 1
    assert "Decision" in logs[0].message
