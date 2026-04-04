from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List

class ArenaBase(BaseModel):
    name: str
    tickers: str
    cycle_time: int = Field(default=10, ge=1, le=3600)
    is_active: bool = True
    tags: Optional[str] = ""
    description: Optional[str] = ""
    rule: Optional[str] = ""
    prompt_text: Optional[str] = ""

class ArenaCreate(ArenaBase):
    pass

class ArenaUpdate(BaseModel):
    name: Optional[str] = None
    tickers: Optional[str] = None
    cycle_time: Optional[int] = Field(default=None, ge=1, le=3600)
    is_active: Optional[bool] = None
    tags: Optional[str] = None
    description: Optional[str] = None
    rule: Optional[str] = None
    prompt_text: Optional[str] = None

class Arena(ArenaBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class TradeBase(BaseModel):
    arena_id: int
    symbol: str
    side: str
    price: float
    amount: float

class TradeCreate(TradeBase):
    pass

class Trade(TradeBase):
    id: int
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class SystemLogBase(BaseModel):
    arena_id: Optional[int] = None
    level: str
    source: str
    message: str

class SystemLogCreate(SystemLogBase):
    pass

class SystemLog(SystemLogBase):
    id: int
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class AIResponseBase(BaseModel):
    arena_id: int
    agent_name: str
    prompt: str
    response: str

class AIResponseCreate(AIResponseBase):
    pass

class AIResponse(AIResponseBase):
    id: int
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class SettingBase(BaseModel):
    key: str
    value: str
    description: str = ""

class SettingUpdate(BaseModel):
    value: str

class Setting(SettingBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class PortfolioBase(BaseModel):
    arena_id: int
    symbol: str
    quantity: float
    avg_entry_price: float
    current_price: float
    total_invested: float
    total_returned: float
    realized_pnl: float

class Portfolio(PortfolioBase):
    id: int
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PortfolioSummary(BaseModel):
    arena_id: int
    positions: List["Portfolio"]
    total_assets: float       # Sum of current_price * quantity for all positions
    total_pnl: float          # Sum of unrealized + realized P&L
    total_realized_pnl: float # Sum of realized P&L only
