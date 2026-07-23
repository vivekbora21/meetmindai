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
        # Run Alembic migrations programmatically on startup
        print("Running database migrations...")
        from alembic.config import Config
        from alembic import command

        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        print("Database migrations applied successfully.")

        # Seed default database data if users table is empty
        db = SessionLocal()
        try:
            user_count = db.query(User).count()
            if user_count == 0:
                print("Seeding default database data...")
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
            print(f"Error checking/seeding database: {seed_err}")
            db.rollback()
        finally:
            db.close()
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


def start_celery(worker_type: str = "all"):
    import time
    import logging
    from app.utils.logging_pipeline import setup_logging as app_setup_logging
    from app.config.logging import logging_settings

    # Initialize application logging configuration
    app_setup_logging(logging_settings.LOG_LEVEL)
    logger = logging.getLogger("meeting.worker")

    worker_configs = {
        "critical": {"name": "critical_worker", "queues": "critical", "concurrency": 2},
        "embedding": {
            "name": "embedding_worker",
            "queues": "background",
            "concurrency": 2,
        },
        "speaker": {"name": "speaker_worker", "queues": "speaker", "concurrency": 2},
        "maintenance": {
            "name": "maintenance_worker",
            "queues": "maintenance,celery",
            "concurrency": 2,
        },
    }

    # Verify Redis connection first
    import redis
    from app.config.settings import get_env

    redis_url = get_env("REDIS_URL", "redis://localhost:6379/0")
    redis_status = "Connected"
    try:
        r = redis.Redis.from_url(redis_url)
        r.ping()
        # Clean state for tracking ready workers
        r.delete("meetingmind:ready_workers")
    except Exception as exc:
        redis_status = "Disconnected"
        logger.error(f"Redis connection failed: {exc}")

    processes = []
    active_configs = {}
    if worker_type == "all":
        active_configs = worker_configs
    else:
        active_configs = {worker_type: worker_configs[worker_type]}

    try:
        logger.info("Starting Celery workers...")
        for w_type, config in active_configs.items():
            cmd = [
                sys.executable,
                "-m",
                "celery",
                "-q",  # Disable Celery ASCII banner and config dump
                "-A",
                "app.celery_app",
                "worker",
                "-Q",
                config["queues"],
                "-n",
                f"{config['name']}@%h",
                f"--concurrency={config['concurrency']}",
                "--loglevel=info",
            ]
            logger.info(f'Worker "{w_type}" started')
            processes.append(Popen(cmd))

        if redis_status == "Connected":
            logger.info("Redis connection established")

        # Wait for launched workers to signal readiness
        expected_workers = set(active_configs.keys())
        ready_workers = set()

        start_time = time.time()
        while not expected_workers.issubset(ready_workers):
            # Check if any process terminated early
            for p in processes:
                if p.poll() is not None:
                    logger.error(
                        "Celery worker process exited unexpectedly during startup."
                    )
                    break

            if redis_status == "Connected":
                try:
                    ready_workers = {
                        w.decode("utf-8")
                        for w in r.smembers("meetingmind:ready_workers")
                    }
                except Exception:
                    pass
            else:
                # If Redis is disconnected, break to prevent infinite hang
                break

            time.sleep(0.2)

        elapsed = time.time() - start_time
        logger.info("All workers ready.")

        # Print consolidated workers ready summary
        summary_lines = []
        summary_lines.append("========================================")
        summary_lines.append("MeetingMind Workers Ready\n")

        critical_status = (
            "✓ Whisper" if "critical" in expected_workers else "  Whisper (inactive)"
        )
        summary_lines.append(f"critical      {critical_status:<19} 2 workers")

        speaker_status = (
            "✓ SpeechBrain"
            if "speaker" in expected_workers
            else "  SpeechBrain (inactive)"
        )
        summary_lines.append(f"speaker       {speaker_status:<19} 2 workers")

        embedding_status = (
            "✓ SentenceTransformer"
            if "embedding" in expected_workers
            else "  SentenceTransformer (inactive)"
        )
        summary_lines.append(f"embedding     {embedding_status:<19} 2 workers")

        maintenance_status = (
            "✓ No models"
            if "maintenance" in expected_workers
            else "  No models (inactive)"
        )
        summary_lines.append(f"maintenance   {maintenance_status:<19} 2 workers")

        summary_lines.append("")
        summary_lines.append(f"Redis         ✓ {redis_status}")
        summary_lines.append(f"Startup Time  {elapsed:.1f} sec")
        summary_lines.append("")
        summary_lines.append("========================================")

        print("\n".join(summary_lines))

        # Monitor processes
        while processes:
            for p in list(processes):
                if p.poll() is not None:
                    processes.remove(p)
            time.sleep(1)

    except KeyboardInterrupt:
        print("\nTerminating Celery workers...")
        for p in processes:
            try:
                p.terminate()
                p.wait()
            except Exception:
                pass
        sys.exit(0)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Manage server and Celery worker.")
    parser.add_argument(
        "command",
        choices=["server", "celery"],
        help="Command to run: 'server' to start uvicorn, 'celery' to start celery worker.",
    )
    parser.add_argument(
        "--worker-type",
        choices=["all", "critical", "embedding", "speaker", "maintenance"],
        default="all",
        help="Type of Celery worker to start when command is 'celery'. Default is 'all'.",
    )
    args = parser.parse_args()

    # Automatically check and setup database before running server or celery
    check_and_setup_db()

    # Validate LLM provider settings on startup
    try:
        from app.services.llm.factory import LLMFactory

        print("Validating LLM configuration...")
        provider_instance = LLMFactory.get_provider()
        print(
            f"LLM Configuration validated successfully. Active Provider: '{provider_instance.provider_name}' | Model: '{provider_instance.model_name}'"
        )
    except Exception as e:
        print(f"CRITICAL CONFIGURATION ERROR: {e}", file=sys.stderr)
        sys.exit(1)

    if args.command == "server":
        start_server()
    elif args.command == "celery":
        start_celery(args.worker_type)
