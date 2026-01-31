import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import Base, SystemLog
from backend.agents.monitoring import MonitoringAgent
from backend.agents.self_improvement import SelfImprovementAgent

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

def test_monitoring_agent(db):
    monitoring = MonitoringAgent(db)

    # Test health check with no errors
    assert monitoring.check_system_health() is True

    # Add an error log
    error_log = SystemLog(level="ERROR", source="Test", message="Test error", arena_id=1)
    db.add(error_log)
    db.commit()

    # Test health check with errors
    assert monitoring.check_system_health() is False

def test_self_improvement_agent(db):
    si_agent = SelfImprovementAgent(db)
    suggestion = si_agent.analyze_performance(arena_id=1)
    assert "No trades yet" in suggestion

    # Check if log was created
    logs = db.query(SystemLog).filter(SystemLog.source == "SelfImprovementAgent").all()
    assert len(logs) == 1
