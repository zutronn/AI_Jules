from sqlalchemy.orm import Session
from .. import models
import time


class MonitoringAgent:
    def __init__(self, db: Session):
        self.db = db

    def check_system_health(self, arena_id: str = None):
        # Scan for ERROR logs in reasoning_logs
        query = self.db.query(models.ReasoningLog).filter(
            models.ReasoningLog.message.like("%[ERROR]%")
        )
        if arena_id:
            query = query.filter(models.ReasoningLog.arena_id == arena_id)

        errors = query.all()

        if errors:
            print(f"Monitoring Agent found {len(errors)} errors!")
            for error in errors:
                print(f"[{error.created_at}] {error.agent_id}: {error.message[:200]}")
            return False

        print("Monitoring Agent: System health is GOOD.")
        return True

    def run_continuous_monitoring(self, interval: int = 60):
        """Mock method for 24/7 monitoring loop"""
        print("Starting continuous monitoring...")
        self.check_system_health()
