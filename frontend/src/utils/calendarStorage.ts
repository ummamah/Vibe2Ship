import { Task } from '../services/taskService'

export interface CalendarPortion {
  id: string
  parentTaskId: string
  title: string
  description: string
  date: string // ISO date string
  time: string
  duration: number
  priority: 'high' | 'medium' | 'low'
  completed: boolean
  portionNumber: number
  totalPortions: number
}

const STORAGE_KEY = 'calendar-portions'

export const calendarStorage = {
  savePortions: (portions: CalendarPortion[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portions))
  },

  getPortions: (): CalendarPortion[] => {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    return JSON.parse(data)
  },

  clearPortions: () => {
    localStorage.removeItem(STORAGE_KEY)
  },

  // Get portions for a specific date (YYYY-MM-DD)
  getPortionsForDate: (dateStr: string): CalendarPortion[] => {
    const portions = calendarStorage.getPortions()
    return portions.filter(p => {
      const pDate = new Date(p.date).toISOString().split('T')[0]
      return pDate === dateStr
    })
  },

  // Delete old uncompleted portions (runs on startup)
  cleanupOldPortions: () => {
    const portions = calendarStorage.getPortions()
    const today = new Date().toISOString().split('T')[0]
    
    const cleaned = portions.filter(p => {
      const pDate = new Date(p.date).toISOString().split('T')[0]
      return pDate >= today || p.completed
    })
    
    calendarStorage.savePortions(cleaned)
  }
}
