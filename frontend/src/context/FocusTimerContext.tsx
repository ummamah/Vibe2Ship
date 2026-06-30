import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import {
  recordFocusCompletion,
  getFocusedSecondsForDate,
  getFocusLog,
} from '../utils/focusStorage'

export type TimerStatus = 'idle' | 'focus' | 'break' | 'done'

interface FocusTimerState {
  status: TimerStatus
  currentSession: number
  totalSessions: number
  focusMins: number
  breakMins: number
  sessionName: string
  isPaused: boolean
}

export interface FocusTimerContextValue extends FocusTimerState {
  timeLeftSec: number
  phaseDurationSec: number
  todaysFocusSeconds: number
  start: (name: string, focusMins: number, breakMins: number, totalSessions: number) => void
  pause: () => void
  resume: () => void
  stop: () => void
  skip: () => void
  reset: () => void
  refreshTodaysFocus: () => number
}

const FocusTimerContext = createContext<FocusTimerContextValue | undefined>(undefined)

export const useFocusTimer = (): FocusTimerContextValue => {
  const ctx = useContext(FocusTimerContext)
  if (!ctx) {
    throw new Error('useFocusTimer must be used within a FocusTimerProvider')
  }
  return ctx
}

interface InternalTimers {
  phaseStartedAt: number | null
  phaseDurationMs: number
  pausedAccumMs: number
  pausedAt: number | null
}

const computeTimeLeftMs = (
  status: TimerStatus,
  isPaused: boolean,
  timers: InternalTimers,
  now: number,
): number => {
  if (status === 'idle' || status === 'done') return 0
  if (timers.phaseStartedAt == null) return 0
  if (isPaused && timers.pausedAt != null) {
    const elapsed = timers.pausedAt - timers.phaseStartedAt - timers.pausedAccumMs
    return Math.max(0, timers.phaseDurationMs - elapsed)
  }
  const elapsed = now - timers.phaseStartedAt - timers.pausedAccumMs
  return Math.max(0, timers.phaseDurationMs - elapsed)
}

interface FocusTimerProviderProps {
  children: ReactNode
}

export default function FocusTimerProvider({ children }: FocusTimerProviderProps) {
  const [status, setStatus] = useState<TimerStatus>('idle')
  const [currentSession, setCurrentSession] = useState(1)
  const [totalSessions, setTotalSessions] = useState(1)
  const [focusMins, setFocusMins] = useState(25)
  const [breakMins, setBreakMins] = useState(5)
  const [sessionName, setSessionName] = useState('')
  const [isPaused, setIsPaused] = useState(false)
  const [now, setNow] = useState<number>(() => Date.now())
  const [todaysFocusSeconds, setTodaysFocusSeconds] = useState<number>(() => getFocusedSecondsForDate())

  const timersRef = useRef<InternalTimers>({
    phaseStartedAt: null,
    phaseDurationMs: 0,
    pausedAccumMs: 0,
    pausedAt: null,
  })

  // Drives the single global 1Hz tick. Recomputes derived time; survives unmounts of any page.
  useEffect(() => {
    if (status === 'idle' || status === 'done') {
      return
    }
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [status])

  const timeLeftMs = computeTimeLeftMs(status, isPaused, timersRef.current, now)
  const timeLeftSec = Math.ceil(timeLeftMs / 1000)
  const phaseDurationSec = Math.round(timersRef.current.phaseDurationMs / 1000)

  const refreshTodaysFocus = useCallback((): number => {
    const value = getFocusedSecondsForDate()
    setTodaysFocusSeconds(value)
    return value
  }, [])

  // Phase transition handler: fires when computed timeLeft hits 0.
  useEffect(() => {
    if (status !== 'focus' && status !== 'break') return
    if (isPaused) return
    if (timeLeftMs > 0) return
    if (timersRef.current.phaseStartedAt == null) return

    // prevent repeat fires for the same 0-bucket
    timersRef.current.phaseStartedAt = null

    if (status === 'focus') {
      const completedSeconds = Math.round((focusMins * 60 * 1000 - 0) / 1000)
      const topic = sessionName || 'Untitled'
      recordFocusCompletion(completedSeconds, topic)
      setTodaysFocusSeconds(getFocusedSecondsForDate())

      if (currentSession < totalSessions) {
        // → break phase
        timersRef.current.phaseStartedAt = Date.now()
        timersRef.current.phaseDurationMs = breakMins * 60 * 1000
        timersRef.current.pausedAccumMs = 0
        timersRef.current.pausedAt = null
        setStatus('break')
        // notify (caller wires this up via window event)
        window.dispatchEvent(new CustomEvent('focus-timer:focus-complete', {
          detail: { hasNextSession: true, sessionName: topic, focusMins },
        }))
      } else {
        setStatus('done')
        timersRef.current.phaseDurationMs = 0
        window.dispatchEvent(new CustomEvent('focus-timer:series-complete', {
          detail: { sessionName: topic, totalSessions },
        }))
      }
    } else if (status === 'break') {
      // Only loop back to focus if there is another session coming
      if (currentSession < totalSessions) {
        const nextSession = currentSession + 1
        timersRef.current.phaseStartedAt = Date.now()
        timersRef.current.phaseDurationMs = focusMins * 60 * 1000
        timersRef.current.pausedAccumMs = 0
        timersRef.current.pausedAt = null
        setCurrentSession(nextSession)
        setStatus('focus')
        window.dispatchEvent(new CustomEvent('focus-timer:break-complete', {
          detail: { nextSession, totalSessions },
        }))
      } else {
        setStatus('done')
        timersRef.current.phaseDurationMs = 0
      }
    }
  }, [timeLeftMs, status, isPaused, focusMins, breakMins, currentSession, totalSessions, sessionName])

  // ---------------------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------------------
  const start = useCallback((name: string, fMins: number, bMins: number, total: number) => {
    const safeTotal = Math.max(1, total | 0)
    const safeFocus = Math.max(1, fMins | 0)
    const safeBreak = Math.max(1, bMins | 0)
    setSessionName(name)
    setFocusMins(safeFocus)
    setBreakMins(safeBreak)
    setTotalSessions(safeTotal)
    setCurrentSession(1)
    setIsPaused(false)
    timersRef.current = {
      phaseStartedAt: Date.now(),
      phaseDurationMs: safeFocus * 60 * 1000,
      pausedAccumMs: 0,
      pausedAt: null,
    }
    setNow(Date.now())
    setStatus('focus')
  }, [])

  const pause = useCallback(() => {
    if (status !== 'focus' && status !== 'break') return
    if (isPaused) return
    timersRef.current.pausedAt = Date.now()
    setIsPaused(true)
  }, [status, isPaused])

  const resume = useCallback(() => {
    if (!isPaused) return
    if (timersRef.current.pausedAt != null) {
      timersRef.current.pausedAccumMs += Date.now() - timersRef.current.pausedAt
      timersRef.current.pausedAt = null
    }
    setIsPaused(false)
  }, [isPaused])

  const stop = useCallback(() => {
    // Log a partial focus session if user has not completed it yet but spent meaningful time.
    // Per plan, we only log full completions; "stop" simply discards.
    setStatus('idle')
    setIsPaused(false)
    setCurrentSession(1)
    timersRef.current = {
      phaseStartedAt: null,
      phaseDurationMs: focusMins * 60 * 1000,
      pausedAccumMs: 0,
      pausedAt: null,
    }
    setNow(Date.now())
  }, [focusMins])

  const skip = useCallback(() => {
    if (status === 'idle' || status === 'done') return

    // Treat skip as completion for the purpose of logging the current phase's full duration
    if (status === 'focus') {
      const completedSeconds = focusMins * 60
      const topic = sessionName || 'Untitled'
      recordFocusCompletion(completedSeconds, topic)
      setTodaysFocusSeconds(getFocusedSecondsForDate())
    }

    if (status === 'focus') {
      if (currentSession < totalSessions) {
        timersRef.current = {
          phaseStartedAt: Date.now(),
          phaseDurationMs: breakMins * 60 * 1000,
          pausedAccumMs: 0,
          pausedAt: null,
        }
        setStatus('break')
        window.dispatchEvent(new CustomEvent('focus-timer:focus-complete', {
          detail: { hasNextSession: true, sessionName: sessionName || 'Untitled', focusMins },
        }))
      } else {
        timersRef.current = {
          phaseStartedAt: null,
          phaseDurationMs: 0,
          pausedAccumMs: 0,
          pausedAt: null,
        }
        setStatus('done')
        window.dispatchEvent(new CustomEvent('focus-timer:series-complete', {
          detail: { sessionName: sessionName || 'Untitled', totalSessions },
        }))
      }
    } else if (status === 'break') {
      if (currentSession < totalSessions) {
        const nextSession = currentSession + 1
        timersRef.current = {
          phaseStartedAt: Date.now(),
          phaseDurationMs: focusMins * 60 * 1000,
          pausedAccumMs: 0,
          pausedAt: null,
        }
        setCurrentSession(nextSession)
        setStatus('focus')
        window.dispatchEvent(new CustomEvent('focus-timer:break-complete', {
          detail: { nextSession, totalSessions },
        }))
      } else {
        timersRef.current = {
          phaseStartedAt: null,
          phaseDurationMs: 0,
          pausedAccumMs: 0,
          pausedAt: null,
        }
        setStatus('done')
      }
    }
    setIsPaused(false)
    setNow(Date.now())
  }, [status, currentSession, totalSessions, focusMins, breakMins, sessionName])

  const reset = useCallback(() => {
    setStatus('idle')
    setCurrentSession(1)
    setIsPaused(false)
    timersRef.current = {
      phaseStartedAt: null,
      phaseDurationMs: focusMins * 60 * 1000,
      pausedAccumMs: 0,
      pausedAt: null,
    }
    setNow(Date.now())
  }, [focusMins])

  // Listen for storage events so multi-tab focus completions stay in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('focus_log')) {
        setTodaysFocusSeconds(getFocusedSecondsForDate())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value: FocusTimerContextValue = {
    status,
    currentSession,
    totalSessions,
    focusMins,
    breakMins,
    sessionName,
    isPaused,
    timeLeftSec,
    phaseDurationSec,
    todaysFocusSeconds,
    start,
    pause,
    resume,
    stop,
    skip,
    reset,
    refreshTodaysFocus,
  }

  return (
    <FocusTimerContext.Provider value={value}>
      {children}
    </FocusTimerContext.Provider>
  )
}

// Helper exported so other consumers (Dashboard, Analytics) can read without
// triggering a re-render via context — useful for sync reads inside selectors.
export const readFocusLog = getFocusLog
