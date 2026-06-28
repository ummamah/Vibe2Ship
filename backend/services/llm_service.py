"""
LLM Service for AI-powered task planning.
Uses OpenRouter API (free tier) to generate structured subtasks from task descriptions.
"""
import os
import json
import asyncio
from datetime import datetime
from typing import List, Optional

from openai import AsyncOpenAI
from schemas.planner import SubTask, SubTaskType, UserPreferences


class LLMService:
    def __init__(self):
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable not set")
        
        self.client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key
        )
        self.model = "meta-llama/llama-3.1-8b-instruct:free"

    def _build_prompt(
        self,
        title: str,
        description: str,
        deadline: datetime,
        available_hours_per_day: int,
        preferences: UserPreferences
    ) -> str:
        """Build the prompt for subtask generation."""
        days_until_deadline = (deadline - datetime.now()).days
        if days_until_deadline <= 0:
            days_until_deadline = 1
        
        total_hours = available_hours_per_day * days_until_deadline
        
        heavy_days = ", ".join(preferences.heavy_days) if preferences.heavy_days else "None"
        light_days = ", ".join(preferences.light_days) if preferences.light_days else "None"
        
        task_types = [t.value for t in SubTaskType]
        
        return f"""You are an AI task planner. Break down the following task into 5-12 specific, actionable subtasks.

TASK:
- Title: {title}
- Description: {description}
- Deadline: {deadline.strftime('%Y-%m-%d')} ({days_until_deadline} days from now)
- Available hours per day: {available_hours_per_day}
- Total available hours: ~{total_hours}

USER PREFERENCES:
- Heavy days (more study time): {heavy_days}
- Light days (less study time): {light_days}
- Preferred time: {preferences.preferred_time_start} - {preferences.preferred_time_end}
- Max daily minutes: {preferences.max_daily_minutes}
- Allow overlapping tasks: {preferences.overlapping_tasks}

SUBTASK TYPES (choose from): {", ".join(task_types)}

REQUIREMENTS:
1. Each subtask must have: name, type, estimated_minutes (15-480), dependencies (list of subtask names)
2. Dependencies must reference other subtask names in this list
3. Total estimated minutes should be realistic for the deadline
4. Order subtasks logically (dependencies first)
5. Mix task types appropriately (reading, practice, review, etc.)
6. Output ONLY valid JSON matching this schema:
{{
  "subtasks": [
    {{
      "name": "string",
      "type": "string",
      "estimated_minutes": integer,
      "dependencies": ["string"]
    }}
  ]
}}"""

    async def generate_subtasks(
        self,
        title: str,
        description: str,
        deadline: datetime,
        available_hours_per_day: int,
        preferences: UserPreferences
    ) -> List[SubTask]:
        """Generate subtasks using LLM with timeout and fallback."""
        prompt = self._build_prompt(title, description, deadline, available_hours_per_day, preferences)
        
        for attempt in range(2):  # Max 2 attempts
            try:
                response = await asyncio.wait_for(
                    self.client.chat.completions.create(
                        model=self.model,
                        messages=[
                            {"role": "system", "content": "You are a precise task planner. Output only valid JSON."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.3,
                        max_tokens=2000,
                        response_format={"type": "json_object"}
                    ),
                    timeout=15.0
                )
                
                content = response.choices[0].message.content
                data = json.loads(content)
                
                subtasks = []
                for st_data in data.get("subtasks", []):
                    # Validate and create SubTask
                    subtask = SubTask(
                        name=st_data.get("name", "Untitled Subtask"),
                        type=SubTaskType(st_data.get("type", "reading")),
                        estimated_minutes=max(15, min(480, st_data.get("estimated_minutes", 60))),
                        dependencies=st_data.get("dependencies", [])
                    )
                    subtasks.append(subtask)
                
                if subtasks:
                    return subtasks
                    
            except asyncio.TimeoutError:
                print(f"LLM attempt {attempt + 1} timed out")
                if attempt == 1:
                    break
            except Exception as e:
                print(f"LLM attempt {attempt + 1} failed: {e}")
                if attempt == 1:
                    break
        
        # Fallback: generate basic subtasks
        return self._fallback_subtasks(title, description, deadline, available_hours_per_day)

    def _fallback_subtasks(
        self,
        title: str,
        description: str,
        deadline: datetime,
        available_hours_per_day: int
    ) -> List[SubTask]:
        """Generate basic subtasks if LLM fails."""
        days = max(1, (deadline - datetime.now()).days)
        total_minutes = available_hours_per_day * 60 * days
        num_subtasks = min(max(3, days), 10)
        minutes_per_subtask = max(30, total_minutes // num_subtasks)
        
        subtasks = []
        for i in range(num_subtasks):
            subtasks.append(SubTask(
                name=f"{title} - Part {i + 1}",
                type=SubTaskType.READING if i % 3 == 0 else SubTaskType.PRACTICE,
                estimated_minutes=minutes_per_subtask,
                dependencies=[f"{title} - Part {i}"] if i > 0 else []
            ))
        return subtasks


_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service