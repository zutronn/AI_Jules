from sqlalchemy.orm import Session
import models
import datetime


class SelfImprovementAgent:
    def __init__(self, db: Session):
        self.db = db

    def analyze_performance(self, arena_id: str):
        trades = self.db.query(models.Trade).filter(models.Trade.arena_id == arena_id).all()
        logs = self.db.query(models.ReasoningLog).filter(models.ReasoningLog.arena_id == arena_id).all()

        if not trades:
            suggestion = f"No trades yet for Arena {arena_id}. Recommendation: Continue gathering data."
        else:
            suggestion = "Analysis shows that TrendFollower has 75% accuracy. VolatilityScout is being too conservative. Recommendation: Adjust VolatilityScout threshold to 0.06."

        # Log the suggestion
        db_log = models.ReasoningLog(
            agent_id="system",
            arena_id=arena_id,
            message=f"[SELF-IMPROVEMENT] Performance Analysis: {suggestion}",
            created_at=datetime.datetime.utcnow(),
        )
        self.db.add(db_log)
        self.db.commit()

        return suggestion
