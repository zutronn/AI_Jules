from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
import datetime

Base = declarative_base()

class Arena(Base):
    __tablename__ = "arenas"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    tickers = Column(String)  # Comma separated
    cycle_time = Column(Integer, default=10) # In seconds
    is_active = Column(Boolean, default=True)
    tags = Column(String, default="") # Comma separated
    description = Column(String, default="")

class Trade(Base):
    __tablename__ = "trades"
    id = Column(Integer, primary_key=True, index=True)
    arena_id = Column(Integer, index=True)
    symbol = Column(String, index=True)
    side = Column(String)  # BUY or SELL
    price = Column(Float)
    amount = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class SystemLog(Base):
    __tablename__ = "logs"
    id = Column(Integer, primary_key=True, index=True)
    arena_id = Column(Integer, index=True, nullable=True)
    level = Column(String)  # INFO, WARNING, ERROR, CRITICAL
    source = Column(String) # e.g., Orchestrator, Monitoring, Frontend
    message = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class AIResponse(Base):
    __tablename__ = "ai_responses"
    id = Column(Integer, primary_key=True, index=True)
    arena_id = Column(Integer, index=True)
    agent_name = Column(String, index=True)
    prompt = Column(Text)
    response = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
