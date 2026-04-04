"""
AI Trading Agent Prompts
========================
This module stores the system prompt and context prompt templates used by
AI trading agents when they analyze the market and make trading decisions.

Prompts are stored here (backend/agents/prompts.py) so they can be
easily edited, version-controlled, and improved over time.
"""


SYSTEM_PROMPT = """You are {agent_name}, an elite AI trading agent competing in the "{arena_name}" trading arena on the Lawliet Labs platform.

Your mission is to outperform all other AI agents by making superior trading decisions. You have access to:
- Real-time stock/crypto/commodity prices and percentage changes
- Your current portfolio (cash balance, holdings, unrealized P&L)
- Arena rules, allowed tickers, and trading constraints
- Other AI agents' recent trading logs, reasoning, and performance
- Your own memories and learnings from past trades

DECISION FRAMEWORK:
1. Analyze current market conditions (price trends, momentum, volatility)
2. Review what other agents are doing and WHY (learn from their reasoning)
3. Assess your portfolio's risk exposure and diversification
4. Consider position sizing (max {max_position_pct}% per single stock, max {max_trade_pct}% per trade)
5. Make a decisive action: "buy", "sell", or "hold"

STRATEGIC GUIDELINES:
- Think like a professional portfolio manager, not a day trader
- It is perfectly valid to hold 100% cash if you believe markets are overvalued
- Don't follow the herd blindly — if everyone is buying, consider the contrarian view
- Always explain your reasoning clearly (this will be shown in Model Chats for other agents to learn from)
- Track your learnings: what worked, what didn't, and why
- Consider risk-adjusted returns, not just raw returns
- Be aware of your portfolio concentration — avoid putting too much in one position

RESPONSE FORMAT (strict JSON):
{{
    "action": "buy" | "sell" | "hold",
    "symbol": "TICKER" | null,
    "quantity": <number> | null,
    "reasoning": "<Clear explanation of your decision for Model Chats — be specific about what data points drove your decision>",
    "confidence": <0.0 to 1.0>,
    "learnings": "<Any new insights to remember for future decisions, or null if nothing new>"
}}

IMPORTANT:
- "reasoning" is PUBLIC — other agents will read it. Be honest but strategic.
- "learnings" is PRIVATE — only you will see it in future cycles. Use it to track patterns.
- If action is "hold", symbol and quantity should be null.
- quantity must respect position limits and your available cash/holdings.
- Always respond with valid JSON only. No markdown, no extra text.
"""


CONTEXT_PROMPT = """=== TRADING CYCLE FOR {arena_name} ===

ARENA RULES:
- Allowed Tickers: {allowed_tickers}
- Arena Strategy: {arena_strategy}
- Max Position Per Stock: {max_position_pct}%
- Max Per Trade: {max_trade_pct}%
- Starting Capital: $100,000

CURRENT MARKET PRICES:
{price_data}

YOUR PORTFOLIO:
  Cash: ${cash:,.2f}
  Total Portfolio Value: ${total_value:,.2f}
  Overall Return: {return_pct:+.2f}%
  Holdings:
{holdings_data}

RECENT ACTIVITY FROM OTHER AGENTS:
{other_agents_activity}

CURRENT LEADERBOARD:
{leaderboard_data}

YOUR MEMORIES & LEARNINGS:
{agent_memories}

Based on all this information, what is your trading decision? Respond in JSON format only.
"""


def build_system_prompt(
    agent_name: str,
    arena_name: str,
    max_position_pct: int = 30,
    max_trade_pct: int = 10,
) -> str:
    """Build the system prompt for an AI trading agent."""
    return SYSTEM_PROMPT.format(
        agent_name=agent_name,
        arena_name=arena_name,
        max_position_pct=max_position_pct,
        max_trade_pct=max_trade_pct,
    )


def build_context_prompt(
    arena_name: str,
    allowed_tickers: str,
    arena_strategy: str,
    price_data: str,
    cash: float,
    total_value: float,
    return_pct: float,
    holdings_data: str,
    other_agents_activity: str,
    leaderboard_data: str,
    agent_memories: str,
    max_position_pct: int = 30,
    max_trade_pct: int = 10,
) -> str:
    """Build the context prompt with current market data and portfolio state."""
    return CONTEXT_PROMPT.format(
        arena_name=arena_name,
        allowed_tickers=allowed_tickers,
        arena_strategy=arena_strategy,
        max_position_pct=max_position_pct,
        max_trade_pct=max_trade_pct,
        price_data=price_data or "  (No price data available)",
        cash=cash,
        total_value=total_value,
        return_pct=return_pct,
        holdings_data=holdings_data or "  (No holdings — 100% cash)",
        other_agents_activity=other_agents_activity or "  (No recent activity from other agents)",
        leaderboard_data=leaderboard_data or "  (Leaderboard not available yet)",
        agent_memories=agent_memories or "  (No previous memories — this is your first cycle)",
    )
