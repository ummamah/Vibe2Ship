"""
AI Task Prioritization Engine
Analyzes tasks using multiple scoring factors and returns intelligent rankings.
Includes clarifying questions, reminder scheduling, and alarm logic.
"""

import os
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from schemas.task import TaskCreate, AIPriorityAnalysis, ClarifyingQuestion, EffortEstimationResponse, ReminderSchedule


tasks_db: Dict[str, dict] = {}


class TaskPrioritizer:
    CLARIFYING_QUESTIONS = [
        ClarifyingQuestion(
            question="How complex is this task?",
            options=["Quick task (under 30 min)", "Moderate (30-90 min)", "Deep work (90+ min)"],
            key="complexity"
        ),
        ClarifyingQuestion(
            question="Does this require research or gathering resources?",
            options=["Yes, needs research", "Somewhat, minimal prep", "No, ready to start"],
            key="needs_resources"
        ),
        ClarifyingQuestion(
            question="Is this related to studying or learning?",
            options=["Yes, studying", "Partially", "No, other work"],
            key="is_study_related"
        )
    ]

    def calculate_urgency(self, deadline: Optional[datetime], duration: int) -> float:
        """Calculate urgency score (0-100) based on deadline proximity"""
        if not deadline:
            return 30.0

        now = datetime.now()
        time_remaining = (deadline - now).total_seconds() / 3600

        if time_remaining <= 0:
            return 100.0
        elif time_remaining <= 2:
            return 95.0
        elif time_remaining <= 4:
            return 85.0
        elif time_remaining <= 8:
            return 75.0
        elif time_remaining <= 24:
            return 60.0
        elif time_remaining <= 48:
            return 45.0
        elif time_remaining <= 72:
            return 35.0
        elif time_remaining <= 168:
            return 25.0
        else:
            return 15.0

    def calculate_effort(self, duration: int, energy_required: str) -> float:
        """Calculate effort score (0-100)"""
        base_effort = min(duration / 120 * 50, 80)
        energy_multipliers = {"low": 0.7, "medium": 1.0, "high": 1.3}
        return min(base_effort * energy_multipliers.get(energy_required, 1.0), 100)

    def _estimate_importance(self, task: TaskCreate) -> float:
        """Estimate task importance based on various factors"""
        base_score = float(task.importance)
        text = f"{task.title} {task.description}".lower()

        important_keywords = ["urgent", "important", "deadline", "critical", "meeting", "interview", "exam"]
        very_important = ["exam", "critical", "interview"]

        for keyword in important_keywords:
            if keyword in text:
                base_score += 10
        for keyword in very_important:
            if keyword in text:
                base_score += 15

        if task.deadline:
            hours_left = (task.deadline - datetime.now()).total_seconds() / 3600
            if hours_left < 24:
                base_score += 15
            elif hours_left < 48:
                base_score += 10

        return min(base_score, 100)

    def calculate_reminder_schedule(
        self,
        task_id: str,
        deadline: Optional[datetime],
        status: str,
        is_skippable: bool,
        duration_minutes: int
    ) -> Dict:
        """Calculate reminder schedule based on deadline and task status"""
        reminders = []
        is_critical = False
        alarm_triggered = False

        if not deadline:
            return {
                "task_id": task_id,
                "reminders": [],
                "next_reminder": None,
                "is_critical": False,
                "alarm_triggered": False
            }

        now = datetime.now()
        hours_until_deadline = (deadline - now).total_seconds() / 3600
        buffer_time = hours_until_deadline - (duration_minutes / 60)

        if status == "completed":
            return {
                "task_id": task_id,
                "reminders": [{"type": "completed", "message": "Task completed!", "at": now.isoformat()}],
                "next_reminder": None,
                "is_critical": False,
                "alarm_triggered": False
            }

        if hours_until_deadline > 168:
            reminders.append({
                "type": "weekly",
                "message": f"Task due in {int(hours_until_deadline / 24)} days",
                "at": (now + timedelta(days=7)).isoformat()
            })
        elif hours_until_deadline > 24:
            reminders.append({
                "type": "daily",
                "message": f"Task due tomorrow",
                "at": (now + timedelta(hours=hours_until_deadline - 24)).isoformat()
            })
        elif hours_until_deadline > 5:
            reminders.append({
                "type": "5hour",
                "message": "Deadline approaching!",
                "at": (now + timedelta(hours=hours_until_deadline - 5)).isoformat()
            })

        if hours_until_deadline <= 1 and not is_skippable and status != "completed":
            is_critical = True
            if status != "working_on_it":
                alarm_triggered = True

        next_reminder = None
        if reminders:
            next_reminder = reminders[-1].get("at")

        return {
            "task_id": task_id,
            "reminders": reminders,
            "next_reminder": next_reminder,
            "is_critical": is_critical,
            "alarm_triggered": alarm_triggered
        }

    def estimate_effort_from_questions(
        self,
        title: str,
        description: str,
        category: Optional[str],
        is_study_related: bool,
        needs_resources: bool,
        complexity_hint: Optional[str]
    ) -> EffortEstimationResponse:
        """Estimate effort based on clarifying question answers"""
        base_minutes = 30
        reasoning_parts = []

        text = f"{title} {description}".lower()

        study_keywords = ["chapter", "study", "read", "review", "exam", "learn", "flashcard", "notes"]
        writing_keywords = ["write", "essay", "paper", "article", "blog", "report"]
        coding_keywords = ["code", "programming", "implement", "build", "develop", "debug"]

        if complexity_hint == "Quick task (under 30 min)":
            base_minutes = 20
            reasoning_parts.append("Quick task confirmed")
        elif complexity_hint == "Moderate (30-90 min)":
            base_minutes = 60
            reasoning_parts.append("Moderate complexity")
        elif complexity_hint == "Deep work (90+ min)":
            base_minutes = 120
            reasoning_parts.append("Deep work required")

        for keyword in study_keywords:
            if keyword in text or is_study_related:
                base_minutes = max(base_minutes, 45)
                if "chapter" in text:
                    chapters = [w for w in text.split() if w.isdigit()]
                    if chapters:
                        base_minutes = max(base_minutes, int(chapters[0]) * 30)
                        reasoning_parts.append(f"Estimated {chapters[0]} chapters")
                break

        for keyword in writing_keywords:
            if keyword in text:
                base_minutes = max(base_minutes, 60)
                reasoning_parts.append("Writing task detected")
                break

        for keyword in coding_keywords:
            if keyword in text:
                base_minutes = max(base_minutes, 90)
                reasoning_parts.append("Coding task detected")
                break

        if needs_resources:
            base_minutes = int(base_minutes * 1.3)
            reasoning_parts.append("Research time added")

        if category:
            reasoning_parts.append(f"Category: {category}")

        energy_required = "low" if base_minutes < 45 else "medium" if base_minutes < 120 else "high"

        confidence = 0.7
        if complexity_hint and complexity_hint != "Moderate (30-90 min)":
            confidence = 0.85

        return EffortEstimationResponse(
            estimated_minutes=base_minutes,
            confidence=confidence,
            energy_required=energy_required,
            reasoning="; ".join(reasoning_parts) if reasoning_parts else "Standard estimation"
        )

    def _generate_insights(self, task, urgency: float, importance: float, effort: float, consequences: float) -> list:
        """Generate helpful AI insights for the task"""
        insights = []
        if urgency > 80:
            insights.append("This task is extremely urgent - handle it immediately!")
        elif urgency > 60:
            insights.append("This task needs attention soon.")

        if effort > 75:
            insights.append("This requires significant effort. Consider breaking it into smaller chunks.")
        elif effort < 20:
            insights.append("Quick win! This won't take much time.")

        if importance > 70 and urgency < 40:
            insights.append("Important but not urgent - schedule dedicated focus time.")

        if consequences > 70:
            insights.append("Missing this will have serious consequences - prioritize accordingly.")

        if not insights:
            insights.append("Standard priority task with balanced urgency and importance.")

        return insights

    async def get_ai_insights(
        self,
        task: TaskCreate,
        urgency: float,
        effort: float
    ) -> AIPriorityAnalysis:
        """Get AI-powered analysis and recommendations"""
        importance = self._estimate_importance(task)
        consequences = float(task.consequences_score)
        overall = (urgency * 0.35 + importance * 0.25 + consequences * 0.20 + (100 - effort) * 0.20)

        if effort > 70:
            optimal_time = "morning"
        elif effort > 40:
            optimal_time = "afternoon"
        else:
            optimal_time = "evening"

        insights = self._generate_insights(task, urgency, importance, effort, consequences)
        reminder_schedule = self.calculate_reminder_schedule(
            task_id="temp",
            deadline=task.deadline,
            status=task.status.value if hasattr(task.status, 'value') else task.status,
            is_skippable=task.is_skippable,
            duration_minutes=task.duration_minutes
        )

        return AIPriorityAnalysis(
            urgency_score=urgency,
            importance_score=importance,
            effort_score=effort,
            consequences_score=consequences,
            overall_priority_score=overall,
            reasoning=f"Urgency: {urgency:.0f}/100, Importance: {importance:.0f}/100, Consequences: {consequences:.0f}/100",
            suggested_order=0,
            ai_insights=insights,
            estimated_focus_blocks=max(1, task.duration_minutes // 50),
            optimal_time_of_day=optimal_time,
            reminder_schedule=ReminderSchedule(**reminder_schedule)
        )

    async def analyze_single_task(self, task: TaskCreate) -> dict:
        """Analyze a single task and return enriched data"""
        urgency = self.calculate_urgency(task.deadline, task.duration_minutes)
        effort = self.calculate_effort(task.duration_minutes, task.energy_required)
        ai_analysis = await self.get_ai_insights(task, urgency, effort)

        return {
            "urgency": urgency,
            "effort": effort,
            "importance": ai_analysis.importance_score,
            "ai_analysis": ai_analysis
        }

    async def prioritize_tasks(self, tasks: List[TaskCreate]) -> List[dict]:
        """Analyze and prioritize all tasks"""
        enriched_tasks = []

        for task in tasks:
            analysis = await self.analyze_single_task(task)
            task_dict = task.model_dump()
            if hasattr(task.status, 'value'):
                task_dict['status'] = task.status.value
            enriched_tasks.append({
                **task_dict,
                "ai_analysis": analysis["ai_analysis"],
                "overall_score": analysis["ai_analysis"].overall_priority_score
            })

        enriched_tasks.sort(key=lambda x: x["overall_score"], reverse=True)

        for i, task in enumerate(enriched_tasks, 1):
            task["ai_analysis"]["suggested_order"] = i

        return enriched_tasks


_prioritizer = None


def get_prioritizer() -> TaskPrioritizer:
    global _prioritizer
    if _prioritizer is None:
        _prioritizer = TaskPrioritizer()
    return _prioritizer