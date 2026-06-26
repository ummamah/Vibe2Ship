"""
Task Planner schemas for autonomous task breakdown and scheduling.
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
from enum import Enum


class SubTaskType(str, Enum):
    READING = "reading"
    WRITING = "writing"
    PRACTICE = "practice"
    RESEARCH = "research"
    REVIEW = "review"
    MEMORIZATION = "memorization"
    CREATION = "creation"
    ANALYSIS = "analysis"


class SubTask(BaseModel):
    """A single unit of work within a larger task."""
    name: str = Field(..., min_length=1, max_length=200, description="e.g., 'Read Chapters 1-2' or 'Solve Section A problems'")
    type: SubTaskType = Field(default=SubTaskType.READING)
    estimated_minutes: int = Field(default=60, ge=15, le=480, description="Estimated minutes for this subtask")
    dependencies: List[str] = Field(default_factory=list, description="Names of subtasks that must be completed before this one")


class UserPreferences(BaseModel):
    """User's daily schedule preferences for optimal task distribution."""
    heavy_days: List[str] = Field(default_factory=list, description="Days of week with more study time, e.g., ['Monday', 'Wednesday']")
    light_days: List[str] = Field(default_factory=list, description="Days of week with less study time, e.g., ['Friday']")
    preferred_time_start: str = Field(default="09:00", pattern="^([0-1][0-9]|2[0-3]):[0-5][0-9]$")
    preferred_time_end: str = Field(default="17:00", pattern="^([0-1][0-9]|2[0-3]):[0-5][0-9]$")
    max_daily_minutes: int = Field(default=180, ge=30, le=480)
    overlapping_tasks: bool = Field(default=False, description="Allow multiple subtasks to be assigned to the same day")

    class Config:
        json_schema_extra = {
            "example": {
                "heavy_days": ["Monday", "Wednesday"],
                "light_days": ["Friday"],
                "preferred_time_start": "09:00",
                "preferred_time_end": "17:00",
                "max_daily_minutes": 180,
                "overlapping_tasks": False
            }
        }


class TaskPlanRequest(BaseModel):
    """Request to generate an autonomous task plan from a high-level task."""
    title: str = Field(..., min_length=1, max_length=200, description="The overall task title")
    description: str = Field(default="", max_length=1000, description="Additional context about the task")
    deadline: datetime = Field(..., description="The deadline for the overall task")
    start_date: Optional[datetime] = Field(default=None, description="When to start (defaults to tomorrow). If in the past, it will be capped to today.")
    subtasks: List[SubTask] = Field(..., min_length=1, description="Breakdown of the task into individual units of work")
    available_hours_per_day: int = Field(default=3, ge=1, le=12, description="Average hours per day available for this task")
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    include_buffer: bool = Field(default=True, description="Include a buffer day for review/catch-up before the deadline")
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Math Exam Preparation",
                "description": "Study for the upcoming calculus final exam",
                "deadline": "2026-06-30T09:00:00",
                "available_hours_per_day": 3,
                "subtasks": [
                    {
                        "name": "Review Chapter 1 - Limits",
                        "type": "review",
                        "estimated_minutes": 90,
                        "dependencies": []
                    },
                    {
                        "name": "Review Chapter 2 - Derivatives",
                        "type": "review",
                        "estimated_minutes": 120,
                        "dependencies": ["Review Chapter 1 - Limits"]
                    }
                ],
                "preferences": {
                    "heavy_days": ["Monday", "Wednesday"],
                    "light_days": ["Friday"],
                    "max_daily_minutes": 180,
                    "overlapping_tasks": False
                }
            }
        }


class DailyChunk(BaseModel):
    """A single day's scheduled work."""
    date: datetime
    subtask_names: List[str]
    total_minutes: int
    notes: str = Field(default="", description="AI-generated note for the day, e.g., 'Focus day' or 'Light day' or 'Catch-up buffer'")
    is_buffer: bool = Field(default=False)
    is_milestone: bool = Field(default=False, description="True if this day completes a dependency chain")


class TaskPlan(BaseModel):
    """The generated plan for a task."""
    title: str
    task_id: Optional[str] = None
    overall_duration_days: int
    total_subtasks: int
    total_estimated_minutes: int
    start_date: datetime
    deadline: datetime
    daily_chunks: List[DailyChunk]
    insights: List[str] = Field(default_factory=list)
    created_at: datetime


class PlanResponse(BaseModel):
    """Wrapped response for a generated plan."""
    plan: TaskPlan