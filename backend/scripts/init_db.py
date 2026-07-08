import sys
import os
from sqlalchemy import text

# Add the base directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import engine, Base, SessionLocal
from app.models.models import *  # Import all models to ensure they are registered
from app.api.v1.endpoints.auth import get_password_hash


def init_database():
    print("Connecting to database...")
    with engine.connect() as conn:
        print("Dropping all tables by recreating schema...")
        conn.execute(text("DROP SCHEMA public CASCADE;"))
        conn.execute(text("CREATE SCHEMA public;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO postgres;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
        print("Enabling pgvector extension...")
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.commit()

    print("Running database migrations...")
    from alembic.config import Config
    from alembic import command
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")
    print("Database migrations applied successfully.")


    print("Seeding default database data...")
    db = SessionLocal()
    try:
        # Create default organization
        org = Organization(name="MeetingMind AI")
        db.add(org)
        db.commit()
        db.refresh(org)

        # Create default Admin user
        hashed_pwd = get_password_hash("password")
        user = User(
            name="Vivek Sharma",
            email="vivek@company.com",
            hashed_password=hashed_pwd,
            organization_id=org.id,
            role="Admin",
        )
        db.add(user)
        db.commit()
        print(
            "Successfully seeded default organization and admin user (vivek@company.com / password)"
        )
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

    print("Database initialization completed successfully!")


if __name__ == "__main__":
    init_database()
