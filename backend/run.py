import sys
import argparse
from subprocess import Popen


def check_and_setup_db():
    import subprocess
    import time
    import shutil
    import os
    from sqlalchemy import text
    from sqlalchemy.exc import OperationalError

    from app.database.connection import engine, Base, SessionLocal
    from app.models.models import User, Organization
    from app.api.v1.endpoints.auth import get_password_hash

    print("Checking database connection...")

    skip_docker = os.getenv("SKIP_DOCKER", "false").lower() in ("true", "1", "yes")
    has_docker = (
        shutil.which("docker") is not None or shutil.which("docker-compose") is not None
    )

    max_retries = 5
    for attempt in range(max_retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("Successfully connected to the database.")
            break
        except OperationalError as e:
            if attempt == max_retries:
                print(
                    "Could not connect to the database. Please ensure your PostgreSQL service is running and configured correctly."
                )
                raise e

            print(f"Database connection failed: {e}")

            if skip_docker or not has_docker:
                print(
                    "Skipping automatic Docker Compose startup (Docker not found or SKIP_DOCKER is set)."
                )
                print("Waiting for local PostgreSQL to accept connections...")
                time.sleep(5)
                continue

            print("Attempting to start redis via Docker Compose...")

            docker_started = False
            for docker_cmd in [
                ["docker", "compose"],
                ["docker-compose"],
                ["sudo", "docker", "compose"],
                ["sudo", "docker-compose"],
            ]:
                try:
                    subprocess.run(
                        docker_cmd + ["up", "-d", "redis"], cwd="..", check=True
                    )
                    docker_started = True
                    break
                except Exception:
                    continue

            if not docker_started:
                print(
                    "Warning: Could not start Docker services automatically. Please ensure they are running."
                )

            print("Waiting for PostgreSQL to accept connections...")
            time.sleep(5)

    try:
        with engine.connect() as conn:
            result = conn.execute(
                text(
                    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')"
                )
            )
            users_table_exists = result.scalar()

            if not users_table_exists:
                print("Database tables not found. Initializing database schema...")

                print("Enabling pgvector extension if not exists...")
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                conn.commit()

                print("Creating all tables...")
                Base.metadata.create_all(bind=engine)

                print("Seeding default database data...")
                db = SessionLocal()
                try:
                    org = Organization(name="MeetingMind AI")
                    db.add(org)
                    db.commit()
                    db.refresh(org)

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
                except Exception as seed_err:
                    print(f"Error seeding database: {seed_err}")
                    db.rollback()
                finally:
                    db.close()
            else:
                try:
                    conn.execute(
                        text(
                            "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255) NULL;"
                        )
                    )
                    conn.execute(
                        text(
                            "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS file_size INTEGER NULL;"
                        )
                    )
                    conn.execute(
                        text(
                            "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS content_type VARCHAR(100) NULL;"
                        )
                    )
                    conn.execute(
                        text(
                            "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS ai_status VARCHAR(50) DEFAULT 'PENDING';"
                        )
                    )
                    conn.execute(
                        text(
                            "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS embedding_status VARCHAR(50) DEFAULT 'PENDING';"
                        )
                    )
                    conn.execute(
                        text(
                            "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS agenda_items JSON NULL;"
                        )
                    )
                    conn.execute(
                        text(
                            "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS technical_context JSON NULL;"
                        )
                    )
                    conn.commit()
                    print("Creating new tables if any...")
                    Base.metadata.create_all(bind=engine)
                    
                    conn.execute(
                        text(
                            "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS session_id VARCHAR(36) NULL REFERENCES chat_sessions(id) ON DELETE CASCADE;"
                        )
                    )
                    conn.commit()
                    print(
                        "Checked and updated meetings and chat_messages table schema columns successfully."
                    )
                except Exception as alter_err:
                    print(
                        f"Non-fatal error checking/updating table columns: {alter_err}"
                    )
    except Exception as e:
        print(f"Error during database initialization: {e}")


def start_server():
    try:
        # Run uvicorn server
        command = [
            "uvicorn",
            "app.main:app",
            "--host",
            "0.0.0.0",
            "--port",
            "8000",
            "--reload",
        ]
        process = Popen(command)
        process.wait()
    except KeyboardInterrupt:
        print("Terminating the server...")
        process.terminate()
        process.wait()
        sys.exit(0)


def start_celery():
    try:
        # Run Celery worker
        command = [
            sys.executable,
            "-m",
            "celery",
            "-A",
            "app.celery_app",
            "worker",
            "--loglevel=info",
        ]
        process = Popen(command)
        process.wait()
    except KeyboardInterrupt:
        print("Terminating the Celery worker...")
        process.terminate()
        process.wait()
        sys.exit(0)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Manage server and Celery worker.")
    parser.add_argument(
        "command",
        choices=["server", "celery"],
        help="Command to run: 'server' to start uvicorn, 'celery' to start celery worker.",
    )
    args = parser.parse_args()

    # Automatically check and setup database before running server or celery
    check_and_setup_db()

    if args.command == "server":
        start_server()
    elif args.command == "celery":
        start_celery()
