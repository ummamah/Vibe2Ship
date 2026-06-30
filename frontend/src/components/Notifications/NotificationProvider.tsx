import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { taskService } from '../../services/taskService'

export type NotificationType = 'reminder' | 'critical' | 'focus_complete' | 'break_complete'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  alarm?: boolean
}

interface NotificationContextType {
  notifications: Notification[]
  activeNotification: Notification | null
  dismissNotification: (id?: string) => void
  dismissAllNotifications: () => void
  isPlayingAlarm: boolean
  pushNotification: (n: Omit<Notification, 'id'>) => void
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  activeNotification: null,
  dismissNotification: () => {},
  dismissAllNotifications: () => {},
  isPlayingAlarm: false,
  pushNotification: () => {},
})

export const useNotifications = () => useContext(NotificationContext)

interface NotificationProviderProps {
  children: ReactNode
}

let pushCounter = 0
const nextPushId = () => `push-${Date.now()}-${++pushCounter}`

interface TaskNotification {
  task_id: string
  type: string
  message: string
  hours_until: number
  is_critical: boolean
  alarm: boolean
}

const DISMISS_KEY = 'dismissed_task_notifications_v1'

const loadDismissed = (): string[] => {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : []
  } catch {
    return []
  }
}

const saveDismissed = (ids: string[]) => {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify(ids))
  } catch {
    // ignore
  }
}

export default function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null)
  const [isPlayingAlarm, setIsPlayingAlarm] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const alarmTimerRef = useRef<number | null>(null)
  const dismissedTaskIdsRef = useRef<string[]>(loadDismissed())
  const isCheckingRef = useRef(false)
  const notificationShownRef = useRef(false)

  const playAlarm = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/alarm.wav')
    }

    const audio = audioRef.current
    audio.loop = true
    audio.volume = 0.7

    audio.play().catch(err => console.log('Audio play failed:', err))
    setIsPlayingAlarm(true)

    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      setIsPlayingAlarm(false)
    }, 10000)
  }, [])

  const checkNotifications = useCallback(async () => {
    if (isCheckingRef.current) return
    isCheckingRef.current = true
    notificationShownRef.current = false

    try {
      const data = await taskService.checkNotifications()
      const dismissed = new Set(dismissedTaskIdsRef.current)
      const fresh: Notification[] = []
      for (const n of (data.notifications || []) as TaskNotification[]) {
        if (dismissed.has(n.task_id)) continue
        fresh.push({
          id: `task-${n.task_id}`,
          type: (n.type === 'critical' ? 'critical' : 'reminder') as NotificationType,
          title: n.is_critical ? 'Critical Task Alert' : 'Task Reminder',
          message: n.message,
          alarm: !!n.alarm,
        })
      }

      setNotifications(prev => {
        const existingNonTask = prev.filter(p => !p.id.startsWith('task-'))
        if (existingNonTask.length > 0) return [...existingNonTask, ...fresh]
        if (prev.length === 0) return fresh
        const existingTaskIds = new Set(prev.filter(p => p.id.startsWith('task-')).map(p => p.id))
        const trulyNew = fresh.filter(p => !existingTaskIds.has(p.id))
        return trulyNew.length > 0 ? [...prev.filter(p => !p.id.startsWith('task-')), ...trulyNew] : prev
      })

      if (fresh.length > 0 && !notificationShownRef.current) {
        notificationShownRef.current = true
        const firstNotification = fresh[0]
        setActiveNotification(firstNotification)

        if (firstNotification.alarm) {
          playAlarm()
        }

        setTimeout(() => {
          setActiveNotification(null)
        }, 10000)
      }
    } catch (error) {
      console.error('Failed to check notifications:', error)
    } finally {
      isCheckingRef.current = false
    }
  }, [playAlarm])

  const pushNotification = useCallback((n: Omit<Notification, 'id'>) => {
    const id = nextPushId()
    const notification: Notification = { id, ...n }
    setNotifications(prev => {
      if (prev.some(p => p.id === id)) return prev
      return [...prev, notification]
    })
    setActiveNotification(prev => (prev ? prev : notification))
  }, [])

  const taskIdFromNotificationId = (id?: string): string | null => {
    if (!id) return null
    if (id.startsWith('task-')) return id.slice('task-'.length)
    return null
  }

  const recordDismissed = (id?: string) => {
    const taskId = taskIdFromNotificationId(id)
    if (!taskId) return
    if (dismissedTaskIdsRef.current.includes(taskId)) return
    dismissedTaskIdsRef.current = [...dismissedTaskIdsRef.current, taskId]
    saveDismissed(dismissedTaskIdsRef.current)
  }

  const dismissNotification = useCallback((id?: string) => {
    if (id) {
      const taskId = taskIdFromNotificationId(id)
      if (taskId) recordDismissed(taskId)
      setNotifications(prev => prev.filter(n => n.id !== id))
    }

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlayingAlarm(false)

    if (alarmTimerRef.current) {
      clearTimeout(alarmTimerRef.current)
    }
  }, [])

  const dismissAllNotifications = useCallback(() => {
    // Persist all currently-displayed task ids so polling does not recycle them.
    setNotifications(prev => {
      const taskIds = prev
        .map(n => taskIdFromNotificationId(n.id))
        .filter((x): x is string => !!x)
      if (taskIds.length > 0) {
        const merged = Array.from(new Set([...dismissedTaskIdsRef.current, ...taskIds]))
        dismissedTaskIdsRef.current = merged
        saveDismissed(merged)
      }
      return []
    })
    setActiveNotification(null)

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
    checkNotifications()
    const interval = setInterval(checkNotifications, 60000)

    return () => clearInterval(interval)
  }, [checkNotifications])

  return (
    <NotificationContext.Provider value={{
      notifications,
      activeNotification,
      dismissNotification,
      dismissAllNotifications,
      isPlayingAlarm,
      pushNotification,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}
