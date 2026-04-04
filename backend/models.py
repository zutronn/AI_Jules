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
    rule = Column(String, default="")
    prompt_text = Column(Text, default="")

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

class Setting(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String, default="")
    description = Column(String, default="")

class Portfolio(Base):
    __tablename__ = "portfolio"
    id = Column(Integer, primary_key=True, index=True)
    arena_id = Column(Integer, index=True)
    symbol = Column(String, index=True)
    quantity = Column(Float, default=0.0)        # Net shares held (positive = long)
    avg_entry_price = Column(Float, default=0.0) # Weighted average entry price
    current_price = Column(Float, default=0.0)   # Latest market price
    total_invested = Column(Float, default=0.0)  # Total $ spent buying
    total_returned = Column(Float, default=0.0)  # Total $ received from sells
    realized_pnl = Column(Float, default=0.0)    # Locked-in profit/loss from closed trades
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
