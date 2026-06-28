import { useState, useEffect } from 'react'
import { CheckCircleIcon, CalendarIcon } from '@heroicons/react/24/solid'
import { taskService, Task } from '../../services/taskService'
import { calendarStorage, CalendarPortion } from '../../utils/calendarStorage'

interface UpcomingTasksWidgetProps {
  onStatusChange?: () => void
}

interface CombinedItem {
  id: string
  title: string
  description?: string
  deadline?: string | null
  duration_minutes?: number
  priority?: string
  isCritical?: boolean
  isDivision: boolean
  completed?: boolean
}

export default function UpcomingTasksWidget({ onStatusChange }: UpcomingTasksWidgetProps) {
  const [items, setItems] = useState<CombinedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchTodaysDivisions()
  }, [])

  const fetchTodaysDivisions = async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const todaysPortions: CalendarPortion[] = calendarStorage.getPortions().filter(p => {
        const portionDate = new Date(p.date)
        return portionDate >= today && portionDate < tomorrow
      })

      const fetchedTasks = await taskService.getTasks()
      const todayTasks: CombinedItem[] = fetchedTasks.tasks
        .filter((t: Task) => t.status !== 'completed')
        .filter((t: Task) => {
          if (!t.deadline) return false
          const deadline = new Date(t.deadline)
          return deadline >= today && deadline < tomorrow
        })
        .map((t: Task) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          deadline: t.deadline,
          priority: t.priority ?? undefined,
          isCritical: t.is_critical,
          isDivision: false,
        }))

      const divisions: CombinedItem[] = todaysPortions.map((p: CalendarPortion) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        duration_minutes: p.duration,
        priority: p.priority,
        isDivision: true,
        completed: p.completed,
      }))

      const combined: CombinedItem[] = [...todayTasks, ...divisions]
      setItems(combined)
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching today\'s tasks:', error)
      setIsLoading(false)
    }
  }

  const handleToggleDivision = async (portionId: string) => {
    const portions = calendarStorage.getPortions()
    const updated = portions.map(p =>
      p.id === portionId ? { ...p, completed: !p.completed } : p
    )
    calendarStorage.savePortions(updated)
    fetchTodaysDivisions()
    onStatusChange?.()
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      setCompletedIds(prev => new Set([...prev, taskId]))
      await taskService.updateTaskStatus(taskId, 'completed')
      setTimeout(() => {
        setItems(prev => prev.filter(i => i.id !== taskId))
        setCompletedIds(prev => {
          const next = new Set(prev)
          next.delete(taskId)
          return next
        })
      }, 500)
      onStatusChange?.()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const getPriorityStyles = (item: CombinedItem) => {
    if (item.isCritical) return 'bg-gradient-to-r from-red-500 to-orange-500 shadow-glow'
    if (item.priority === 'high') return 'bg-gradient-to-r from-primary to-accent-pink'
    if (item.priority === 'medium') return 'bg-gradient-to-r from-primary to-primary-light'
    return 'bg-gradient-to-r from-earth-600 to-earth-500'
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-dark-elevated rounded w-1/3"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-dark-elevated rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <CheckCircleIcon className="h-6 w-6 icon-primary" />
        Today's Tasks & Divisions
      </h2>

      <div className="space-y-3 min-h-[200px]">
        {items.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircleIcon className="h-12 w-12 text-primary/40 mx-auto mb-2" />
            <p className="text-gray-400">All clear for today! 🎉</p>
            <p className="text-xs text-gray-500 mt-1">Schedule tasks from the calendar to see them here</p>
          </div>
        ) : (
          items.slice(0, 8).map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-lg bg-dark-elevated hover:bg-dark-hover transition-all duration-300 group ${
                item.completed || completedIds.has(item.id) ? 'opacity-50 scale-95' : ''
              }`}
            >
              <div className={`w-1 h-12 rounded-full ${getPriorityStyles(item)}`} />
              <CalendarIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-white font-medium ${item.completed ? 'line-through' : ''}`}>
                    {item.title}
                  </p>
                  {item.isCritical && !item.completed && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                      Critical
                    </span>
                  )}
                  {item.isDivision && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                      Division
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400">
                  {item.duration_minutes ? `${item.duration_minutes} min` : ''}
                  {item.deadline && !item.isDivision ? `Due: ${new Date(item.deadline).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}
                </p>
              </div>
              <button
                onClick={() => item.isDivision ? handleToggleDivision(item.id) : handleCompleteTask(item.id)}
                className={`h-5 w-5 rounded border-2 transition-all duration-200 flex items-center justify-center flex-shrink-0 ${
                  item.completed || completedIds.has(item.id)
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-600 hover:border-primary hover:bg-primary/20'
                }`}
              >
                {(item.completed || completedIds.has(item.id)) && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
