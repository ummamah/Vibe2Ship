export type DateKey = string

export interface DayLog {
  totalSeconds: number
  byTopic: Record<string, number>
}

export type FocusLog = Record<DateKey, DayLog>

const STORAGE_KEY = 'focus_log_v1'

const todayKey = (d: Date = new Date()): DateKey => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const normalize = (raw: unknown): FocusLog => {
  if (!raw || typeof raw !== 'object') return {}
  const out: FocusLog = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'number') {
      out[key] = { totalSeconds: value, byTopic: {} }
    } else if (value && typeof value === 'object') {
      const v = value as { totalSeconds?: unknown; byTopic?: unknown }
      const totalSeconds = typeof v.totalSeconds === 'number' ? v.totalSeconds : 0
      const byTopic: Record<string, number> = {}
      if (v.byTopic && typeof v.byTopic === 'object') {
        for (const [topic, secs] of Object.entries(v.byTopic as Record<string, unknown>)) {
          if (typeof secs === 'number') byTopic[topic] = secs
        }
      }
      out[key] = { totalSeconds, byTopic }
    }
  }
  return out
}

export const getFocusLog = (): FocusLog => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return normalize(raw ? JSON.parse(raw) : null)
  } catch {
    return {}
  }
}

const writeLog = (log: FocusLog): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
  } catch {
    // storage quota or disabled - silently ignore
  }
}

export const recordFocusCompletion = (seconds: number, topic: string): void => {
  if (seconds <= 0) return
  const log = getFocusLog()
  const key = todayKey()
  const entry = log[key] ?? { totalSeconds: 0, byTopic: {} }
  entry.totalSeconds += seconds
  const safeTopic = topic.trim() || 'Untitled'
  entry.byTopic[safeTopic] = (entry.byTopic[safeTopic] ?? 0) + seconds
  log[key] = entry
  writeLog(log)
}

export const getFocusedSecondsForDate = (date: Date = new Date()): number => {
  const log = getFocusLog()
  return log[todayKey(date)]?.totalSeconds ?? 0
}

export const hasRealFocusData = (): boolean => {
  const log = getFocusLog()
  return Object.values(log).some(e => e.totalSeconds > 0)
}

export const getLast7DaysLog = (): Array<{ date: DateKey; dayLabel: string; totalSeconds: number; byTopic: Record<string, number> }> => {
  const log = getFocusLog()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days: Array<{ date: DateKey; dayLabel: string; totalSeconds: number; byTopic: Record<string, number> }> = []
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = todayKey(d)
    const entry = log[key]
    days.push({
      date: key,
      dayLabel: labels[d.getDay()],
      totalSeconds: entry?.totalSeconds ?? 0,
      byTopic: entry?.byTopic ?? {},
    })
  }
  return days
}

export const clearFocusLog = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
