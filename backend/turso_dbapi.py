"""
DBAPI 2.0 adapter for Turso HTTP API.

This module wraps Turso's HTTP pipeline API (/v2/pipeline) in a standard
Python DBAPI 2.0 interface so that SQLAlchemy can use it transparently.
No need for the broken sqlalchemy-libsql driver.

Usage with SQLAlchemy:
    from sqlalchemy import create_engine
    engine = create_engine("sqlite://", creator=lambda: turso_dbapi.connect(url, token))
"""

import httpx
import logging
import os
import time
from typing import Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

# DBAPI 2.0 module-level attributes
apilevel = "2.0"
threadsafety = 1
paramstyle = "qmark"


class TursoCursor:
    """DBAPI 2.0 Cursor wrapping Turso HTTP API responses."""

    def __init__(self, connection: "TursoConnection"):
        self._conn = connection
        self.description: Optional[List[Tuple]] = None
        self._rows: List[Tuple] = []
        self.rowcount: int = -1
        self.lastrowid: Optional[int] = None
        self.arraysize: int = 1

    def execute(self, sql: str, params=None):
        sql_stripped = sql.strip()
        sql_lower = sql_stripped.lower()

        # Handle PRAGMA statements locally — SQLAlchemy's SQLite dialect
        # sends these on connection init and they may not work over HTTP
        if sql_lower.startswith("pragma"):
            return self._handle_pragma(sql_lower)

        stmt: dict = {"sql": sql_stripped}

        if params:
            if isinstance(params, dict):
                stmt["named_args"] = []
                for key, value in params.items():
                    stmt["named_args"].append({
                        "name": key,
                        "value": _convert_value(value),
                    })
            elif isinstance(params, (list, tuple)):
                stmt["args"] = [_convert_value(v) for v in params]

        result = self._conn._execute_stmt(stmt)

        if result is not None:
            cols = result.get("cols", [])
            rows = result.get("rows", [])
            if cols:
                self.description = [
                    (c.get("name", ""), None, None, None, None, None, None)
                    for c in cols
                ]
            else:
                self.description = None

            self._rows = []
            for row in rows:
                self._rows.append(tuple(_extract_value(v) for v in row))

            self.rowcount = result.get("affected_row_count", len(self._rows))
            last_id = result.get("last_insert_rowid")
            if last_id is not None:
                self.lastrowid = int(last_id) if isinstance(last_id, str) else last_id
        else:
            self.description = None
            self._rows = []

    def _handle_pragma(self, sql_lower: str):
        """Handle PRAGMA statements locally for SQLAlchemy compatibility."""
        if "read_uncommitted" in sql_lower:
            self.description = [("read_uncommitted", None, None, None, None, None, None)]
            self._rows = [(0,)]
            self.rowcount = 1
        elif "journal_mode" in sql_lower:
            self.description = [("journal_mode", None, None, None, None, None, None)]
            self._rows = [("wal",)]
            self.rowcount = 1
        elif "foreign_keys" in sql_lower:
            self.description = [("foreign_keys", None, None, None, None, None, None)]
            self._rows = [(1,)]
            self.rowcount = 1
        elif "table_info" in sql_lower:
            self.description = [
                ("cid", None, None, None, None, None, None),
                ("name", None, None, None, None, None, None),
                ("type", None, None, None, None, None, None),
                ("notnull", None, None, None, None, None, None),
                ("dflt_value", None, None, None, None, None, None),
                ("pk", None, None, None, None, None, None),
            ]
            self._rows = []
            self.rowcount = 0
        else:
            # Unknown PRAGMA — return empty result
            self.description = None
            self._rows = []
            self.rowcount = 0

    def executemany(self, sql: str, seq_of_params):
        for params in seq_of_params:
            self.execute(sql, params)

    def fetchone(self) -> Optional[Tuple]:
        if self._rows:
            return self._rows.pop(0)
        return None

    def fetchall(self) -> List[Tuple]:
        rows = list(self._rows)
        self._rows = []
        return rows

    def fetchmany(self, size: Optional[int] = None) -> List[Tuple]:
        if size is None:
            size = self.arraysize
        rows = self._rows[:size]
        self._rows = self._rows[size:]
        return rows

    def close(self):
        pass

    def setinputsizes(self, sizes):
        pass

    def setoutputsize(self, size, column=None):
        pass

    def __iter__(self):
        return self

    def __next__(self):
        row = self.fetchone()
        if row is None:
            raise StopIteration
        return row


class TursoConnection:
    """DBAPI 2.0 Connection wrapping Turso HTTP API."""

    MAX_RETRIES = 8
    RETRY_DELAYS = [1.0, 2.0, 4.0, 8.0, 15.0, 15.0, 15.0, 15.0]

    def __init__(self, url: str, token: str):
        self._url = url.rstrip("/")
        self._token = token
        self._client = httpx.Client(timeout=60)
        self._headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }
        # Wake up the database on first connection (Turso free-tier hibernates)
        self._wake_up()

    def _wake_up(self):
        """Send a lightweight SELECT 1 to wake up a hibernated Turso database.
        Retries with exponential backoff until the database responds."""
        endpoint = f"{self._url}/v2/pipeline"
        ping = {
            "requests": [
                {"type": "execute", "stmt": {"sql": "SELECT 1"}},
                {"type": "close"},
            ]
        }
        for attempt in range(self.MAX_RETRIES):
            try:
                resp = self._client.post(endpoint, headers=self._headers, json=ping)
                if resp.status_code == 200:
                    logger.info("Turso database is awake (attempt %d)", attempt + 1)
                    return
                if resp.status_code in (404, 502, 503, 504):
                    logger.warning(
                        "Turso wake-up %s (attempt %d/%d): %s",
                        resp.status_code, attempt + 1, self.MAX_RETRIES,
                        resp.text[:200],
                    )
                    time.sleep(self.RETRY_DELAYS[attempt])
                    continue
                resp.raise_for_status()
                return
            except (httpx.ConnectError, httpx.ReadTimeout, httpx.WriteTimeout):
                logger.warning("Turso wake-up connection error (attempt %d/%d)", attempt + 1, self.MAX_RETRIES)
                if attempt < self.MAX_RETRIES - 1:
                    time.sleep(self.RETRY_DELAYS[attempt])
                    continue
                raise
        logger.error("Turso database did not wake up after %d attempts", self.MAX_RETRIES)

    def _execute_stmt(self, stmt: dict) -> Optional[dict]:
        payload = {
            "requests": [
                {"type": "execute", "stmt": stmt},
                {"type": "close"},
            ]
        }
        endpoint = f"{self._url}/v2/pipeline"

        resp = None
        for attempt in range(self.MAX_RETRIES):
            try:
                resp = self._client.post(endpoint, headers=self._headers, json=payload)
                # Turso can return transient 404/502/503/504 due to routing/scaling
                if resp.status_code in (404, 502, 503, 504):
                    if attempt < self.MAX_RETRIES - 1:
                        logger.warning(
                            "Turso transient %s (attempt %d/%d): %s",
                            resp.status_code, attempt + 1, self.MAX_RETRIES,
                            resp.text[:200],
                        )
                        time.sleep(self.RETRY_DELAYS[attempt])
                        continue
                if resp.status_code == 400:
                    # Log the full request/response for debugging bad requests
                    logger.error(
                        "Turso 400 Bad Request — SQL: %s | Response: %s",
                        stmt.get("sql", "")[:300], resp.text[:500],
                    )
                resp.raise_for_status()
                break
            except httpx.HTTPStatusError:
                raise
            except (httpx.ConnectError, httpx.ReadTimeout, httpx.WriteTimeout):
                if attempt < self.MAX_RETRIES - 1:
                    logger.warning(
                        "Turso connection error (attempt %d/%d)",
                        attempt + 1, self.MAX_RETRIES,
                    )
                    time.sleep(self.RETRY_DELAYS[attempt])
                    continue
                raise

        if resp is None:
            raise InterfaceError("No response received from Turso after retries")

        data = resp.json()
        results = data.get("results", [])
        if results and results[0].get("type") == "ok":
            return results[0]["response"]["result"]
        elif results and results[0].get("type") == "error":
            error = results[0].get("error", {})
            msg = error.get("message", str(error))
            # Map SQLite constraint errors to IntegrityError
            if "UNIQUE constraint" in msg or "CONSTRAINT" in msg:
                raise IntegrityError(f"Turso SQL error: {msg}")
            raise OperationalError(f"Turso SQL error: {msg}")
        return None

    def cursor(self):
        return TursoCursor(self)

    def commit(self):
        pass  # Each statement auto-commits via HTTP API

    def rollback(self):
        pass  # Not supported in HTTP pipeline mode

    def close(self):
        try:
            self._client.close()
        except Exception:
            pass

    # SQLAlchemy SQLite dialect checks these
    @property
    def isolation_level(self):
        return None

    @isolation_level.setter
    def isolation_level(self, value):
        pass

    def create_function(self, *args, **kwargs):
        pass  # SQLite UDFs not supported over HTTP


# DBAPI 2.0 exception hierarchy
class Error(Exception):
    pass

class DatabaseError(Error):
    pass

class OperationalError(DatabaseError):
    pass

class IntegrityError(DatabaseError):
    pass

class ProgrammingError(DatabaseError):
    pass

class InterfaceError(Error):
    pass


def connect(url: Optional[str] = None, token: Optional[str] = None, **kwargs) -> TursoConnection:
    """Create a Turso DBAPI connection.

    Args:
        url: Turso database URL (libsql:// or https://)
        token: Turso auth token
        **kwargs: Ignored (for SQLAlchemy compatibility, e.g. check_same_thread)
    """
    if url is None:
        url = os.environ.get("TURSO_DATABASE_URL", "")
    if token is None:
        token = os.environ.get("TURSO_AUTH_TOKEN", "")

    # Normalize URL to HTTPS
    url = url.replace("libsql://", "https://")
    if not url.startswith("http"):
        url = f"https://{url}"

    return TursoConnection(url, token)


# Value conversion helpers

def _convert_value(value: Any) -> dict:
    """Convert a Python value to Turso's JSON value format.

    Turso HTTP API expects:
      - integers: {"type": "integer", "value": "123"}  (string-encoded)
      - floats:   {"type": "float", "value": 12.34}    (actual JSON number!)
      - text:     {"type": "text", "value": "hello"}
      - null:     {"type": "null"}
      - blob:     {"type": "blob", "base64": "..."}
    """
    if value is None:
        return {"type": "null"}
    elif isinstance(value, bool):
        return {"type": "integer", "value": str(int(value))}
    elif isinstance(value, int):
        return {"type": "integer", "value": str(value)}
    elif isinstance(value, float):
        # Turso expects float values as actual JSON numbers, NOT strings
        return {"type": "float", "value": value}
    elif isinstance(value, bytes):
        import base64
        return {"type": "blob", "base64": base64.b64encode(value).decode()}
    else:
        return {"type": "text", "value": str(value)}


def _extract_value(v: dict) -> Any:
    """Convert a Turso JSON value to a Python value."""
    if v is None:
        return None
    vtype = v.get("type", "text")
    value = v.get("value")
    if vtype == "null" or value is None:
        return None
    elif vtype == "integer":
        return int(value)
    elif vtype == "float":
        return float(value)
    elif vtype == "blob":
        import base64
        return base64.b64decode(v.get("base64", ""))
    else:
        return str(value)
