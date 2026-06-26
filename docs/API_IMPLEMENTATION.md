# Backend API Implementation

This document contains the complete backend API code templates.

## API Routes

### 1. Tasks API (`backend/app/api/tasks.py`)

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.models.task import Task

router =APIRouter()

# Pydantic schemas
class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    due_date: datetime | None = None
    priority: str = "medium"
    category: str | None = None
    reminder_enabled: bool = False
    reminder_time: datetime | None = None

class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    due_date: datetime | None = None
    priority: str | None = None
    status: str | None = None
    category: str | None = None
    reminder_enabled: bool | None = None
    reminder_time: datetime | None = None

@router.post("/", response_model=dict)
async def create_task(task: TaskCreate, db: AsyncSession = Depends(get_db)):
    """Create a new task"""
    db_task = Task(**task.model_dump())
    db.add(db_task)
    await db.commit()
    await db.refresh(db_task)
    return db_task.to_dict()

@router.get("/", response_model=List[dict])
async def get_tasks(
    status: str | None = None,
    category: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    """Get all tasks with optional filters"""
    query = select(Task)
    
    if status:
        query = query.where(Task.status == status)
    if category:
        query = query.where(Task.category == category)
    
    result = await db.execute(query)
    tasks = result.scalars().all()
    return [task.to_dict() for task in tasks]

@router.get("/{task_id}", response_model=dict)
async def get_task(task_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific task"""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return task.to_dict()

@router.put("/{task_id}", response_model=dict)
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a task"""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update fields
    for field, value in task_update.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    
    task.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(task)
    
    return task.to_dict()

@router.delete("/{task_id}")
async def delete_task(task_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a task"""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.delete(task)
    await db.commit()
    
    return {"message": "Task deleted successfully"}
```

### 2. Schedule API (`backend/app/api/schedule.py`)

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.services.llm import LLMService

router = APIRouter()

class Goal(BaseModel):
    title: str
    description: str
    deadline: datetime
    priority: str = "medium"

class ScheduleRequest(BaseModel):
    goal: Goal
    available_hours_per_day: int = 2
    preferred_times: List[str] = []  # e.g., ["morning", "evening"]

@router.post("/generate")
async def generate_schedule(
    request: ScheduleRequest,
    db: AsyncSession = Depends(get_db)
):
    """Generate a schedule from a goal using AI"""
    llm_service = LLMService()
    
    prompt = f"""
You are a productivity assistant. Break down this goal into a realistic, actionable schedule.

Goal: {request.goal.title}
Description: {request.goal.description}
Deadline: {request.goal.deadline}
Available time: {request.available_hours_per_day} hours per day
Preferred times: {', '.join(request.preferred_times)}

Create a detailed schedule with:
1. Weekly milestones
2. Daily tasks
3. Estimated time for each task
4. Priority levels

Format as JSON:
{{
  "milestones": [
    {{
      "week": 1,
      "title": "milestone title",
      "tasks": [
        {{
          "title": "task title",
          "description": "task description",
          "estimated_hours": 2,
          "priority": "high",
          "suggested_day": "Monday"
        }}
      ]
    }}
  ]
}}
"""
    
    try:
        schedule = await llm_service.generate_schedule(prompt)
        return {
            "goal": request.goal.model_dump(),
            "schedule": schedule,
            "generated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/upcoming")
async def get_upcoming_tasks(
    days: int = 7,
    db: AsyncSession = Depends(get_db)
):
    """Get upcoming scheduled tasks"""
    # Implementation would query tasks with due dates in next N days
    pass
```

### 3. Study API (`backend/app/api/study.py`)

```python
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List
import os
import shutil

from app.core.database import get_db
from app.core.config import settings
from app.services.rag import RAGService
from app.utils.file_processor import FileProcessor

router = APIRouter()

class ChatMessage(BaseModel):
    folder_id: str
    message: str
    conversation_id: str | None = None

class ChatResponse(BaseModel):
    response: str
    sources: List[dict]
    conversation_id: str

@router.post("/folders")
async def create_folder(
    name: str = Form(...),
    description: str = Form(""),
    db: AsyncSession = Depends(get_db)
):
    """Create a new study folder"""
    # In real implementation, save to database
    folder_id = name.lower().replace(" ", "_")
    folder_path = os.path.join("data/uploads", folder_id)
    os.makedirs(folder_path, exist_ok=True)
    
    return {
        "folder_id": folder_id,
        "name": name,
        "description": description,
        "path": folder_path
    }

@router.get("/folders")
async def list_folders(db: AsyncSession = Depends(get_db)):
    """List all study folders"""
    uploads_dir = "data/uploads"
    if not os.path.exists(uploads_dir):
        return []
    
    folders = []
    for folder_name in os.listdir(uploads_dir):
        folder_path = os.path.join(uploads_dir, folder_name)
        if os.path.isdir(folder_path):
            file_count = len([f for f in os.listdir(folder_path) if os.path.isfile(os.path.join(folder_path, f))])
            folders.append({
                "folder_id": folder_name,
                "name": folder_name.replace("_", " ").title(),
                "file_count": file_count,
                "path": folder_path
            })
    
    return folders

@router.post("/upload")
async def upload_file(
    folder_id: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload a file to a folder and process it"""
    # Validate file extension
    file_ext = file.filename.split(".")[-1].lower()
    allowed_exts = settings.ALLOWED_EXTENSIONS.split(",")
    
    if file_ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"File type .{file_ext} not allowed. Allowed: {allowed_exts}"
        )
    
    # Save file
    folder_path = os.path.join("data/uploads", folder_id)
    os.makedirs(folder_path, exist_ok=True)
    
    file_path = os.path.join(folder_path, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Process file and create embeddings
    try:
        processor = FileProcessor()
        chunks = await processor.process_file(file_path, file_ext)
        
        rag_service = RAGService()
        await rag_service.add_documents(folder_id, chunks, file.filename)
        
        return {
            "filename": file.filename,
            "folder_id": folder_id,
            "chunks_created": len(chunks),
            "status": "processed"
        }
    except Exception as e:
        # Clean up file if processing fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}")

@router.post("/chat", response_model=ChatResponse)
async def chat_with_documents(
    chat: ChatMessage,
    db: AsyncSession = Depends(get_db)
):
    """Chat with documents in a folder"""
    try:
        rag_service = RAGService()
        response, sources = await rag_service.query(
            folder_id=chat.folder_id,
            question=chat.message,
            conversation_id=chat.conversation_id
        )
        
        return ChatResponse(
            response=response,
            sources=sources,
            conversation_id=chat.conversation_id or "new_conversation"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/folders/{folder_id}/files")
async def list_folder_files(folder_id: str):
    """List all files in a folder"""
    folder_path = os.path.join("data/uploads", folder_id)
    
    if not os.path.exists(folder_path):
        raise HTTPException(status_code=404, detail="Folder not found")
    
    files = []
    for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)
        if os.path.isfile(file_path):
            stat = os.stat(file_path)
            files.append({
                "filename": filename,
                "size": stat.st_size,
                "uploaded_at": datetime.fromtimestamp(stat.st_ctime).isoformat()
            })
    
    return files
```

### 4. Tracking API (`backend/app/api/tracking.py`)

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List
from datetime import datetime, timedelta

from app.core.database import get_db

router = APIRouter()

class ScreenTimeEntry(BaseModel):
    url: str
    title: str
    duration: int  # seconds
    timestamp: datetime

class ScreenTimeStats(BaseModel):
    total_time: int
    by_domain: dict
    by_hour: dict

@router.post("/screentime")
async def log_screen_time(
    entries: List[ScreenTimeEntry],
    db: AsyncSession = Depends(get_db)
):
    """Log screen time entries from browser extension"""
    # In real implementation, save to database
    # For now, just acknowledge
    return {"logged": len(entries), "status": "success"}

@router.get("/screentime/stats")
async def get_screen_time_stats(
    days: int = 7,
    db: AsyncSession = Depends(get_db)
) -> ScreenTimeStats:
    """Get screen time statistics"""
    # Mock implementation
    return ScreenTimeStats(
        total_time=3600 * 20,  # 20 hours
        by_domain={
            "github.com": 7200,
            "youtube.com": 10800,
            "stackoverflow.com": 5400
        },
        by_hour={
            "14": 3600,
            "15": 5400,
            "20": 7200
        }
    )

@router.get("/screentime/warning")
async def check_screen_time_warning(db: AsyncSession = Depends(get_db)):
    """Check if user exceeded screen time limits"""
    # Implementation would check current day's usage
    # Return warning if exceeded threshold
    pass
```

Continue to next file...
