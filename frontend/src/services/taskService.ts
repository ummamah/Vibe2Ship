import axios from 'axios'

// Use the backend URL (adjust if needed)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'

export interface Task {
  id: string
  title: string
  description: string
  deadline: string | null
  deadline_time?: string  // Due time in HH:MM format (24hr)
  duration_minutes: number
  approximate_time_minutes?: number
  importance?: number
  priority: string | null
  category: string | null
  tags: string[]
  energy_required: string
  status: string
  is_skippable?: boolean
  is_critical?: boolean
  created_at: string
  user_id?: string
  overall_score?: number
  ai_analysis?: AIAnalysis
  use_ai_plan?: boolean
}

export interface AIAnalysis {
  urgency_score: number
  importance_score: number
  effort_score: number
  overall_priority_score: number
  is_critical: boolean
  reasoning: string
  suggested_order: number
  ai_insights: string[]
  estimated_focus_blocks: number
  optimal_time_of_day: string
}

export interface CreateTaskPayload {
  title: string
  description?: string
  deadline?: string | null
  deadline_time?: string  // Due time in HH:MM format (24hr)
  duration_minutes?: number
  approximate_time_minutes?: number
  priority?: string | null
  category?: string | null
  tags?: string[]
  energy_required?: string
  user_id?: string
  use_ai_plan?: boolean
}

export const taskService = {
  // Get all tasks
  getTasks: async (): Promise<{ tasks: Task[]; count: number }> => {
    const response = await axios.get(`${API_BASE_URL}/tasks/`)
    return response.data
  },

  // Get AI-prioritized tasks
  getPrioritizedTasks: async (): Promise<{ tasks: Task[]; count: number; generated_at: string }> => {
    const response = await axios.get(`${API_BASE_URL}/tasks/prioritized`)
    return response.data
  },

  // Create a new task
  createTask: async (task: CreateTaskPayload): Promise<{ success: boolean; task: Task }> => {
    const response = await axios.post(`${API_BASE_URL}/tasks/`, task)
    return response.data
  },

  // Analyze a task with AI
  analyzeTask: async (task: CreateTaskPayload): Promise<any> => {
    const response = await axios.post(`${API_BASE_URL}/tasks/analyze`, task)
    return response.data
  },

  // Delete a task
  deleteTask: async (taskId: string): Promise<{ success: boolean }> => {
    const response = await axios.delete(`${API_BASE_URL}/tasks/${taskId}`)
    return response.data
  },

  // Update task status
  updateTaskStatus: async (taskId: string, status: string): Promise<{ success: boolean; task: Task }> => {
    const response = await axios.patch(`${API_BASE_URL}/tasks/${taskId}/status?status=${status}`)
    return response.data
  },

  // Check notifications
  checkNotifications: async (): Promise<{ notifications: any[]; count: number; checked_at: string }> => {
    const response = await axios.get(`${API_BASE_URL}/tasks/check-notifications`)
    return response.data
  },

  // Cleanup tasks
  cleanupTasks: async (): Promise<{ deleted_divisions: number; overdue_tasks: number; cleaned_at: string }> => {
    const response = await axios.post(`${API_BASE_URL}/tasks/cleanup`)
    return response.data
  },
}
