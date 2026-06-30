import { useState } from 'react'
import { useFocusTimer } from '../context/FocusTimerContext'

const FOCUS_OPTIONS = [15, 25, 45, 60]
const BREAK_OPTIONS = [5, 10, 15, 20]

export default function FocusTimerPage() {
  const timer = useFocusTimer()

  const [pendingFocusMins, setPendingFocusMins] = useState(timer.focusMins)
  const [pendingBreakMins, setPendingBreakMins] = useState(timer.breakMins)
  const [pendingTotalSessions, setPendingTotalSessions] = useState('')
  const [sessionName, setSessionName] = useState('')

  const isIdle = timer.status === 'idle' || timer.status === 'done'

  const formatTime = (seconds: number) => {
    const safe = Math.max(0, Math.ceil(seconds))
    const m = Math.floor(safe / 60)
    const s = safe % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const getTotal = (): number => {
    if (pendingTotalSessions.trim() === '') return 1
    const n = parseInt(pendingTotalSessions.trim(), 10)
    return isNaN(n) || n < 1 ? 1 : n
  }

  const startTimer = () => {
    if (!sessionName.trim()) {
      alert('Please enter a session name')
      return
    }
    timer.start(sessionName.trim(), pendingFocusMins, pendingBreakMins, getTotal())
  }

  const phaseLabel =
    timer.status === 'focus'
      ? 'Deep Focus'
      : timer.status === 'break'
      ? 'Short Break'
      : timer.status === 'done'
      ? 'Complete!'
      : 'Ready'

  const duration = timer.phaseDurationSec > 0 ? timer.phaseDurationSec : (pendingFocusMins * 60)
  const progressPercent = duration > 0 ? ((duration - timer.timeLeftSec) / duration) * 100 : 0
  const radius = 90
  const circumference = 2 * Math.PI * radius
  const dashoffset = circumference - (circumference * Math.min(100, Math.max(0, progressPercent))) / 100

  const isRunning = timer.status === 'focus' || timer.status === 'break'

  return (
    <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-dark-surface/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-dark-border">
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
                  onClick={() => isIdle && setPendingFocusMins(mins)}
                  disabled={!isIdle}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    pendingFocusMins === mins
                      ? 'bg-gradient-to-r from-primary to-primary-light text-dark-bg shadow-glow'
                      : 'bg-dark-elevated text-gray-300 hover:bg-dark-hover border border-dark-border'
                  } ${!isIdle ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  onClick={() => isIdle && setPendingBreakMins(mins)}
                  disabled={!isIdle}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    pendingBreakMins === mins
                      ? 'bg-gradient-to-r from-primary to-primary-light text-dark-bg shadow-glow'
                      : 'bg-dark-elevated text-gray-300 hover:bg-dark-hover border border-dark-border'
                  } ${!isIdle ? 'opacity-50 cursor-not-allowed' : ''}`}
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
              value={pendingTotalSessions}
              onChange={e => {
                const val = e.target.value
                if (val === '' || /^[0-9]+$/.test(val)) {
                  setPendingTotalSessions(val)
                }
              }}
              placeholder="Leave blank for 1"
              disabled={!isIdle}
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
              disabled={!isIdle}
              className="w-64 px-3 py-2 bg-dark-elevated border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
            />
          </div>

          {/* Circular Timer */}
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-xl bg-primary/20" />

              <svg width="260" height="260" className="relative z-10 transform -rotate-90">
                <circle
                  cx="130"
                  cy="130"
                  r={radius}
                  fill="none"
                  stroke="#1c1612"
                  strokeWidth="8"
                />
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
                    {formatTime(timer.timeLeftSec)}
                  </div>
                  <div className="text-sm text-primary-light font-medium">
                    {timer.isPaused ? 'Paused' : phaseLabel}
                  </div>
                  {isRunning && timer.totalSessions > 1 && (
                    <div className="text-xs text-gray-400 mt-1">
                      Session {timer.currentSession} of {timer.totalSessions}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            {isIdle ? (
              <button
                onClick={startTimer}
                disabled={!sessionName.trim()}
                className="w-full py-3 px-6 rounded-xl font-semibold text-dark-bg bg-gradient-to-r from-primary to-primary-light hover:opacity-90 transition-opacity shadow-glow disabled:opacity-50"
              >
                {timer.status === 'done' ? 'Start New Session' : 'Start Focus'}
              </button>
            ) : (
              <>
                {timer.isPaused ? (
                  <button
                    onClick={timer.resume}
                    className="px-5 py-2.5 rounded-lg font-medium bg-dark-elevated text-white hover:bg-dark-hover transition-colors border border-dark-border shadow-glow"
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={timer.pause}
                    className="px-5 py-2.5 rounded-lg font-medium bg-dark-elevated text-white hover:bg-dark-hover transition-colors border border-dark-border shadow-glow"
                  >
                    Pause
                  </button>
                )}
                <button
                  onClick={timer.skip}
                  className="px-5 py-2.5 rounded-lg font-medium bg-dark-elevated text-white hover:bg-dark-hover transition-colors border border-dark-border"
                >
                  Skip
                </button>
                <button
                  onClick={timer.stop}
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
