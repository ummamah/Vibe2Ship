"""
Focus Timer API Routes
Handles continuous Pomodoro timer operations
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
from typing import Optional

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schemas.focus import FocusSessionInput, TimerAction, FocusSessionResult, TimerState
from services.timer import get_timer_service

router = APIRouter(prefix="/focus")
timer_service = get_timer_service()


@router.post("/start")
async def start_focus_session(input_data: FocusSessionInput):
    """Start a new focus session with continuous Pomodoro configuration."""
    state = timer_service.start_session(input_data)
    return {
        "success": True,
        "session_id": timer_service.active_session_id,
        "state": state,
        "message": "Focus session started! Timer will auto-transition between phases."
    }


@router.get("/status")
async def get_timer_status():
    """Get the current timer status and remaining time."""
    if not timer_service.active_session_id:
        raise HTTPException(status_code=400, detail="No active focus session")
    
    state = timer_service.get_status()
    return {
        "active": True,
        "session_id": timer_service.active_session_id,
        "state": state,
        "completed_sessions": len(timer_service.sessions_completed),
        "total_cycle_time_seconds": sum(s.total_seconds for s in timer_service.sessions_completed)
    }


@router.post("/action")
async def perform_timer_action(action: TimerAction):
    """Perform an action on the timer: pause, resume, stop, skip."""
    if action.action == "pause":
        state = timer_service.pause()
        return {"message": "Timer paused", "state": state}
    
    elif action.action == "resume":
        state = timer_service.resume()
        return {"message": "Timer resumed", "state": state}
    
    elif action.action == "stop":
        result = timer_service.stop()
        return {
            "message": "Session stopped",
            "result": result
        }
    
    elif action.action == "skip":
        state = timer_service.skip_phase()
        return {"message": "Phase skipped", "state": state}
    
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action.action}")


@router.get("/analytics")
async def get_focus_analytics():
    """Get analytics data for all completed focus sessions."""
    analytics = timer_service.get_analytics()
    return {
        "analytics": analytics,
        "generated_at": datetime.now().isoformat()
    }


@router.get("/history")
async def get_session_history(limit: int = 10):
    """Get history of completed focus sessions."""
    from services.timer import session_history
    return {
        "history": session_history[-limit:] if session_history else [],
        "count": len(session_history)
    }