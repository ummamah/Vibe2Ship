import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'

export interface TimerConfig {
  focus_duration_minutes: number
  short_break_minutes: number
  long_break_minutes: number
  sessions_before_long_break: number
}

export interface TimerState {
  phase: 'idle' | 'focus' | 'short_break' | 'long_break' | 'paused' | 'completed'
  time_remaining_seconds: number
  total_seconds: number
  progress_percentage: number
  session_number: number
  topic: string
  is_active: boolean
  is_paused: boolean
}

export interface FocusSession {
  topic: string
  config: TimerConfig
}

export interface FocusAnalytics {
  total_sessions: number
  total_focus_hours: number
  average_session_length: number
  completion_rate: number
  most_active_topic: string
}

export const focusService = {
  startSession: async (session: FocusSession): Promise<{ session_id: string; state: TimerState }> => {
    const response = await axios.post(`${API_BASE_URL}/focus/start`, session)
    return response.data
  },

  getStatus: async (): Promise<{ state: TimerState; completed_sessions: number }> => {
    const response = await axios.get(`${API_BASE_URL}/focus/status`)
    return response.data
  },

  performAction: async (action: string): Promise<{ message: string; state: TimerState }> => {
    const response = await axios.post(`${API_BASE_URL}/focus/action`, { action })
    return response.data
  },

  getAnalytics: async (): Promise<{ analytics: FocusAnalytics }> => {
    const response = await axios.get(`${API_BASE_URL}/focus/analytics`)
    return response.data
  },

  getHistory: async (): Promise<{ history: any[]; count: number }> => {
    const response = await axios.get(`${API_BASE_URL}/focus/history`)
    return response.data
  }
}