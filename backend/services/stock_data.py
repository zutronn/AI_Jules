import os
import time
import requests
from typing import Dict, Any, Optional

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "d605tbhr01qihi8ojoo0d605tbhr01qihi8ojoog")
FINNHUB_BASE_URL = "https://finnhub.io/api/v1"


class StockDataService:
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_ttl = 60  # seconds
        self._cache_timestamps: Dict[str, float] = {}
        self._last_health_check: Optional[float] = None
        self._last_health_ok: bool = False
        self._last_health_detail: str = "Not checked yet"

    def _is_cache_valid(self, symbol: str) -> bool:
        if symbol not in self._cache_timestamps:
            return False
        return (time.time() - self._cache_timestamps[symbol]) < self._cache_ttl

    def get_realtime_data(self, symbol: str) -> Dict[str, Any]:
        """Fetch real-time stock quote from Finnhub API.
        Returns dict with symbol, price, price_change, volatility, volume, rsi.
        Falls back to cached data if API call fails."""
        symbol = symbol.strip().upper()

        # Return cached data if fresh
        if self._is_cache_valid(symbol) and symbol in self._cache:
            return self._cache[symbol]

        try:
            resp = requests.get(
                f"{FINNHUB_BASE_URL}/quote",
                params={"symbol": symbol, "token": FINNHUB_API_KEY},
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()

            # Finnhub quote response fields:
            # c = current price, d = change, dp = percent change
            # h = high, l = low, o = open, pc = previous close, t = timestamp
            current_price = data.get("c", 0)
            change = data.get("d", 0)
            high = data.get("h", 0)
            low = data.get("l", 0)

            if current_price <= 0:
                # Finnhub returned 0 — symbol might not exist or market data unavailable
                if symbol in self._cache:
                    return self._cache[symbol]
                return {
                    "symbol": symbol,
                    "price": 0,
                    "price_change": 0,
                    "volatility": 0,
                    "volume": 0,
                    "rsi": 50,
                    "source": "finnhub",
                    "error": "No price data available",
                }

            # Calculate simple volatility from high/low range
            volatility = round((high - low) / current_price, 4) if current_price > 0 else 0

            result = {
                "symbol": symbol,
                "price": round(current_price, 2),
                "price_change": round(change, 4) if change else 0,
                "price_change_percent": round(data.get("dp", 0), 4),
                "high": round(high, 2),
                "low": round(low, 2),
                "open": round(data.get("o", 0), 2),
                "previous_close": round(data.get("pc", 0), 2),
                "volatility": volatility,
                "volume": 0,  # Quote endpoint doesn't return volume
                "rsi": 50,  # RSI requires separate candle data
                "source": "finnhub",
                "timestamp": data.get("t", 0),
            }

            # Cache the result
            self._cache[symbol] = result
            self._cache_timestamps[symbol] = time.time()
            return result

        except requests.RequestException as e:
            print(f"Finnhub API error for {symbol}: {e}")
            # Fall back to cached data if available
            if symbol in self._cache:
                cached = self._cache[symbol].copy()
                cached["source"] = "finnhub_cached"
                return cached
            return {
                "symbol": symbol,
                "price": 0,
                "price_change": 0,
                "volatility": 0,
                "volume": 0,
                "rsi": 50,
                "source": "finnhub_error",
                "error": str(e),
            }

    def check_health(self) -> Dict[str, Any]:
        """Check Finnhub API connectivity by fetching AAPL quote.
        Caches result for 60 seconds to avoid rate limiting."""
        now = time.time()
        if self._last_health_check and (now - self._last_health_check) < 60:
            return {
                "status": "connected" if self._last_health_ok else "disconnected",
                "detail": self._last_health_detail,
                "cached": True,
            }

        try:
            resp = requests.get(
                f"{FINNHUB_BASE_URL}/quote",
                params={"symbol": "AAPL", "token": FINNHUB_API_KEY},
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
            price = data.get("c", 0)
            if price > 0:
                self._last_health_ok = True
                self._last_health_detail = f"OK — AAPL ${price}"
            else:
                self._last_health_ok = False
                self._last_health_detail = "API returned 0 price for AAPL"
            self._last_health_check = now
            return {
                "status": "connected" if self._last_health_ok else "degraded",
                "detail": self._last_health_detail,
                "api_key_set": bool(FINNHUB_API_KEY),
                "cached": False,
            }
        except requests.RequestException as e:
            self._last_health_ok = False
            self._last_health_detail = f"Error: {e}"
            self._last_health_check = now
            return {
                "status": "disconnected",
                "detail": self._last_health_detail,
                "api_key_set": bool(FINNHUB_API_KEY),
                "cached": False,
            }
