from sqlalchemy.orm import Session
from .. import models
import datetime

class SelfImprovementAgent:
    def __init__(self, db: Session):
        self.db = db

    def analyze_performance(self, arena_id: int):
        trades = self.db.query(models.Trade).filter(models.Trade.arena_id == arena_id).all()
        ai_responses = self.db.query(models.AIResponse).filter(models.AIResponse.arena_id == arena_id).all()

        if not trades:
            suggestion = f"No trades yet for Arena {arena_id}. Recommendation: Continue gathering data."
        else:
            # Mock analysis logic
            suggestion = "Analysis shows that TrendFollower has 75% accuracy. VolatilityScout is being too conservative. Recommendation: Adjust VolatilityScout threshold to 0.06."

        # Log the suggestion
        db_log = models.SystemLog(
            arena_id=arena_id,
            level="INFO",
            source="SelfImprovementAgent",
            message=f"Performance Analysis: {suggestion}"
        )
        self.db.add(db_log)
        self.db.commit()

        return suggestion
