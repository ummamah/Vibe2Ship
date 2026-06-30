"""
Task API Routes
Handles CRUD for tasks, AI prioritization, clarifying questions, and reminders
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from uuid import uuid4

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schemas.task import TaskCreate, TaskResponse, TaskStatus, ClarifyEffortRequest, StatusUpdate
from services.prioritizer import get_prioritizer, tasks_db

router = APIRouter(prefix="/tasks")


def _seed_tasks():
    if tasks_db:
        return
    demo_tasks = [
        {
            "id": str(uuid4()),
            "title": "Complete React assignment",
            "description": "Finish the dashboard component with charts and data visualization",
            "deadline": datetime(2026, 6, 27, 14, 0),
            "duration_minutes": 120,
            "priority": None,
            "category": "Study",
            "tags": ["coding", "frontend", "urgent"],
            "energy_required": "high",
            "status": "have_to_start",
            "created_at": datetime.now(),
            "user_id": "default",
            "is_skippable": False,
            "importance": 80,
            "consequences_score": 70
        },
        {
            "id": str(uuid4()),
            "title": "Study for Math exam",
            "description": "Review chapters 3-5 and solve practice problems",
            "deadline": datetime(2026, 6, 28, 9, 0),
            "duration_minutes": 180,
            "priority": None,
            "category": "Study",
            "tags": ["exam", "math", "important"],
            "energy_required": "high",
            "status": "have_to_start",
            "created_at": datetime.now(),
            "user_id": "default",
            "is_skippable": False,
            "importance": 90,
            "consequences_score": 85
        },
        {
            "id": str(uuid4()),
            "title": "Team meeting with client",
            "description": "Present project progress and gather feedback",
            "deadline": datetime(2026, 6, 26, 16, 0),
            "duration_minutes": 60,
            "priority": None,
            "category": "Work",
            "tags": ["meeting", "client"],
            "energy_required": "medium",
            "status": "working_on_it",
            "created_at": datetime.now(),
            "user_id": "default",
            "is_skippable": False,
            "importance": 70,
            "consequences_score": 60
        },
        {
            "id": str(uuid4()),
            "title": "Grocery shopping",
            "description": "Buy ingredients for the week",
            "deadline": None,
            "duration_minutes": 45,
            "priority": None,
            "category": "Personal",
            "tags": ["errands"],
            "energy_required": "low",
            "status": "have_to_start",
            "created_at": datetime.now(),
            "user_id": "default",
            "is_skippable": True,
            "importance": 30,
            "consequences_score": 20
        },
        {
            "id": str(uuid4()),
            "title": "Write blog post",
            "description": "Draft article about AI productivity tools",
            "deadline": datetime(2026, 6, 30, 12, 0),
            "duration_minutes": 90,
            "priority": None,
            "category": "Creative",
            "tags": ["writing", "side-project"],
            "energy_required": "medium",
            "status": "have_to_start",
            "created_at": datetime.now(),
            "user_id": "default",
            "is_skippable": True,
            "importance": 50,
            "consequences_score": 30
        }
    ]
    for task in demo_tasks:
        tasks_db[task["id"]] = task


_seed_tasks()


@router.get("/")
async def get_tasks():
    """Get all tasks"""
    return {"tasks": list(tasks_db.values()), "count": len(tasks_db)}


@router.post("/")
async def create_task(task: TaskCreate):
    """Create a new task with AI prioritization"""
    task_id = str(uuid4())
    task_data = task.model_dump()
    task_data["id"] = task_id
    task_data["created_at"] = datetime.now()

    if not task_data.get("status"):
        task_data["status"] = TaskStatus.HAVE_TO_START.value

    tasks_db[task_id] = task_data

    prioritizer = get_prioritizer()
    task_obj = TaskCreate(**task_data)
    analysis = await prioritizer.analyze_single_task(task_obj)

    tasks_db[task_id]["ai_analysis"] = analysis["ai_analysis"]
    tasks_db[task_id]["overall_score"] = analysis["ai_analysis"].overall_priority_score
    tasks_db[task_id]["is_critical"] = analysis["is_critical"]

    return {"success": True, "task": tasks_db[task_id]}


@router.get("/prioritized")
async def get_prioritized_tasks():
    """Get all tasks with AI priority analysis sorted by importance"""
    try:
        tasks = list(tasks_db.values())
        task_id_to_meta = {t["id"]: {"is_critical": t.get("is_critical", False), "overall_score": t.get("overall_score", 0.0), "ai_analysis": t.get("ai_analysis")} for t in tasks if "id" in t}

        task_objects = []
        for t in tasks:
            task_data = {k: v for k, v in t.items() if k in TaskCreate.model_fields}
            tc = TaskCreate(**task_data)
            object.__setattr__(tc, 'id', t.get("id"))
            task_objects.append(tc)

        prioritized = await get_prioritizer().prioritize_tasks(task_objects)

        for ptask in prioritized:
            tid = ptask.get("id")
            if tid and tid in task_id_to_meta:
                meta = task_id_to_meta[tid]
                ptask["is_critical"] = meta["is_critical"]
                ptask["overall_score"] = meta["overall_score"]
                if meta["ai_analysis"]:
                    ptask["ai_analysis"] = meta["ai_analysis"]

        return {
            "tasks": prioritized,
            "count": len(prioritized),
            "generated_at": datetime.now().isoformat()
        }
    except Exception as e:
        import traceback
        print(f"[PRIORITIZE FULL ERROR]: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Prioritization error: {type(e).__name__}: {e}")


@router.post("/analyze")
async def analyze_task(task: TaskCreate):
    """Analyze a single task and get AI insights"""
    prioritizer = get_prioritizer()
    analysis = await prioritizer.analyze_single_task(task)

    return {
        "analysis": analysis["ai_analysis"],
        "scores": {
            "urgency": analysis["urgency"],
            "importance": analysis["importance"],
            "effort": analysis["effort"]
        }
    }


@router.get("/clarifying-questions")
async def get_clarifying_questions():
    """Get clarifying questions for effort estimation"""
    prioritizer = get_prioritizer()
    return {
        "questions": [
            {
                "question": q.question,
                "options": q.options,
                "key": q.key
            } for q in prioritizer.CLARIFYING_QUESTIONS
        ]
    }


@router.post("/estimate-effort")
async def estimate_effort(request: ClarifyEffortRequest):
    """Estimate effort based on clarifying question answers"""
    prioritizer = get_prioritizer()
    result = prioritizer.estimate_effort_from_questions(
        title=request.title,
        description=request.description,
        category=request.category,
        is_study_related=request.is_study_related,
        needs_resources=request.needs_resources,
        complexity_hint=request.complexity_hint
    )
    return result


@router.get("/{task_id}/reminder-schedule")
async def get_reminder_schedule(task_id: str):
    """Get reminder schedule for a specific task"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")

    task = tasks_db[task_id]
    prioritizer = get_prioritizer()

    schedule = prioritizer.calculate_reminder_schedule(
        task_id=task_id,
        deadline=task.get("deadline"),
        status=task.get("status", "have_to_start"),
        is_skippable=task.get("is_skippable", True),
        duration_minutes=task.get("duration_minutes", 30)
    )

    return schedule


@router.post("/{task_id}/check-alarm")
async def check_alarm(task_id: str):
    """Check if alarm should trigger for a non-skippable task"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")

    task = tasks_db[task_id]
    prioritizer = get_prioritizer()

    schedule = prioritizer.calculate_reminder_schedule(
        task_id=task_id,
        deadline=task.get("deadline"),
        status=task.get("status", "have_to_start"),
        is_skippable=task.get("is_skippable", True),
        duration_minutes=task.get("duration_minutes", 30)
    )

    return {
        "alarm_triggered": schedule["alarm_triggered"],
        "is_critical": schedule["is_critical"],
        "message": "ALARM: Non-skippable task with imminent deadline!" if schedule["alarm_triggered"] else "No alarm needed"
    }


@router.patch("/{task_id}/status")
async def update_task_status(task_id: str, update: StatusUpdate):
    """Update task status (have_to_start, working_on_it, completed)"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")

    tasks_db[task_id]["status"] = update.status.value

    if update.status == TaskStatus.COMPLETED:
        tasks_db[task_id]["completed_at"] = datetime.now().isoformat()

    return {"success": True, "task": tasks_db[task_id]}


@router.get("/check-notifications") 
async def check_notifications():
    """Check for tasks needing reminders (24h before deadline) and critical tasks (12h)"""
    now = datetime.now()
    notifications = []
    
    for task_id, task in tasks_db.items():
        deadline = task.get("deadline")
        status = task.get("status", "have_to_start")
        is_critical = task.get("is_critical", False)
        
        if not deadline or status == "completed" or status == "overdue":
            continue
            
        hours_until = (deadline - now).total_seconds() / 3600
        
        # All tasks: 24h before deadline
        if 0 < hours_until <= 24:
            notifications.append({
                "task_id": task_id,
                "type": "reminder",
                "message": f"'{task['title']}' is due in {int(hours_until)} hours",
                "hours_until": hours_until,
                "is_critical": is_critical,
                "alarm": False
            })
        
        # Critical tasks: 12h before deadline + alarm trigger
        if is_critical and 0 < hours_until <= 12:
            notifications.append({
                "task_id": task_id,
                "type": "critical",
                "message": f"CRITICAL: '{task['title']}' is due in {int(hours_until)} hours!",
                "hours_until": hours_until,
                "is_critical": True,
                "alarm": True
            })
    
    return {
        "notifications": notifications,
        "count": len(notifications),
        "checked_at": now.isoformat()
    }


@router.post("/cleanup")
async def cleanup_tasks():
    """Cleanup expired task divisions and mark overdue tasks"""
    now = datetime.now()
    deleted_divisions = 0
    overdue_tasks = 0
    
    # TODO: Clean up task divisions from localStorage (handled on client)
    # For now, we'll just mark parent tasks as overdue
    
    for task_id, task in tasks_db.items():
        deadline = task.get("deadline")
        status = task.get("status")
        is_critical = task.get("is_critical", False)
        
        if not deadline or status == "completed" or status == "overdue":
            continue
            
        if deadline < now:
            if not is_critical:
                # Non-critical tasks become overdue
                task["status"] = TaskStatus.OVERDUE.value
                task["overdue_at"] = now.isoformat()
                overdue_tasks += 1
            else:
                # Critical tasks remain as-is or get special handling
                pass
    
    return {
        "deleted_divisions": deleted_divisions,
        "overdue_tasks": overdue_tasks,
        "cleaned_at": now.isoformat()
    }


@router.delete("/{task_id}")
async def delete_task(task_id: str):
    """Delete a task"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")

    del tasks_db[task_id]
    return {"success": True, "message": "Task deleted"}