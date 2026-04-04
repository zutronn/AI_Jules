from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
import datetime

Base = declarative_base()

# ---- Schema matches real Turso database at lawliet-labs ----

class Arena(Base):
    __tablename__ = "arenas"
    id = Column(String, primary_key=True, index=True)  # e.g. "classic", "ai-stock"
    name = Column(String, index=True)
    description = Column(String, default="")
    tickers = Column(String)  # Comma separated
    rules = Column(String, default="")
    prompt = Column(Text, default="")
    tags = Column(String, default="")  # Comma separated
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Agent(Base):
    __tablename__ = "agents"
    id = Column(String, primary_key=True, index=True)  # e.g. "chatgpt", "deepseek"
    name = Column(String, index=True)
    avatar_url = Column(String, default="")
    strategy_description = Column(Text, default="")
    personality = Column(String, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Trade(Base):
    __tablename__ = "trades"
    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(String, index=True)
    arena_id = Column(String, index=True)
    symbol = Column(String, index=True)
    side = Column(String)  # buy or sell
    quantity = Column(Float)
    price = Column(Float)
    total_value = Column(Float)
    reasoning = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ReasoningLog(Base):
    __tablename__ = "reasoning_logs"
    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(String, index=True)
    arena_id = Column(String, index=True)
    message = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Portfolio(Base):
    __tablename__ = "portfolios"
    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(String, index=True)
    arena_id = Column(String, index=True)
    cash = Column(Float, default=100000.0)
    total_value = Column(Float, default=100000.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Holding(Base):
    __tablename__ = "holdings"
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, index=True)
    symbol = Column(String, index=True)
    quantity = Column(Float, default=0.0)
    avg_cost = Column(Float, default=0.0)
    current_value = Column(Float, default=0.0)
    pnl = Column(Float, default=0.0)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class PortfolioHistory(Base):
    __tablename__ = "portfolio_history"
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, index=True)
    total_value = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class Setting(Base):
    __tablename__ = "settings"
    key = Column(String, primary_key=True, index=True)
    value = Column(String, default="")
    description = Column(String, default="")
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AgentMemory(Base):
    __tablename__ = "agent_memories"
    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(String, index=True)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AIConnectionStatus(Base):
    __tablename__ = "ai_connection_status"
    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(String, index=True)
    connected = Column(Boolean, default=False)
    last_check = Column(DateTime, default=datetime.datetime.utcnow)

class PriceHistory(Base):
    __tablename__ = "price_history"
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    price = Column(Float)
    change_percent = Column(Float, default=0.0)
    volume = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class StrategyPerformance(Base):
    __tablename__ = "strategy_performance"
    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(String, index=True)
    arena_id = Column(String, index=True)
    metric = Column(String)
    value = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
