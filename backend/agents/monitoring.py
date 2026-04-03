from sqlalchemy.orm import Session
import models
import time

class MonitoringAgent:
    def __init__(self, db: Session):
        self.db = db

    def check_system_health(self, arena_id: int = None):
        # Scan for ERROR or CRITICAL logs
        query = self.db.query(models.SystemLog).filter(
            models.SystemLog.level.in_(["ERROR", "CRITICAL"])
        )
        if arena_id:
            query = query.filter(models.SystemLog.arena_id == arena_id)

        errors = query.all()

        if errors:
            print(f"Monitoring Agent found {len(errors)} errors!")
            for error in errors:
                print(f"[{error.timestamp}] {error.source}: {error.message}")
            return False

        print("Monitoring Agent: System health is GOOD.")
        return True

    def run_continuous_monitoring(self, interval: int = 60):
        """Mock method for 24/7 monitoring loop"""
        print("Starting continuous monitoring...")
        # In a real app, this would run in a separate process/thread
        self.check_system_health()
