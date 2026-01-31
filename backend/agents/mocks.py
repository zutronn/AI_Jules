from .base import BaseAgent
from typing import Dict, Any
import random

class TrendFollowerAgent(BaseAgent):
    def __init__(self):
        super().__init__("TrendFollower")

    def run(self, data: Dict[str, Any]) -> str:
        price_change = data.get("price_change", 0)
        if price_change > 0:
            return "Positive trend detected. Recommendation: BUY."
        else:
            return "Negative trend detected. Recommendation: SELL."

class SentimentAnalyzerAgent(BaseAgent):
    def __init__(self):
        super().__init__("SentimentAnalyzer")

    def run(self, data: Dict[str, Any]) -> str:
        sentiments = ["Bullish", "Bearish", "Neutral"]
        sentiment = random.choice(sentiments)
        return f"Market sentiment is {sentiment} based on social media and news analysis."

class VolatilityScoutAgent(BaseAgent):
    def __init__(self):
        super().__init__("VolatilityScout")

    def run(self, data: Dict[str, Any]) -> str:
        volatility = data.get("volatility", random.uniform(0, 0.1))
        if volatility > 0.05:
            return f"High volatility detected ({volatility:.2f}). Recommendation: Wait for stability."
        return f"Low volatility ({volatility:.2f}). Recommendation: Proceed with caution."

class VolumeAnalyzerAgent(BaseAgent):
    def __init__(self):
        super().__init__("VolumeAnalyzer")

    def run(self, data: Dict[str, Any]) -> str:
        volume = data.get("volume", 1000)
        if volume > 5000:
            return "High trading volume. Trend is confirmed."
        return "Low trading volume. Move might be a fake-out."

class RiskEvaluatorAgent(BaseAgent):
    def __init__(self):
        super().__init__("RiskEvaluator")

    def run(self, data: Dict[str, Any]) -> str:
        risk_score = random.randint(1, 10)
        if risk_score > 7:
            return f"Risk score is HIGH ({risk_score}). Recommendation: REDUCE position size."
        return f"Risk score is LOW ({risk_score}). Recommendation: STANDARD position size."

class TechnicalAnalystAgent(BaseAgent):
    def __init__(self):
        super().__init__("TechnicalAnalyst")

    def run(self, data: Dict[str, Any]) -> str:
        rsi = data.get("rsi", 50)
        if rsi > 70:
            return f"RSI is {rsi} (Overbought). Recommendation: SELL."
        if rsi < 30:
            return f"RSI is {rsi} (Oversold). Recommendation: BUY."
        return f"RSI is {rsi} (Neutral). Recommendation: HOLD."
