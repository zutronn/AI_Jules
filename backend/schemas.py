from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List


class ArenaBase(BaseModel):
    name: str
    tickers: str
    tags: Optional[str] = ""
    description: Optional[str] = ""
    rules: Optional[str] = ""
    prompt: Optional[str] = ""


class ArenaCreate(ArenaBase):
    id: Optional[str] = None


class Arena(ArenaBase):
    id: str
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class TradeBase(BaseModel):
    agent_id: str
    arena_id: str
    symbol: str
    side: str
    quantity: float
    price: float
    total_value: float
    reasoning: Optional[str] = ""


class TradeCreate(TradeBase):
    pass


class Trade(TradeBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class ReasoningLogBase(BaseModel):
    agent_id: str
    arena_id: str
    message: str


class ReasoningLog(ReasoningLogBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class SettingBase(BaseModel):
    key: str
    value: str
    description: str = ""


class SettingUpdate(BaseModel):
    value: str


class Setting(SettingBase):
    model_config = ConfigDict(from_attributes=True)


class HoldingBase(BaseModel):
    portfolio_id: int
    symbol: str
    quantity: float
    avg_cost: float
    current_value: float
    pnl: float


class Holding(HoldingBase):
    id: int
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class PortfolioBase(BaseModel):
    agent_id: str
    arena_id: str
    cash: float
    total_value: float


class Portfolio(PortfolioBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class PortfolioHistoryBase(BaseModel):
    portfolio_id: int
    total_value: float


class PortfolioHistory(PortfolioHistoryBase):
    id: int
    timestamp: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    email: str


class User(UserBase):
    id: int
    verified: bool = False
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
