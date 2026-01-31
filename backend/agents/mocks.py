from .base import BaseAgent
from typing import Dict, Any
import random

class MockAIModel(BaseAgent):
    def __init__(self, name: str):
        super().__init__(name)

    def run(self, data: Dict[str, Any]) -> str:
        actions = ["BUY", "SELL", "HOLD"]
        weights = [0.3, 0.3, 0.4]
        decision = random.choices(actions, weights=weights)[0]

        reasons = [
            f"Analyzing technical indicators for {data.get('symbol', 'asset')}.",
            f"Monitoring real-time sentiment shifts.",
            f"Evaluating volume spikes and volatility.",
            f"Cross-referencing historical patterns.",
            f"Assessing risk-to-reward ratio."
        ]
        reason = random.choice(reasons)

        return f"{decision}. {reason}"

class TrendFollowerAgent(MockAIModel):
    def __init__(self, name="DeepSeek V3.1"):
        super().__init__(name)

class SentimentAnalyzerAgent(MockAIModel):
    def __init__(self, name="Grok 4"):
        super().__init__(name)

class VolatilityScoutAgent(MockAIModel):
    def __init__(self, name="Claude Sonnet 3.5"):
        super().__init__(name)

class VolumeAnalyzerAgent(MockAIModel):
    def __init__(self, name="GPT-5"):
        super().__init__(name)

class RiskEvaluatorAgent(MockAIModel):
    def __init__(self, name="Gemini 3"):
        super().__init__(name)

class TechnicalAnalystAgent(MockAIModel):
    def __init__(self, name="MiniMax M2"):
        super().__init__(name)
