# Complete Setup Guide

This guide will walk you through setting up your Personal AI Assistant from scratch.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [Browser Extension Setup](#browser-extension-setup)
5. [Network Access Configuration](#network-access-configuration)
6. [First Run](#first-run)

---

## Prerequisites

### 1. Install Python 3.11+

**Windows:**
```powershell
# Download from python.org or use winget
winget install Python.Python.3.11
```

Verify installation:
```powershell
python --version  # Should show 3.11 or higher
```

### 2. Install Node.js 18+

**Windows:**
```powershell
# Download from nodejs.org or use winget
winget install OpenJS.NodeJS
```

Verify installation:
```powershell
node --version  # Should show v18 or higher
npm --version
```

### 3. Get LLM API Key (Free Tier)

Choose ONE of these options:

**Option A: OpenRouter (Recommended)**
1. Go to [OpenRouter.ai](https://openrouter.ai/)
2. Sign up for free account
3. Go to Settings → Keys
4. Create API key
5. Free tier: ~25 requests/day for free models

**Option B: Groq**
1. Go to [Groq.com](https://groq.com/)
2. Sign up for free
3. Get API key from dashboard
4. Free tier: 30 requests/minute

---

## Backend Setup

### Step 1: Create Project Structure

Open PowerShell and navigate to your project:

```powershell
cd "C:\Users\amatu\OneDrive\Documents\Personalized_AI"

# Create backend folder structure
New-Item -ItemType Directory -Force -Path backend\app\api
New-Item -ItemType Directory -Force -Path backend\app\core
New-Item -ItemType Directory -Force -Path backend\app\models
New-Item -ItemType Directory -Force -Path backend\app\services
New-Item -ItemType Directory -Force -Path backend\app\utils
New-Item -ItemType Directory -Force -Path backend\data\uploads
New-Item -ItemType Directory -Force -Path backend\data\chroma
```

### Step 2: Create Virtual Environment

```powershell
cd backend
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# If you get execution policy error, run:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

You should see `(venv)` in your terminal prompt.

### Step 3: Install Python Dependencies

Create `requirements.txt`:

```powershell
# Create requirements.txt with this content
@"
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6
python-dotenv==1.0.1
sqlalchemy==2.0.25
aiosqlite==0.19.0
pydantic==2.5.3
pydantic-settings==2.1.0
chromadb==0.4.22
openai==1.10.0
httpx==0.26.0
apscheduler==3.10.4
websockets==12.0
pypdf2==3.0.1
python-docx==1.1.0
python-magic-bin==0.4.14
markdown==3.5.2
beautifulsoup4==4.12.3
aiofiles==23.2.1
"@ | Out-File -FilePath requirements.txt -Encoding UTF8
```

Install:
```powershell
pip install -r requirements.txt
```

### Step 4: Create Environment Configuration

Create `.env` file in `/backend`:

```powershell
@"
# Server Configuration
HOST=0.0.0.0
PORT=8000

# Database
DATABASE_URL=sqlite+aiosqlite:///./data/app.db

# LLM API Configuration
# Choose ONE: OpenRouter OR Groq

# OpenRouter (uncomment if using)
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_key_here
LLM_MODEL=meta-llama/llama-3.1-8b-instruct:free

# Groq (uncomment if using)
# LLM_PROVIDER=groq
# GROQ_API_KEY=your_groq_key_here
# LLM_MODEL=llama-3.1-8b-instant

# Vector Database
CHROMA_PERSIST_DIR=./data/chroma

# File Upload
MAX_UPLOAD_SIZE=10485760  # 10MB
ALLOWED_EXTENSIONS=pdf,docx,txt,md

# Scheduler
SCHEDULER_ENABLED=true
TIMEZONE=UTC

# Notifications
PUSH_NOTIFICATIONS_ENABLED=true

# Screen Time
SCREEN_TIME_CHECK_INTERVAL=300  # 5 minutes
SCREEN_TIME_WARNING_THRESHOLD=7200  # 2 hours

# Security
SECRET_KEY=your-secret-key-change-this-in-production
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
"@ | Out-File -FilePath .env -Encoding UTF8
```

⚠️ **Important**: Replace `your_openrouter_key_here` or `your_groq_key_here` with your actual API key!

### Step 5: Create Backend Code Files

#### A. Main Application (`backend/main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from app.core.config import settings
from app.core.database import init_db
from app.api import tasks, schedule, study, tracking
from app.services.scheduler import start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    await init_db()
    if settings.SCHEDULER_ENABLED:
        start_scheduler()
    print(f"🚀 Server started on http://{settings.HOST}:{settings.PORT}")
    yield
    # Shutdown
    if settings.SCHEDULER_ENABLED:
        stop_scheduler()

app = FastAPI(
    title="Personal AI Assistant",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(schedule.router, prefix="/api/schedule", tags=["Schedule"])
app.include_router(study.router, prefix="/api/study", tags=["Study"])
app.include_router(tracking.router, prefix="/api/tracking", tags=["Tracking"])

@app.get("/")
async def root():
    return {
        "message": "Personal AI Assistant API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
```

#### B. Configuration (`backend/app/core/config.py`)

```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str
    
    # LLM
    LLM_PROVIDER: str = "openrouter"
    OPENROUTER_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    LLM_MODEL: str = "meta-llama/llama-3.1-8b-instruct:free"
    
    # Chroma
    CHROMA_PERSIST_DIR: str = "./data/chroma"
    
    # Files
    MAX_UPLOAD_SIZE: int = 10485760
    ALLOWED_EXTENSIONS: str = "pdf,docx,txt,md"
    
    # Scheduler
    SCHEDULER_ENABLED: bool = True
    TIMEZONE: str = "UTC"
    
    # Notifications
    PUSH_NOTIFICATIONS_ENABLED: bool = True
    
    # Screen Time
    SCREEN_TIME_CHECK_INTERVAL: int = 300
    SCREEN_TIME_WARNING_THRESHOLD: int = 7200
    
    # Security
    SECRET_KEY: str
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

#### C. Database Setup (`backend/app/core/database.py`)

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,
    future=True
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ Database initialized")

async def get_db():
    """Dependency for database sessions"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

#### D. Task Model (`backend/app/models/task.py`)

```python
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from datetime import datetime
from app.core.database import Base

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    priority = Column(String(20), default="medium")  # low, medium, high
    status = Column(String(20), default="pending")  # pending, in_progress, completed
    category = Column(String(50), nullable=True)
    reminder_enabled = Column(Boolean, default=False)
    reminder_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "priority": self.priority,
            "status": self.status,
            "category": self.category,
            "reminder_enabled": self.reminder_enabled,
            "reminder_time": self.reminder_time.isoformat() if self.reminder_time else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
```

Continue to [SETUP_PART2.md](SETUP_PART2.md) for the remaining backend code, frontend setup, and browser extension...

---

## Quick Test

To verify backend is working:

```powershell
# In backend folder with venv activated
python main.py
```

You should see:
```
✓ Database initialized
🚀 Server started on http://0.0.0.0:8000
```

Open browser to `http://localhost:8000` - you should see:
```json
{
  "message": "Personal AI Assistant API",
  "version": "1.0.0",
  "status": "running"
}
```

Press `Ctrl+C` to stop the server.

---

**Next:** Continue with [SETUP_PART2.md](SETUP_PART2.md) for complete backend API implementation, frontend setup, and browser extension.
