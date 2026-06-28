import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { taskService } from '../../services/taskService'

interface Notification {
  id: string
  taskId: string
  type: 'reminder' | 'critical'
  message: string
  hoursUntil: number
  isCritical: boolean
  alarm: boolean
}

interface NotificationContextType {
  notifications: Notification[]
  activeNotification: Notification | null
  dismissNotification: () => void
  isPlayingAlarm: boolean
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  activeNotification: null,
  dismissNotification: () => {},
  isPlayingAlarm: false,
})

export const useNotifications = () => useContext(NotificationContext)

interface NotificationProviderProps {
  children: ReactNode
}

export default function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null)
  const [isPlayingAlarm, setIsPlayingAlarm] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const alarmTimerRef = useRef<number | null>(null)

  // Play alarm sound for 10 seconds
  const playAlarm = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/alarm.wav')
    }
    
    const audio = audioRef.current
    audio.loop = true
    audio.volume = 0.7
    
    audio.play().catch(err => console.log('Audio play failed:', err))
    setIsPlayingAlarm(true)
    
    // Stop after 10 seconds
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      setIsPlayingAlarm(false)
    }, 10000)
  }, [])

  // Check for new notifications
  const checkNotifications = useCallback(async () => {
    try {
      const data = await taskService.checkNotifications()
      const newNotifications = data.notifications.map((n: any, index: number) => ({
        id: `notif-${n.task_id}-${index}-${Date.now()}`,
        taskId: n.task_id,
        type: n.type as 'reminder' | 'critical',
        message: n.message,
        hoursUntil: n.hours_until,
        isCritical: n.is_critical,
        alarm: n.alarm,
      }))
      
      setNotifications(newNotifications)
      
      // Show the first active notification that's not showing yet
      if (newNotifications.length > 0 && !activeNotification) {
        const firstNotification = newNotifications[0]
        setActiveNotification(firstNotification)
        
        if (firstNotification.alarm) {
          playAlarm()
        }
      }
    } catch (error) {
      console.error('Failed to check notifications:', error)
    }
  }, [activeNotification, playAlarm])

  const dismissNotification = useCallback(() => {
    setActiveNotification(null)
    
    // Stop alarm if playing
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlayingAlarm(false)
    
    if (alarmTimerRef.current) {
      clearTimeout(alarmTimerRef.current)
    }
  }, [])

  useEffect(() => {
    // Check immediately, then every minute
    checkNotifications()
    const interval = setInterval(checkNotifications, 60000)
    
    return () => clearInterval(interval)
  }, [checkNotifications])

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      activeNotification, 
      dismissNotification,
      isPlayingAlarm 
    }}>
      {children}
    </NotificationContext.Provider>
  )
}
