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
        """Build the prompt for GENERATING SPECIFIC SUBTASK NAMES."""
        days_until_deadline = (deadline - datetime.now()).days
        if days_until_deadline <= 0:
            days_until_deadline = 1
        
        total_hours = available_hours_per_day * days_until_deadline
        
        heavy_days = ", ".join(preferences.heavy_days) if preferences.heavy_days else "None"
        light_days = ", ".join(preferences.light_days) if preferences.light_days else "None"
        
        task_types = [t.value for t in SubTaskType]
        
        return f"""You are an expert task planner. BREAK DOWN a complex task into SPECIFIC, NAMED subtasks.

TASK TO BREAK DOWN:
- Title: {title}
- Description/Context: {description}
- Deadline: {deadline.strftime('%Y-%m-%d')} ({days_until_deadline} days from now)
- Available hours per day: {available_hours_per_day}
- Total available hours: ~{total_hours}

USER PREFERENCES:
- Heavy days: {heavy_days}
- Light days: {light_days}
- Preferred work hours: {preferences.preferred_time_start} - {preferences.preferred_time_end}
- Max daily minutes: {preferences.max_daily_minutes}

SUBTASK TYPES: {", ".join(task_types)}

CRITICAL REQUIREMENTS:
1. SUBTASK NAMES MUST BE SPECIFIC - use chapter numbers, topic names, section names
   GOOD: "Ch 1: Multiplication & Division", "Ch 2: Fractions", "Practice: Equations Set A"
   BAD: "Math Part 1", "Study Section", "Review Material"

2. Each subtask needs: name, type, estimated_minutes (15-120), dependencies

3. Dependencies: only reference subtasks that MUST come before (linear dependencies only)

4. Realistic time estimates: Chapter review = 60-90min, Practice problems = 45-60min, Review = 30-45min

5. Generate 5-12 subtasks that COVER THE FULL SCOPE of the task

6. Output ONLY valid JSON:
{{
  "subtasks": [
    {{
      "name": "SPECIFIC NAME (e.g., 'Ch 1: Multiplication')",
      "type": "reading|writing|practice|research|review|memorization|creation|analysis",
      "estimated_minutes": 60,
      "dependencies": []
    }}
  ]
}}

Do NOT use generic names. Be specific about WHAT will be learned/done in each subtask."""

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
        """Generate basic subtasks if LLM fails - uses chapter-like naming."""
        days = max(1, (deadline - datetime.now()).days)
        total_minutes = available_hours_per_day * 60 * days
        
        # Create chapter-style names based on title keywords
        topic = title.split()[0] if title else "Topic"  # Use first word as topic
        num_subtasks = min(max(3, days), 8)
        minutes_per_subtask = max(30, min(90, total_minutes // num_subtasks))
        
        subtasks = []
        for i in range(num_subtasks):
            subtask_name = f"{topic} - Section {i + 1}"
            if i == num_subtasks - 1:
                subtask_name = f"Review & Practice - {topic}"
            
            subtasks.append(SubTask(
                name=subtask_name,
                type=SubTaskType.REVIEW if i == num_subtasks - 1 else (
                    SubTaskType.PRACTICE if i % 2 == 0 else SubTaskType.READING
                ),
                estimated_minutes=minutes_per_subtask,
                dependencies=[subtasks[-1].name] if subtasks else []
            ))
        return subtasks


_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service