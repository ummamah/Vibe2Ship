"""
Focus Session schemas for the continuous Pomodoro timer.
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
from enum import Enum


class TimerPhase(str, Enum):
    IDLE = "idle"
    FOCUS = "focus"
    SHORT_BREAK = "short_break"
    LONG_BREAK = "long_break"
    PAUSED = "paused"
    COMPLETED = "completed"


class FocusSessionConfig(BaseModel):
    """Configuration for a focus session cycle."""
    focus_duration_minutes: int = Field(default=25, ge=5, le=120)
    short_break_minutes: int = Field(default=5, ge=1, le=30)
    long_break_minutes: int = Field(default=15, ge=5, le=60)
    sessions_before_long_break: int = Field(default=4, ge=2, le=8)
    auto_start_break: bool = Field(default=True)
    auto_start_next_focus: bool = Field(default=True)
    sound_enabled: bool = Field(default=True)


class FocusSessionInput(BaseModel):
    """Request to start a new focus session cycle."""
    topic: str = Field(..., min_length=1, max_length=200, description="What you're focusing on")
    task_id: Optional[str] = Field(default=None, description="Link to an existing task if applicable")
    config: FocusSessionConfig = Field(default_factory=FocusSessionConfig)


class TimerState(BaseModel):
    """Current state of the timer."""
    phase: TimerPhase = TimerPhase.IDLE
    time_remaining_seconds: int = 0
    total_seconds: int = 0
    progress_percentage: int = 0
    session_number: int = 1  # Which pomodoro session this is (e.g., 1st, 2nd, 3rd)
    topic: str = ""
    is_active: bool = False
    is_paused: bool = False


class SingleSession(BaseModel):
    """Record of a single completed focus or break session."""
    session_type: str  # "focus" or "break"
    start_time: datetime
    end_time: datetime
    planned_duration: int  # in seconds
    actual_duration: int  # in seconds
    topic: str
    completed: bool
    skipped: bool = False


class FocusSessionResult(BaseModel):
    """Complete record of a focus session cycle."""
    session_id: str
    topic: str
    config: FocusSessionConfig
    started_at: datetime
    ended_at: Optional[datetime] = None
    sessions: List[SingleSession]
    total_focus_time_seconds: int
    total_break_time_seconds: int
    interruptions: int = 0
    completed: bool = False
    cycle_count: int = 1


class TimerAction(BaseModel):
    """Action to perform on the timer."""
    action: str  # "start", "pause", "resume", "stop", "skip"
    topic: Optional[str] = None


class FocusAnalytics(BaseModel):
    """Analytics data for focus sessions."""
    total_sessions: int
    total_focus_hours: float
    average_session_length: float
    completion_rate: float
    most_active_topic: str
    daily_sessions: List[dict]
    weekly_trend: List[dict]