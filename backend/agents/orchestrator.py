from typing import Dict, Any, List
from sqlalchemy.orm import Session
from agents.mocks import (
    TrendFollowerAgent,
    SentimentAnalyzerAgent,
    VolatilityScoutAgent,
    VolumeAnalyzerAgent,
    RiskEvaluatorAgent,
    TechnicalAnalystAgent
)
import models, schemas

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

    def run_trading_cycle(self, market_data: Dict[str, Any], arena_id: int) -> str:
        agent_responses = []
        for agent in self.agents:
            response_text = agent.run(market_data)
            agent_responses.append({
                "agent_name": agent.name,
                "response": response_text
            })

            # Save AI response to DB
            db_response = models.AIResponse(
                arena_id=arena_id,
                agent_name=agent.name,
                prompt=str(market_data),
                response=response_text
            )
            self.db.add(db_response)

        self.db.commit()

        # Simple orchestration logic: consensus
        buy_votes = sum(1 for r in agent_responses if "BUY" in r["response"])
        sell_votes = sum(1 for r in agent_responses if "SELL" in r["response"])

        decision = "HOLD"
        if buy_votes > sell_votes and buy_votes >= 2:
            decision = "BUY"
        elif sell_votes > buy_votes and sell_votes >= 2:
            decision = "SELL"

        # Log the decision
        db_log = models.SystemLog(
            arena_id=arena_id,
            level="INFO",
            source="Orchestrator",
            message=f"Cycle for {market_data.get('symbol')} complete. Decision: {decision}. Votes - BUY: {buy_votes}, SELL: {sell_votes}"
        )
        self.db.add(db_log)
        self.db.commit()

        return decision
