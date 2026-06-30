"""
Task Planner API Routes
Handles autonomous task planning and scheduling
"""

from fastapi import APIRouter, HTTPException, Body
from datetime import datetime
from typing import Optional

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schemas.planner import (
    TaskPlanRequest, PlanResponse, 
    GenerateSubtasksRequest, SubTaskListResponse, AIPlanResponse, DirectPlanRequest
)
from services.planner import get_planner_service, plans_db
from services.llm_service import get_llm_service
from routers.tasks import tasks_db

router = APIRouter(prefix="/tasks")


@router.post("/{task_id}/plan")
async def create_task_plan(task_id: str, request: TaskPlanRequest):
    """
    Generate an autonomous plan for a task by breaking it into daily subtasks.
    
    The AI will distribute subtasks across days, respecting:
    - Daily hour limits
    - Heavy/light day preferences
    - Dependencies between subtasks
    - Buffer time before deadline
    """
    planner = get_planner_service()
    
    try:
        plan = planner.generate_plan(request, task_id=task_id)
        return PlanResponse(plan=plan)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate plan: {str(e)}")


@router.post("/{task_id}/ai-plan", response_model=AIPlanResponse)
async def generate_ai_plan(
    task_id: str,
    request: GenerateSubtasksRequest = Body(default=None)
):
    """
    Complete AI planning pipeline:
    1. Fetch task from tasks_db
    2. Generate subtasks using LLM (with specific names)
    3. Generate plan using PlannerService (time-aware)
    4. Return combined response with plan and subtasks
    """
    # 1. Fetch task
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = tasks_db[task_id]
    
    # Use request or defaults
    if request is None:
        request = GenerateSubtasksRequest()
    
    # Get deadline_time from task or default to 17:00
    deadline_time = task.get("deadline_time", "17:00")
    
    # 2. Generate subtasks via LLM (with specific chapter/topic names)
    llm_service = get_llm_service()
    
    try:
        subtasks = await llm_service.generate_subtasks(
            title=task.get("title", "Untitled Task"),
            description=task.get("description", ""),
            deadline=task.get("deadline"),
            available_hours_per_day=request.available_hours_per_day,
            preferences=request.preferences
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate subtasks: {str(e)}")
    
    # 3. Generate plan using planner service (time-aware with hour boundaries)
    planner = get_planner_service()
    
    plan_request = TaskPlanRequest(
        title=task.get("title", "Untitled Task"),
        description=task.get("description", ""),
        deadline=task.get("deadline"),
        deadline_time=deadline_time,
        start_date=datetime.now(),
        subtasks=subtasks,
        available_hours_per_day=request.available_hours_per_day,
        preferences=request.preferences,
        include_buffer=True
    )
    
    try:
        plan = planner.generate_plan(plan_request, task_id=task_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate plan: {str(e)}")
    
    # 4. Return combined response
    return AIPlanResponse(plan=plan, subtasks=subtasks)


@router.get("/{task_id}/plan")
async def get_task_plan(task_id: str):
    """
    Retrieve an existing plan for a task (if any has been generated).
    """
    for plan_id, plan in plans_db.items():
        if plan.task_id == task_id:
            return PlanResponse(plan=plan)
    
    raise HTTPException(status_code=404, detail="No plan found for this task")


# Direct plan generation endpoint (no pre-existing task required)
@router.post("/planner/generate", response_model=AIPlanResponse)
async def generate_plan_direct(request: DirectPlanRequest):
    """
    Generate a full AI plan from a task description.
    Creates task, generates subtasks (LLM + fallback), and returns plan.
    """
    import uuid
    from routers.tasks import tasks_db
    
    # 1. Create task in tasks_db
    task_id = str(uuid.uuid4())
    task_data = {
        "id": task_id,
        "title": request.title,
        "description": request.description,
        "deadline": request.deadline,
        "deadline_time": "17:00",  # Default to 5 PM
        "created_at": datetime.now(),
        "user_id": "default",
        "status": "have_to_start"
    }
    tasks_db[task_id] = task_data
    
    # 2. Generate subtasks (LLM with fallback) - specific chapter names
    llm_service = get_llm_service()
    try:
        subtasks = await llm_service.generate_subtasks(
            title=request.title,
            description=request.description,
            deadline=request.deadline,
            available_hours_per_day=request.available_hours_per_day,
            preferences=request.preferences
        )
    except Exception:
        subtasks = []
    
    if not subtasks:
        # Deterministic fallback
        planner = get_planner_service()
        subtasks = planner.generate_fallback_subtasks(
            request.title, request.description, request.deadline,
            request.available_hours_per_day, request.preferences
        )
    
    # 3. Generate plan (time-aware)
    plan_request = TaskPlanRequest(
        title=request.title,
        description=request.description,
        deadline=request.deadline,
        deadline_time="17:00",
        start_date=datetime.now(),
        subtasks=subtasks,
        available_hours_per_day=request.available_hours_per_day,
        preferences=request.preferences,
        include_buffer=request.include_buffer
    )
    
    planner = get_planner_service()
    plan = planner.generate_plan(plan_request, task_id=task_id)
    
    return AIPlanResponse(plan=plan, subtasks=subtasks)