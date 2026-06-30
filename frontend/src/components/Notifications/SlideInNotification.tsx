import { useState, useEffect } from 'react'
import { useNotifications, Notification } from './NotificationProvider'

const TYPE_STYLES: Record<Notification['type'], { border: string; bg: string; dot: string; title: string }> = {
  reminder: {
    border: 'border-primary/50',
    bg: 'bg-primary/10',
    dot: 'bg-primary',
    title: 'text-primary',
  },
  critical: {
    border: 'border-red-500/50',
    bg: 'bg-red-500/10',
    dot: 'bg-red-500',
    title: 'text-red-400',
  },
  focus_complete: {
    border: 'border-primary/70',
    bg: 'bg-gradient-to-br from-primary/20 to-primary-light/10',
    dot: 'bg-primary',
    title: 'text-primary-light',
  },
  break_complete: {
    border: 'border-amber-500/60',
    bg: 'bg-amber-500/10',
    dot: 'bg-amber-400',
    title: 'text-amber-300',
  },
}

export default function SlideInNotification() {
  const { activeNotification, dismissNotification, isPlayingAlarm } = useNotifications()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (activeNotification) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => dismissNotification(), 500)
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [activeNotification, dismissNotification])

  if (!activeNotification) return null

  const styles = TYPE_STYLES[activeNotification.type] ?? TYPE_STYLES.reminder

  return (
    <div className={`fixed bottom-4 right-4 z-[70] max-w-sm w-full transform transition-all duration-500 ease-out ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`rounded-2xl border p-4 shadow-2xl backdrop-blur-lg ${styles.bg} ${styles.border}`}>
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full animate-pulse ${styles.dot}`} />

          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-bold ${styles.title}`}>
              {activeNotification.title}
            </h4>
            <p className="text-gray-200 text-sm mt-1">{activeNotification.message}</p>

            {isPlayingAlarm && (
              <p className="text-xs text-red-400 mt-2 animate-pulse">
                Alarm active! Click to dismiss.
              </p>
            )}
          </div>

          <button
            onClick={() => {
              setIsVisible(false)
              setTimeout(() => dismissNotification(), 500)
            }}
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors text-xs uppercase tracking-wider font-medium"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
