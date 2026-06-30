import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'

export interface SubTask {
  name: string
  type: string
  estimated_minutes: number
  dependencies: string[]
}

export interface SubtaskDetail {
  name: string
  start_time: string  // HH:MM format
  end_time: string   // HH:MM format
  duration_minutes: number
}

export interface UserPreferences {
  heavy_days: string[]
  light_days: string[]
  preferred_time_start: string
  preferred_end: string
  max_daily_minutes: number
  overlapping_tasks: boolean
}

export interface TaskPlanRequest {
  title: string
  description: string
  deadline: string
  start_date?: string
  subtasks: SubTask[]
  available_hours_per_day: number
  preferences: UserPreferences
  include_buffer: boolean
}

export interface DailyChunk {
  date: string
  subtask_names: string[]
  subtask_details: SubtaskDetail[]  // NEW: specific subtasks with times
  total_minutes: number
  total_hours: number
  notes: string
  is_buffer: boolean
  is_milestone: boolean
}

export interface TaskPlan {
  title: string
  task_id?: string
  overall_duration_days: number
  total_subtasks: number
  total_estimated_minutes: number
  start_date: string
  deadline: string
  daily_chunks: DailyChunk[]
  insights: string[]
  created_at: string
}

export const defaultPreferences: UserPreferences = {
  heavy_days: ['Monday', 'Wednesday'],
  light_days: ['Friday'],
  preferred_time_start: '09:00',
  preferred_time_end: '17:00',
  max_daily_minutes: 180,
  overlapping_tasks: false
}

export interface AIPlanResponse {
  plan: TaskPlan
  subtasks: SubTask[]
}

export const plannerService = {
  generatePlan: async (taskId: string, request: TaskPlanRequest): Promise<{ plan: TaskPlan }> => {
    const response = await axios.post(`${API_BASE_URL}/tasks/${taskId}/plan`, request)
    return response.data
  },

  getPlan: async (taskId: string): Promise<{ plan: TaskPlan }> => {
    const response = await axios.get(`${API_BASE_URL}/tasks/${taskId}/plan`)
    return response.data
  },

  generateAIPlan: async (taskId: string, preferences?: UserPreferences): Promise<AIPlanResponse> => {
    const response = await axios.post(`${API_BASE_URL}/tasks/${taskId}/ai-plan`, {
      available_hours_per_day: 3,
      preferences: preferences || defaultPreferences
    })
    return response.data
  },

  generateDirectPlan: async (title: string, description: string, deadline: string, availableHoursPerDay: number = 3, preferences?: UserPreferences): Promise<AIPlanResponse> => {
    const response = await axios.post(`${API_BASE_URL}/tasks/planner/generate`, {
      title,
      description,
      deadline,
      available_hours_per_day: availableHoursPerDay,
      preferences: preferences || defaultPreferences,
      include_buffer: true
    })
    return response.data
  }
}