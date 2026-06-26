"""
Task Planner API Routes
Handles autonomous task planning and scheduling
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
from typing import Optional

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schemas.planner import TaskPlanRequest, PlanResponse
from services.planner import get_planner_service

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


@router.get("/{task_id}/plan")
async def get_task_plan(task_id: str):
    """
    Retrieve an existing plan for a task (if any has been generated).
    """
    from services.planner import plans_db
    
    for plan_id, plan in plans_db.items():
        if plan.task_id == task_id:
            return PlanResponse(plan=plan)
    
    raise HTTPException(status_code=404, detail="No plan found for this task")