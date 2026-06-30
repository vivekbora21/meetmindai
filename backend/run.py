import sys
import argparse
from subprocess import Popen

def start_server():
    try:
        # Run uvicorn server
        command = ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
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
        command = ["celery", "-A", "app.celery_app", "worker", "--loglevel=info"]
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

    if args.command == "server":
        start_server()
    elif args.command == "celery":
        start_celery()
