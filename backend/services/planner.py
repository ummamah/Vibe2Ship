"""
Autonomous Task Planner Service

Plans how to complete a large task by breaking it into daily targets.
Distributes work evenly while respecting dependencies, user preferences, and deadlines.
"""

from datetime import datetime, timedelta
from typing import List, Optional
from schemas.planner import (
    TaskPlanRequest, TaskPlan, DailyChunk, SubTask, SubTaskType, UserPreferences
)

# In-memory storage for hackathon speed
plans_db: dict = {}


class TaskPlannerService:
    def __init__(self):
        pass

    def _day_name(self, date: datetime) -> str:
        """Get day name for a date."""
        return date.strftime("%A")

    def _is_heavy_day(self, date: datetime, preferences: UserPreferences) -> bool:
        """Check if the given date is a heavy day."""
        return self._day_name(date) in preferences.heavy_days

    def _is_light_day(self, date: datetime, preferences: UserPreferences) -> bool:
        """Check if the given date is a light day."""
        return self._day_name(date) in preferences.light_days

    def _get_daily_capacity(self, date: datetime, preferences: UserPreferences, base_hours: int) -> int:
        """Calculate how many minutes can be scheduled for a given day."""
        base_minutes = base_hours * 60
        
        if self._is_heavy_day(date, preferences):
            # Heavy days: up to 1.5x the base, capped at max_daily_minutes
            return min(int(base_minutes * 1.5), preferences.max_daily_minutes)
        elif self._is_light_day(date, preferences):
            # Light days: 0.5x the base
            return int(base_minutes * 0.5)
        else:
            # Normal day: base capacity, capped at max
            return min(base_minutes, preferences.max_daily_minutes)

    def _build_dependency_graph(self, subtasks: List[SubTask]) -> dict:
        """Build a graph of subtask dependencies."""
        graph = {st.name: set(st.dependencies) for st in subtasks}
        return graph

    def _topological_sort(self, subtasks: List[SubTask]) -> List[str]:
        """Sort subtasks by dependencies (items with no deps first)."""
        graph = self._build_dependency_graph(subtasks)
        visited = set()
        sorted_list = []

        def visit(name):
            if name in sorted_list:
                return
            for dep in graph.get(name, set()):
                visit(dep)
            if name not in visited:
                visited.add(name)
                sorted_list.append(name)

        for st in subtasks:
            visit(st.name)
        return sorted_list

    def generate_plan(self, request: TaskPlanRequest, task_id: Optional[str] = None) -> TaskPlan:
        """Generate a day-by-day plan for the given task request."""
        now = datetime.now()
        start_date = request.start_date or (now + timedelta(days=1))
        
        # Ensure start_date is not in the past
        if start_date < now.replace(hour=0, minute=0, second=0, microsecond=0):
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)

        # Calculate end date with buffer if requested
        if request.include_buffer:
            # Leave one day before deadline as buffer
            end_date = request.deadline - timedelta(days=1)
        else:
            end_date = request.deadline

        # Topologically sort subtasks by dependencies
        sorted_names = self._topological_sort(request.subtasks)
        subtask_map = {st.name: st for st in request.subtasks}

        # Schedule subtasks across days
        daily_chunks = []
        current_date = start_date
        today_subtasks = []
        today_minutes = 0
        day_index = 0

        # Process each subtask in order
        for st_name in sorted_names:
            st = subtask_map[st_name]
            assigned = False
            while not assigned:
                capacity = self._get_daily_capacity(current_date, request.preferences, request.available_hours_per_day)
                remaining_capacity = capacity - today_minutes
                
                # Try to fit this subtask in today
                if st.estimated_minutes <= remaining_capacity:
                    today_subtasks.append(st_name)
                    today_minutes += st.estimated_minutes
                    assigned = True
                else:
                    # Current day is full, save it and move to next day
                    if today_subtasks:
                        notes = self._generate_day_notes(current_date, today_subtasks, request.preferences)
                        daily_chunks.append(
                            DailyChunk(
                                date=current_date,
                                subtask_names=today_subtasks.copy(),
                                total_minutes=today_minutes,
                                notes=notes,
                                is_buffer=False,
                                is_milestone=self._check_milestone(today_subtasks, subtask_map)
                            )
                        )
                    # Reset for new day
                    today_subtasks = []
                    today_minutes = 0
                    current_date += timedelta(days=1)
                    day_index += 1

                    # Check if we've exceeded the deadline
                    if current_date > end_date:
                        break

        # Don't forget to save the last day
        if today_subtasks:
            notes = self._generate_day_notes(current_date, today_subtasks, request.preferences)
            daily_chunks.append(
                DailyChunk(
                    date=current_date,
                    subtask_names=today_subtasks,
                    total_minutes=today_minutes,
                    notes=notes,
                    is_buffer=False,
                    is_milestone=self._check_milestone(today_subtasks, subtask_map)
                )
            )

        # Add buffer day if requested and there's room
        if request.include_buffer:
            buffer_date = end_date
            if not daily_chunks or daily_chunks[-1].date < buffer_date:
                daily_chunks.append(
                    DailyChunk(
                        date=buffer_date,
                        subtask_names=[],
                        total_minutes=0,
                        notes="Buffer day for review and catch-up",
                        is_buffer=True,
                        is_milestone=False
                    )
                )

        # Generate insights
        insights = self._generate_insights(request, daily_chunks, subtask_map)

        plan = TaskPlan(
            title=request.title,
            task_id=task_id,
            overall_duration_days=len(daily_chunks),
            total_subtasks=len(request.subtasks),
            total_estimated_minutes=sum(st.estimated_minutes for st in request.subtasks),
            start_date=start_date,
            deadline=request.deadline,
            daily_chunks=daily_chunks,
            insights=insights,
            created_at=datetime.now()
        )

        # Store in memory
        import uuid
        plan_id = str(uuid.uuid4())
        plans_db[plan_id] = plan
        return plan

    def _generate_day_notes(self, date: datetime, subtask_names: List[str], preferences: UserPreferences) -> str:
        """Generate an AI note for the day's schedule."""
        day_name = self._day_name(date)
        
        if self._is_heavy_day(date, preferences):
            return f"{day_name} - Heavy day: {len(subtask_names)} tasks scheduled. Stay focused!"
        elif self._is_light_day(date, preferences):
            return f"{day_name} - Light day: focus on {', '.join(subtask_names)}."
        else:
            return f"{day_name} - Standard schedule: {len(subtask_names)} tasks to complete."

    def _check_milestone(self, subtask_names: List[str], subtask_map: dict) -> bool:
        """Check if completing these subtasks completes any dependency chain."""
        for st_name in subtask_names:
            st = subtask_map.get(st_name)
            if st and not st.dependencies:
                # Simple milestone: first task in a chain
                return True
        return False

    def _generate_insights(self, request: TaskPlanRequest, daily_chunks: List[DailyChunk], subtask_map: dict) -> List[str]:
        """Generate AI insights about the generated plan."""
        insights = []
        total_mins = sum(c.total_minutes for c in daily_chunks if not c.is_buffer)
        avg_minutes = int(total_mins / len(daily_chunks)) if daily_chunks else 0
        
        insights.append(f"This is a {len(daily_chunks)}-day plan with an average of {avg_minutes} minutes per day.")
        
        deadline_diff = (request.deadline - datetime.now()).days
        if deadline_diff > 0:
            insights.append(f"You have {deadline_diff} days until the deadline.")
        
        if request.include_buffer and any(c.is_buffer for c in daily_chunks):
            insights.append("A buffer day was included for review and catch-up.")
        
        # Check for heavy days
        heavy_count = sum(1 for c in daily_chunks if self._is_heavy_day(c.date, request.preferences) and not c.is_buffer)
        if heavy_count > 0:
            insights.append(f"{heavy_count} heavy day(s) scheduled for intensive work.")
        
        # Check for consecutive days
        if len(daily_chunks) > 5:
            insights.append("Consider taking breaks if you feel burned out on consecutive days.")
        
        return insights


_planner_service = None


def get_planner_service() -> TaskPlannerService:
    global _planner_service
    if _planner_service is None:
        _planner_service = TaskPlannerService()
    return _planner_service