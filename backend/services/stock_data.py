import random
from typing import Dict, Any

class StockDataService:
    def __init__(self):
        self.prices = {}

    def get_realtime_data(self, symbol: str) -> Dict[str, Any]:
        if symbol not in self.prices:
            self.prices[symbol] = 150.0

        # Simulate price movement
        change = random.uniform(-2.0, 2.0)
        self.prices[symbol] += change

        # Simulate other metrics
        volatility = random.uniform(0.01, 0.08)
        volume = random.randint(1000, 10000)
        rsi = random.uniform(20, 80)

        return {
            "symbol": symbol,
            "price": round(self.prices[symbol], 2),
            "price_change": round(change, 4),
            "volatility": round(volatility, 4),
            "volume": volume,
            "rsi": round(rsi, 2)
        }
