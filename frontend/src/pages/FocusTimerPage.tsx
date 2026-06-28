import { useState, useEffect, useRef } from 'react'

const FOCUS_OPTIONS = [15, 25, 45, 60]
const BREAK_OPTIONS = [5, 10, 15, 20]

type TimerStatus = 'idle' | 'focus' | 'break' | 'done'

export default function FocusTimerPage() {
  // Settings
  const [sessionName, setSessionName] = useState('')
  const [focusMins, setFocusMins] = useState(25)
  const [breakMins, setBreakMins] = useState(5)
  const [totalSessions, setTotalSessions] = useState('')

  // Timer state
  const [status, setStatus] = useState<TimerStatus>('idle')
  const [currentSession, setCurrentSession] = useState(1)
  const [timeLeft, setTimeLeft] = useState(focusMins * 60)
  const [isPaused, setIsPaused] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const alarmRef = useRef<HTMLAudioElement | null>(null)

  // Initialize alarm on mount (lazy to handle SSR if any)
  useEffect(() => {
    alarmRef.current = new Audio('/sounds/alarm.wav')
    alarmRef.current.preload = 'auto'
  }, [])

  const playAlarm = () => {
    if (alarmRef.current) {
      alarmRef.current.currentTime = 0
      alarmRef.current.play().catch(() => {
        // Autoplay blocked or audio failed — silently ignore
      })
    }
  }

  // Sync clock when focus time changes and timer is idle
  useEffect(() => {
    if (status === 'idle') {
      setTimeLeft(focusMins * 60)
      setCurrentSession(1)
    }
  }, [focusMins, status])

  // Parse total sessions (default to 1 if empty or invalid)
  const getTotal = (): number => {
    if (totalSessions.trim() === '') return 1
    const n = parseInt(totalSessions.trim(), 10)
    return isNaN(n) || n < 1 ? 1 : n
  }

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(Math.max(0, seconds) / 60)
    const s = Math.max(0, seconds) % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Cutoff effect: when timer reaches 0, transition to next phase
  useEffect(() => {
    if (timeLeft > 0 || status === 'idle' || status === 'done') return

    const total = getTotal()

    if (status === 'focus') {
      playAlarm()
      if (currentSession < total) {
        setStatus('break')
        setTimeLeft(breakMins * 60)
      } else {
        setStatus('done')
        setTimeLeft(0)
      }
    } else if (status === 'break') {
      playAlarm()
      if (currentSession + 1 <= total) {
        setStatus('focus')
        setCurrentSession(prev => prev + 1)
        setTimeLeft(focusMins * 60)
      } else {
        setStatus('done')
        setTimeLeft(0)
      }
    }
  }, [timeLeft, status, currentSession, breakMins, focusMins, totalSessions])

  // Countdown interval
  useEffect(() => {
    if (status === 'idle' || status === 'done' || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [status, isPaused])

  // Actions
  const startTimer = () => {
    if (!sessionName.trim()) {
      alert('Please enter a session name')
      return
    }
    setStatus('focus')
    setCurrentSession(1)
    setTimeLeft(focusMins * 60)
    setIsPaused(false)
  }

  const handlePause = () => setIsPaused(true)
  const handleResume = () => setIsPaused(false)

  const handleStop = () => {
    setStatus('idle')
    setIsPaused(false)
    setCurrentSession(1)
    setTimeLeft(focusMins * 60)
  }

  const handleSkip = () => {
    const total = getTotal()
    if (status === 'focus') {
      if (currentSession < total) {
        setStatus('break')
        setTimeLeft(breakMins * 60)
      } else {
        setStatus('done')
        setTimeLeft(0)
      }
    } else if (status === 'break') {
      if (currentSession + 1 <= total) {
        setStatus('focus')
        setCurrentSession(prev => prev + 1)
        setTimeLeft(focusMins * 60)
      } else {
        setStatus('done')
        setTimeLeft(0)
      }
    }
  }

  // Determine which time to use for progress calculation
  const getDurationForPhase = () => {
    if (status === 'break') return breakMins * 60
    return focusMins * 60
  }

  // Derived values
  const total = getTotal()
  const isRunning = status === 'focus' || status === 'break'
  const phaseLabel =
    status === 'focus'
      ? 'Deep Focus'
      : status === 'break'
      ? 'Short Break'
      : status === 'done'
      ? 'Complete!'
      : 'Ready'

  // Progress for SVG circle
  const duration = getDurationForPhase()
  const progressPercent = duration > 0 ? ((duration - timeLeft) / duration) * 100 : 0
  const radius = 90
  const circumference = 2 * Math.PI * radius
  const dashoffset = circumference - (circumference * progressPercent) / 100

  return (
    <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-dark-surface/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-dark-border">
        {/* Title */}
        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
          Focus Timer
        </h1>

        <div className="space-y-8">
          {/* Focus Duration */}
          <div>
            <h2 className="text-lg font-semibold text-primary-light mb-3 text-center">
              Focus Session
            </h2>
            <div className="flex flex-wrap gap-2 justify-center">
              {FOCUS_OPTIONS.map(mins => (
                <button
                  key={mins}
                  onClick={() => status === 'idle' && setFocusMins(mins)}
                  disabled={status !== 'idle'}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    focusMins === mins
                      ? 'bg-gradient-to-r from-primary to-primary-light text-dark-bg shadow-glow'
                      : 'bg-dark-elevated text-gray-300 hover:bg-dark-hover border border-dark-border'
                  } ${status !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          {/* Break Duration */}
          <div>
            <h2 className="text-lg font-semibold text-primary-light mb-3 text-center">
              Break Duration
            </h2>
            <div className="flex flex-wrap gap-2 justify-center">
              {BREAK_OPTIONS.map(mins => (
                <button
                  key={mins}
                  onClick={() => status === 'idle' && setBreakMins(mins)}
                  disabled={status !== 'idle'}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    breakMins === mins
                      ? 'bg-gradient-to-r from-primary to-primary-light text-dark-bg shadow-glow'
                      : 'bg-dark-elevated text-gray-300 hover:bg-dark-hover border border-dark-border'
                  } ${status !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          {/* Number of Sessions */}
          <div className="flex items-center justify-center gap-4">
            <label className="text-primary-light font-medium">Number of Sessions</label>
            <input
              type="text"
              value={totalSessions}
              onChange={e => {
                const val = e.target.value
                if (val === '' || /^[0-9]+$/.test(val)) {
                  setTotalSessions(val)
                }
              }}
              placeholder="Leave blank for 1"
              disabled={status !== 'idle'}
              className="w-24 px-3 py-2 bg-dark-elevated border border-dark-border rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
            />
          </div>

          {/* Name of Session */}
          <div className="flex items-center justify-center gap-4">
            <label className="text-primary-light font-medium">Name of Session</label>
            <input
              type="text"
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
              placeholder="e.g. Physics Revision"
              disabled={status !== 'idle'}
              className="w-64 px-3 py-2 bg-dark-elevated border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
            />
          </div>

          {/* Circular Timer */}
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-xl bg-primary/20" />

              <svg width="260" height="260" className="relative z-10 transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="130"
                  cy="130"
                  r={radius}
                  fill="none"
                  stroke="#1c1612"
                  strokeWidth="8"
                />
                {/* Progress circle */}
                <circle
                  cx="130"
                  cy="130"
                  r={radius}
                  fill="none"
                  stroke="url(#timerGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashoffset}
                  className="transition-all duration-1000 ease-linear"
                />
                <defs>
                  <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#d97706" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl font-bold text-white mb-2 text-glow">
                    {formatTime(timeLeft)}
                  </div>
                  <div className="text-sm text-primary-light font-medium">
                    {isPaused ? 'Paused' : phaseLabel}
                  </div>
                  {isRunning && total > 1 && (
                    <div className="text-xs text-gray-400 mt-1">
                      Session {currentSession} of {total}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            {status === 'idle' || status === 'done' ? (
              <button
                onClick={startTimer}
                disabled={!sessionName.trim()}
                className="w-full py-3 px-6 rounded-xl font-semibold text-dark-bg bg-gradient-to-r from-primary to-primary-light hover:opacity-90 transition-opacity shadow-glow disabled:opacity-50"
              >
                {status === 'done' ? 'Start New Session' : 'Start Focus'}
              </button>
            ) : (
              <>
                {isPaused ? (
                  <button
                    onClick={handleResume}
                    className="px-5 py-2.5 rounded-lg font-medium bg-dark-elevated text-white hover:bg-dark-hover transition-colors border border-dark-border shadow-glow"
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="px-5 py-2.5 rounded-lg font-medium bg-dark-elevated text-white hover:bg-dark-hover transition-colors border border-dark-border shadow-glow"
                  >
                    Pause
                  </button>
                )}
                <button
                  onClick={handleSkip}
                  className="px-5 py-2.5 rounded-lg font-medium bg-dark-elevated text-white hover:bg-dark-hover transition-colors border border-dark-border"
                >
                  Skip
                </button>
                <button
                  onClick={handleStop}
                  className="px-5 py-2.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors border border-red-600"
                >
                  Stop
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
