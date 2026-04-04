import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base
import turso_dbapi

# Turso/libsql connection support
# Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables for Turso
# Falls back to local SQLite if not set
TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL", "")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")

if TURSO_DATABASE_URL and TURSO_AUTH_TOKEN:
    # Use custom DBAPI adapter that talks to Turso's HTTP API (/v2/pipeline)
    # This is more reliable than sqlalchemy-libsql which has auth token issues
    _turso_url = TURSO_DATABASE_URL.replace("libsql://", "https://")
    if not _turso_url.startswith("http"):
        _turso_url = f"https://{_turso_url}"

    def _turso_creator():
        return turso_dbapi.connect(url=_turso_url, token=TURSO_AUTH_TOKEN)

    engine = create_engine(
        "sqlite://",
        creator=_turso_creator,
        pool_pre_ping=False,
    )
else:
    # Fallback to local SQLite for development
    SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./rockalpha.db")
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        engine = create_engine(
            SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
        )
    else:
        engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Initialize database tables. Skipped for Turso (tables already exist)."""
    if not (TURSO_DATABASE_URL and TURSO_AUTH_TOKEN):
        Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
