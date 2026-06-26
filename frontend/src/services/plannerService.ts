import axios from 'axios'

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1'

export interface SubTask {
  name: string
  type: string
  estimated_minutes: number
  dependencies: string[]
}

export interface TaskPlanRequest {
  title: string
  description: string
  deadline: string
  subtasks: SubTask[]
  available_hours_per_day: number
  preferences: {
    heavy_days: string[]
    light_days: string[]
    max_daily_minutes: number
  }
}

export interface DailyChunk {
  date: string
  subtask_names: string[]
  total_minutes: number
  notes: string
  is_buffer: boolean
  is_milestone: boolean
}

export interface TaskPlan {
  title: string
  overall_duration_days: number
  total_subtasks: number
  total_estimated_minutes: number
  start_date: string
  deadline: string
  daily_chunks: DailyChunk[]
  insights: string[]
}

export const plannerService = {
  generatePlan: async (request: TaskPlanRequest): Promise<{ plan: TaskPlan }> => {
    const response = await axios.post(`${API_BASE_URL}/tasks/sample/plan`, request)
    return response.data
  }
}