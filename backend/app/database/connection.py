from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config.settings import get_env

DATABASE_URL = get_env(
    "DATABASE_URL", "postgresql://postgres:password@localhost:5432/meetingmind"
)

# Create engine with production-ready connection pool configurations
engine = create_engine(
    DATABASE_URL, pool_size=20, max_overflow=10, pool_recycle=3600, pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
