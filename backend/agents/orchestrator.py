import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from .mocks import (
    TrendFollowerAgent,
    SentimentAnalyzerAgent,
    VolatilityScoutAgent,
    VolumeAnalyzerAgent,
    RiskEvaluatorAgent,
    TechnicalAnalystAgent
)
from .. import models


class Orchestrator:
    def __init__(self, db: Session):
        self.db = db
        self.agents = [
            TrendFollowerAgent(),
            SentimentAnalyzerAgent(),
            VolatilityScoutAgent(),
            VolumeAnalyzerAgent(),
            RiskEvaluatorAgent(),
            TechnicalAnalystAgent()
        ]

    def run_trading_cycle(self, market_data: Dict[str, Any], arena_id: str) -> str:
        agent_responses = []
        for agent in self.agents:
            response_text = agent.run(market_data)
            agent_responses.append({
                "agent_name": agent.name,
                "response": response_text
            })

            # Save reasoning log to DB
            db_log = models.ReasoningLog(
                agent_id=agent.name.lower().replace(" ", "-"),
                arena_id=arena_id,
                message=f"[ANALYSIS] {response_text}",
                created_at=datetime.datetime.utcnow(),
            )
            self.db.add(db_log)

        self.db.commit()

        # Orchestration logic: simple plurality wins
        buy_votes = sum(1 for r in agent_responses if "BUY" in r["response"])
        sell_votes = sum(1 for r in agent_responses if "SELL" in r["response"])

        decision = "HOLD"
        if buy_votes > sell_votes:
            decision = "BUY"
        elif sell_votes > buy_votes:
            decision = "SELL"

        # Log the decision
        db_log = models.ReasoningLog(
            agent_id="system",
            arena_id=arena_id,
            message=f"[ORCHESTRATOR] Cycle for {market_data.get('symbol')} complete. Decision: {decision}. Votes - BUY: {buy_votes}, SELL: {sell_votes}",
            created_at=datetime.datetime.utcnow(),
        )
        self.db.add(db_log)
        self.db.commit()

        return decision
