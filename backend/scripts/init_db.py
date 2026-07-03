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
        print("Enabling pgvector extension if not exists...")
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.commit()

    print("Dropping existing tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)

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
