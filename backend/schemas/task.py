from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class TaskStatus(str, Enum):
    HAVE_TO_START = "have_to_start"
    WORKING_ON_IT = "working_on_it"
    COMPLETED = "completed"
    DEFERRED = "deferred"


class TaskInput(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(default="", max_length=1000)
    deadline: Optional[datetime] = None
    duration_minutes: int = Field(default=30, ge=1, le=480)
    category: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    energy_required: str = Field(default="medium", pattern="^(low|medium|high)$")
    is_skippable: bool = Field(default=True)
    importance: int = Field(default=50, ge=0, le=100)
    consequences_score: int = Field(default=50, ge=0, le=100)


class ClarifyingQuestion(BaseModel):
    question: str
    options: List[str]
    key: str


class EffortEstimationResponse(BaseModel):
    estimated_minutes: int
    confidence: float
    energy_required: str
    reasoning: str


class ReminderSchedule(BaseModel):
    task_id: str
    reminders: List[dict]
    next_reminder: Optional[datetime]
    is_critical: bool
    alarm_triggered: bool


class AIPriorityAnalysis(BaseModel):
    urgency_score: float = Field(..., ge=0, le=100)
    importance_score: float = Field(..., ge=0, le=100)
    effort_score: float = Field(..., ge=0, le=100)
    consequences_score: float = Field(..., ge=0, le=100)
    overall_priority_score: float = Field(..., ge=0, le=100)
    reasoning: str
    suggested_order: int
    ai_insights: List[str]
    estimated_focus_blocks: int
    optimal_time_of_day: str
    reminder_schedule: ReminderSchedule


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    deadline: Optional[datetime] = None
    duration_minutes: int = 30
    category: Optional[str] = None
    tags: List[str] = []
    energy_required: str = "medium"
    is_skippable: bool = True
    importance: int = 50
    consequences_score: int = 50
    user_id: Optional[str] = "default"
    status: TaskStatus = TaskStatus.HAVE_TO_START


class TaskResponse(TaskCreate):
    id: str
    created_at: datetime
    ai_analysis: Optional[dict] = None
    overall_score: float = 0.0


class PriorityRequest(BaseModel):
    tasks: List[TaskCreate]
    user_context: Optional[dict] = None


class ClarifyEffortRequest(BaseModel):
    title: str
    description: str = ""
    category: Optional[str] = None
    is_study_related: bool = False
    needs_resources: bool = False
    complexity_hint: Optional[str] = None


class StatusUpdate(BaseModel):
    status: TaskStatus