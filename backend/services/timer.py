"""
Continuous Pomodoro Timer Service

Manages timer state and auto-transitions between focus and break phases.
Uses elapsed time calculation instead of background threads for reliability.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, List
from schemas.focus import (
    TimerPhase, TimerState, FocusSessionConfig, FocusSessionResult, 
    SingleSession, FocusAnalytics, FocusSessionInput
)
import uuid

# In-memory storage
timer_state: Dict[str, dict] = {}
session_history: List[dict] = []
active_sessions: Dict[str, FocusSessionResult] = {}


class FocusTimerService:
    def __init__(self):
        self.active_session_id: Optional[str] = None
        self.current_state: TimerState = TimerState()
        self.config: FocusSessionConfig = FocusSessionConfig()
        self.start_time: Optional[datetime] = None
        self.pause_start: Optional[datetime] = None
        self.total_paused_seconds: int = 0
        self.session_start_time: Optional[datetime] = None
        self.sessions_completed: List[SingleSession] = []
    
    def start_session(self, input_data: FocusSessionInput) -> TimerState:
        """Start a new focus session cycle."""
        self.active_session_id = str(uuid.uuid4())
        self.config = input_data.config
        self.start_time = datetime.now()
        self.pause_start = None
        self.total_paused_seconds = 0
        self.sessions_completed = []
        
        # Start with focus phase
        self.current_state = TimerState(
            phase=TimerPhase.FOCUS,
            time_remaining_seconds=self.config.focus_duration_minutes * 60,
            total_seconds=self.config.focus_duration_minutes * 60,
            progress_percentage=0,
            session_number=1,
            topic=input_data.topic,
            is_active=True,
            is_paused=False
        )
        
        self.session_start_time = datetime.now()
        
        return self.current_state
    
    def get_status(self) -> TimerState:
        """Get current timer status based on elapsed time."""
        if not self.current_state.is_active or self.current_state.is_paused:
            return self.current_state
        
        # Calculate elapsed time considering pauses
        elapsed = (datetime.now() - self.session_start_time).total_seconds()
        elapsed -= self.total_paused_seconds
        
        time_remaining = max(0, self.current_state.total_seconds - int(elapsed))
        progress = int(100 - (time_remaining / self.current_state.total_seconds * 100))
        
        # Update state
        self.current_state.time_remaining_seconds = time_remaining
        self.current_state.progress_percentage = min(100, progress)
        
        # Auto-transition when timer hits zero
        if time_remaining <= 0:
            return self._auto_transition()
        
        return self.current_state
    
    def _auto_transition(self) -> TimerState:
        """Automatically transition to the next phase."""
        current_phase = self.current_state.phase
        current_session = self.current_state.session_number
        
        # Log the completed session
        completed_session = SingleSession(
            session_type="focus" if current_phase == TimerPhase.FOCUS else "break",
            start_time=self.session_start_time,
            end_time=datetime.now(),
            planned_duration=self.current_state.total_seconds,
            actual_duration=self.current_state.total_seconds,
            topic=self.current_state.topic,
            completed=True
        )
        self.sessions_completed.append(completed_session)
        
        # Determine next phase
        if current_phase == TimerPhase.FOCUS:
            # After focus, go to break
            if current_session % self.config.sessions_before_long_break == 0:
                # Long break after N sessions
                next_phase = TimerPhase.LONG_BREAK
                duration = self.config.long_break_minutes * 60
                is_long_break = True
            else:
                next_phase = TimerPhase.SHORT_BREAK
                duration = self.config.short_break_minutes * 60
                is_long_break = False
        else:
            # After break, go to next focus session
            next_phase = TimerPhase.FOCUS
            duration = self.config.focus_duration_minutes * 60
            current_session += 1
        
        self.current_state = TimerState(
            phase=next_phase,
            time_remaining_seconds=duration,
            total_seconds=duration,
            progress_percentage=0,
            session_number=current_session,
            topic=self.current_state.topic,
            is_active=True,
            is_paused=False
        )
        self.session_start_time = datetime.now()
        self.total_paused_seconds = 0
        
        return self.current_state
    
    def pause(self) -> TimerState:
        """Pause the current timer."""
        if self.current_state.is_active and not self.current_state.is_paused:
            self.pause_start = datetime.now()
            self.current_state.is_paused = True
        return self.current_state
    
    def resume(self) -> TimerState:
        """Resume a paused timer."""
        if self.current_state.is_active and self.current_state.is_paused:
            if self.pause_start:
                paused_time = (datetime.now() - self.pause_start).total_seconds()
                self.total_paused_seconds += int(paused_time)
                self.pause_start = None
            self.current_state.is_paused = False
        return self.current_state
    
    def stop(self) -> Optional[FocusSessionResult]:
        """Stop the current session and return results."""
        if not self.active_session_id:
            return None
        
        # Log the current (incomplete) session
        if self.current_state.phase == TimerPhase.FOCUS:
            elapsed = (datetime.now() - self.session_start_time).total_seconds() - self.total_paused_seconds
            actual_duration = min(elapsed, self.current_state.total_seconds)
            
            incomplete_session = SingleSession(
                session_type="focus",
                start_time=self.session_start_time,
                end_time=datetime.now(),
                planned_duration=self.current_state.total_seconds,
                actual_duration=int(actual_duration),
                topic=self.current_state.topic,
                completed=False
            )
            self.sessions_completed.append(incomplete_session)
        
        # Build result
        focus_time = sum(s.actual_duration for s in self.sessions_completed if s.session_type == "focus")
        break_time = sum(s.actual_duration for s in self.sessions_completed if s.session_type == "break")
        completed_count = sum(1 for s in self.sessions_completed if s.completed)
        
        result = FocusSessionResult(
            session_id=self.active_session_id,
            topic=self.current_state.topic,
            config=self.config,
            started_at=self.start_time,
            ended_at=datetime.now(),
            sessions=self.sessions_completed,
            total_focus_time_seconds=int(focus_time),
            total_break_time_seconds=int(break_time),
            completed=completed_count > 0,
            cycle_count=completed_count
        )
        
        # Store in history
        session_history.append(result.dict())
        
        # Reset state
        self.current_state = TimerState()
        self.active_session_id = None
        
        return result
    
    def skip_phase(self) -> TimerState:
        """Skip the current phase and move to the next."""
        # Log as skipped
        skipped_session = SingleSession(
            session_type="focus" if self.current_state.phase == TimerPhase.FOCUS else "break",
            start_time=self.session_start_time,
            end_time=datetime.now(),
            planned_duration=self.current_state.total_seconds,
            actual_duration=int(self.current_state.total_seconds) - self.current_state.time_remaining_seconds,
            topic=self.current_state.topic,
            completed=False,
            skipped=True
        )
        self.sessions_completed.append(skipped_session)
        
        return self._auto_transition()
    
    def get_analytics(self) -> FocusAnalytics:
        """Get analytics for completed sessions."""
        if not session_history:
            return FocusAnalytics(
                total_sessions=0,
                total_focus_hours=0.0,
                average_session_length=0.0,
                completion_rate=0.0,
                most_active_topic="",
                daily_sessions=[],
                weekly_trend=[]
            )
        
        total_sessions = sum(s["cycle_count"] for s in session_history)
        total_focus_hours = sum(s["total_focus_time_seconds"] for s in session_history) / 3600
        total_planned = sum(sum(sess["planned_duration"] for sess in s["sessions"]) for s in session_history)
        total_actual = sum(sum(sess["actual_duration"] for sess in s["sessions"] if sess["completed"]) for s in session_history)
        
        # Get most active topic
        topic_counts = {}
        for s in session_history:
            topic = s["topic"]
            topic_counts[topic] = topic_counts.get(topic, 0) + s["total_focus_time_seconds"]
        most_active_topic = max(topic_counts, key=topic_counts.get) if topic_counts else ""
        
        # Calculate completion rate
        completion_rate = (total_actual / total_planned * 100) if total_planned > 0 else 0
        average_length = sum(s["total_focus_time_seconds"] / max(1, s["cycle_count"]) for s in session_history) / len(session_history)
        
        return FocusAnalytics(
            total_sessions=total_sessions,
            total_focus_hours=round(total_focus_hours, 2),
            average_session_length=round(average_length / 60, 2),
            completion_rate=round(completion_rate, 2),
            most_active_topic=most_active_topic,
            daily_sessions=[],
            weekly_trend=[]
        )


_timer_service = None


def get_timer_service() -> FocusTimerService:
    global _timer_service
    if _timer_service is None:
        _timer_service = FocusTimerService()
    return _timer_service