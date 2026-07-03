# MeetingMind AI - Installation & Setup Guide

This document provides a comprehensive, step-by-step guide to installing, configuring, and running the MeetingMind AI platform on another system. It contains separate instructions for **Ubuntu (Linux)** and **Windows**.

---

## Technical Stack & Requirements

MeetingMind AI consists of:
1. **Frontend**: Next.js App Router (React, Tailwind CSS, TypeScript).
2. **Backend**: FastAPI (Python) serving REST APIs and WebSockets.
3. **Worker**: Celery (Python) for asynchronous tasks (audio extraction, speech-to-text, LLM summarization).
4. **Database**: PostgreSQL with the **pgvector** extension.
5. **Cache/Broker**: Redis (for Celery and caching).
6. **System Utilities**: **FFmpeg** (required for processing uploaded video/audio).

---

## 🖥️ Ubuntu (Linux) Installation Guide

Follow these steps to set up the system natively on Ubuntu.

### 1. Install System Prerequisites
Update your packages and install Python, Node.js, FFmpeg, and Redis.

```bash
# 1. Update apt repositories
sudo apt update

# 2. Install Python 3, pip, virtual environment, and compilation headers
sudo apt install -y python3 python3-pip python3-venv python3-dev build-essential

# 3. Install Node.js (v20 LTS recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Install FFmpeg (crucial for audio extraction)
sudo apt install -y ffmpeg

# 5. Install and start Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server.service
sudo systemctl start redis-server.service
```

### 2. Install PostgreSQL and `pgvector`
MeetingMind AI uses PostgreSQL with the `pgvector` extension for storing meeting transcripts and performing semantic search.

```bash
# 1. Install PostgreSQL and contrib modules
sudo apt install -y postgresql postgresql-contrib

# 2. Enable and start PostgreSQL service
sudo systemctl enable postgresql
sudo systemctl start postgresql

# 3. Install pgvector from source (ensures compatibility with all Postgres versions)
sudo apt install -y git postgresql-server-dev-all
git clone --branch v0.7.0 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
cd .. && rm -rf pgvector
```

### 3. Create the Database & User
Connect to PostgreSQL and set up the database and roles. Make sure the database exists before starting the backend.

```bash
# Create the database 'meetingmind'
sudo -u postgres psql -c "CREATE DATABASE meetingmind;"

# Set a password for the 'postgres' user (e.g. 'root')
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'root';"
```

### 4. Clone and Configure Environment Variables
Copy the environment variables template and configure them.

```bash
# 1. Navigate to the project root
cd /path/to/meetingmind

# 2. Copy the template to backend/.env
cp .env.example backend/.env
```

Open `backend/.env` in your preferred editor (e.g., `nano backend/.env`) and adjust:
* `DATABASE_URL`: Ensure credentials match your PostgreSQL instance (e.g., `postgresql://postgres:root@localhost:5432/meetingmind`).
* `JWT_SECRET`: Generate a secure 32-character random string (e.g., `openssl rand -hex 32`).
* `OPENROUTER_API_KEY`: Provide your OpenRouter API key for LLM summaries.

### 5. Setup & Run the Backend API
Set up the Python virtual environment and run the backend. The startup script will automatically run migrations and seed a default admin user.

```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Run backend server (will run on port 8000)
python run.py server
```
*On successful startup, a default admin user will be seeded: **`vivek@company.com`** with password **`password`**.*

### 6. Run the Celery Worker
In a new terminal window:
```bash
cd backend
source .venv/bin/activate
python run.py celery
```

### 7. Setup & Run the Frontend
In a third terminal window, install dependencies and run the Next.js development server.

```bash
cd frontend

# Install packages
npm install

# Start Next.js (runs on http://localhost:3000)
npm run dev
```

---

## 🏁 Windows Installation Guide

Setting up PostgreSQL, compiling native C extensions (`pgvector`), and running Redis natively on Windows can be challenging. **Using Docker Desktop for database and cache services is highly recommended.**

### 📦 Option A: Docker-Based Dependency Setup (Recommended)
This approach runs PostgreSQL (with `pgvector` pre-installed) and Redis inside Docker containers, while running Python and Node.js code natively.

#### 1. Install Prerequisite Software
Install the following Windows installers:
* **Docker Desktop**: [Download Link](https://www.docker.com/products/docker-desktop/) (Make sure WSL2 integration is enabled).
* **Python 3.10 or 3.11**: [Download Link](https://www.python.org/downloads/) (Check **"Add Python to PATH"** during installation).
* **Node.js (v20 LTS)**: [Download Link](https://nodejs.org/).
* **FFmpeg**:
  * Install via Command Prompt/PowerShell using Winget:
    ```powershell
    winget install Gyan.FFmpeg
    ```
  * Or download the build from [Gyan.dev](https://www.gyan.dev/ffmpeg/builds/), extract it, and add the `bin` folder path to your system's `PATH` Environment Variables.

#### 2. Start PostgreSQL + pgvector and Redis using Docker
Open PowerShell and start the database and cache containers:

```powershell
# 1. Run PostgreSQL with pgvector on port 5433 (or 5432 if preferred)
docker run --name meetingmind-postgres -p 5433:5432 -e POSTGRES_PASSWORD=root -d pgvector/pgvector:pg16

# 2. Run Redis on port 6379
docker run --name meetingmind-redis -p 6379:6379 -d redis:7-alpine
```

#### 3. Create the Database
Since the database must exist before the backend connects, run a SQL command inside the container to create it:
```powershell
docker exec -it meetingmind-postgres psql -U postgres -c "CREATE DATABASE meetingmind;"
```

---

### 💻 Option B: Fully Native Dependency Setup (No Docker)
If you cannot or do not want to use Docker, follow these instructions to set up dependencies natively.

#### 1. Install Software
* **Python** and **Node.js** (same as above).
* **PostgreSQL**: Download and install PostgreSQL v15 or v16 from [EnterpriseDB](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads). Note your `postgres` password during setup.
* **Redis**: Redis does not officially support Windows. You must install it using Windows Subsystem for Linux (WSL), or download a community-compiled MSI package (like Memurai or MSOpenTech legacy archive).
* **FFmpeg**: Install via `winget install Gyan.FFmpeg`.

#### 2. Compile and Install `pgvector` Natively on Windows
To use `pgvector` without Docker, you must build it using Microsoft C++ Build Tools:
1. Install [Visual Studio Community Edition](https://visualstudio.microsoft.com/) with the **"Desktop development with C++"** workload.
2. Open **"Developer Command Prompt for VS"** as Administrator.
3. Set your PostgreSQL installation path:
   ```cmd
   set "PGROOT=C:\Program Files\PostgreSQL\16"
   ```
4. Clone and build `pgvector`:
   ```cmd
   git clone --branch v0.7.0 https://github.com/pgvector/pgvector.git
   cd pgvector
   nmake /F Makefile.win
   nmake /F Makefile.win install
   ```
5. Open pgAdmin or connect via `psql` and run:
   ```sql
   CREATE DATABASE meetingmind;
   ```

---

### 4. Application Configuration & Startup (Windows)

Once your dependencies are running (via Option A or Option B), configure and run the application.

#### 1. Configure `.env`
In the project root, copy the environment file:
```powershell
copy .env.example backend\.env
```
Edit `backend/.env` to configure your connection string.
* If using **Docker (Option A)** on port 5433:
  ```env
  DATABASE_URL=postgresql://postgres:root@localhost:5433/meetingmind
  REDIS_URL=redis://localhost:6379/0
  JWT_SECRET=supersecretkeymeetingmind_secure_key_at_least_32_bytes_long
  SKIP_DOCKER=true
  ```
* If using **Native (Option B)** on default port 5432:
  ```env
  DATABASE_URL=postgresql://postgres:[YOUR_POSTGRES_PASSWORD]@localhost:5432/meetingmind
  REDIS_URL=redis://localhost:6379/0
  JWT_SECRET=supersecretkeymeetingmind_secure_key_at_least_32_bytes_long
  SKIP_DOCKER=true
  ```

#### 2. Backend Setup
Open a new PowerShell terminal:

```powershell
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
.venv\Scripts\Activate.ps1

# Upgrade pip and install requirements
pip install --upgrade pip
pip install -r requirements.txt

# Run backend server
python run.py server
```

#### 3. Celery Worker (Critical Windows Step)
Celery's default worker execution pool (prefork) relies on UNIX `fork()`, which is **not supported on Windows**. Running `python run.py celery` directly will fail.

On Windows, you **must** force the single-threaded `solo` execution pool or use `eventlet`. Open a new PowerShell terminal and run:

```powershell
cd backend
.venv\Scripts\Activate.ps1

# Run celery worker forcing the solo execution pool
celery -A app.celery_app worker --loglevel=info -P solo
```

#### 4. Frontend Setup
Open another PowerShell terminal:

```powershell
cd frontend
npm install
npm run dev
```

---

## 🛠️ Troubleshooting & Common Issues

### 1. Celery Worker fails with `ValueError: not enough values to unpack` (Windows)
* **Cause**: Celery prefork pool tries to spawn processes on Windows and fails.
* **Solution**: Ensure you are running Celery with the `-P solo` pool option: `celery -A app.celery_app worker --loglevel=info -P solo`.

### 2. `sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) FATAL: database "meetingmind" does not exist`
* **Cause**: The backend connection succeeded, but the database has not been created yet.
* **Solution**: Connect to your database engine (via `psql` or `pgAdmin`) and run `CREATE DATABASE meetingmind;` manually before starting the backend server.

### 3. `sqlalchemy.exc.ProgrammingError: (psycopg2.errors.UndefinedObject) extension "vector" does not exist`
* **Cause**: The backend attempted to run `CREATE EXTENSION IF NOT EXISTS vector;` but the `pgvector` library binaries are not installed in the PostgreSQL extensions directory.
* **Solution**: Double check that `pgvector` was successfully compiled and installed, or switch to using the official Docker container `pgvector/pgvector:pg16` which has it pre-configured.

### 4. `FileNotFoundError: [Errno 2] No such file or directory: 'ffmpeg'`
* **Cause**: FFmpeg is not installed or its `bin` directory is not included in the environment system `PATH`.
* **Solution**:
  * On Ubuntu: Run `sudo apt install ffmpeg`.
  * On Windows: Run `winget install Gyan.FFmpeg` and restart your terminal. Verify by running `ffmpeg -version` in a fresh shell.
