import { useState, useEffect } from 'react'
import { FireIcon, ExclamationTriangleIcon, BellAlertIcon } from '@heroicons/react/24/solid'
import { taskService, Task } from '../../services/taskService'

export default function HighPriorityTasksWidget() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchCriticalTasks()
  }, [])

  const fetchCriticalTasks = async () => {
    try {
      const data = await taskService.getPrioritizedTasks()
      const critical = data.tasks
        .filter((t: Task) => t.status !== 'completed' && t.is_critical)
        .sort((a: Task, b: Task) => {
          if (!a.deadline) return 1
          if (!b.deadline) return -1
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        })
      setTasks(critical)
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching critical tasks:', error)
      setIsLoading(false)
    }
  }

  const getTimeUntilDeadline = (deadline: string) => {
    const diff = new Date(deadline).getTime() - new Date().getTime()
    if (diff < 0) return 'Overdue'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Less than 1 hour'
    if (hours < 24) return `${hours}h left`
    const days = Math.floor(hours / 24)
    return `${days}d left`
  }

  const isUrgent = (deadline: string) => {
    const diff = new Date(deadline).getTime() - new Date().getTime()
    return diff < 12 * 60 * 60 * 1000
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-dark-elevated rounded w-1/2"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-dark-elevated rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card flex flex-col">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <FireIcon className="h-6 w-6 text-red-500" />
        Critical Priority
        <span className="text-xs text-gray-400 ml-auto">Sorted by deadline</span>
      </h2>

      <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar">
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <ExclamationTriangleIcon className="h-10 w-10 text-earth-600 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No critical tasks pending</p>
            <p className="text-xs text-gray-500 mt-1">AI-flagged tasks with high consequences appear here</p>
          </div>
        ) : (
          tasks.map((task, index) => {
            const urgent = task.deadline ? isUrgent(task.deadline) : false
            return (
              <div
                key={task.id}
                className={`p-3 rounded-lg bg-dark-elevated border-l-4 hover:bg-dark-hover transition-all duration-200 group ${
                  urgent ? 'border-red-500 animate-pulse-slow' : 'border-orange-500'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-red-400">
                        #{index + 1}
                      </span>
                      <p className="text-white font-medium text-sm truncate group-hover:text-red-300 transition-colors">
                        {task.title}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-1">
                      {task.description || 'No description'}
                    </p>
                    {task.deadline && (
                      <div className="flex items-center gap-2 mt-1">
                        <p className={`text-xs font-medium ${
                          urgent ? 'text-red-400' : 'text-orange-300'
                        }`}>
                          Due: {new Date(task.deadline).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                        {urgent && (
                          <span className="text-xs text-red-400 flex items-center gap-1">
                            <BellAlertIcon className="h-3 w-3" />
                            {getTimeUntilDeadline(task.deadline)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full text-white font-medium flex-shrink-0 ${
                    urgent
                      ? 'bg-red-500 animate-pulse'
                      : 'bg-gradient-to-r from-orange-500 to-red-500'
                  }`}>
                    {urgent ? 'URGENT' : 'Critical'}
                  </span>
                </div>
                {task.overall_score && (
                  <div className="mt-2 w-full bg-dark-bg rounded-full h-1.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 shadow-glow transition-all duration-500"
                      style={{ width: `${task.overall_score}%` }}
                    />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {tasks.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-2">
            <FireIcon className="h-4 w-4 text-red-400" />
            <p className="text-xs text-red-300">
              {tasks.length} critical task{tasks.length !== 1 ? 's' : ''} requiring immediate attention
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
