import { useState, useEffect } from 'react'
import { ChartBarIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/solid'
import { focusService } from '../services/focusService'
import { taskService } from '../services/taskService'

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])

  useEffect(() => {
    fetchAnalytics().catch(console.error)
    fetchTasks().catch(console.error)
  }, [])

  const fetchAnalytics = async () => {
    try {
      const data = await focusService.getAnalytics()
      setAnalytics(data.analytics)
    } catch (err) {
      console.error('Error fetching focus analytics:', err)
    }
  }

  const fetchTasks = async () => {
    try {
      const data = await taskService.getPrioritizedTasks()
      setTasks(data.tasks)
    } catch (err) {
      console.error('Error fetching tasks:', err)
    }
  }

  // Dummy data for testing
  const stats = {
    totalFocusTime: analytics?.total_focus_hours || 0,
    totalSessions: analytics?.total_sessions || 0,
    completionRate: analytics?.completion_rate || 0,
    totalTasks: tasks.length
  }

  if (tasks.length === 0 && !analytics) {
  return (
    <div className="pb-20 lg:pb-6">
      <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
        <ChartBarIcon className="h-8 w-8 text-green-500" />
        Analytics Dashboard
      </h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <ClockIcon className="h-6 w-6 text-blue-500" />
            <span className="text-gray-400">Focus Time</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalFocusTime}h</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircleIcon className="h-6 w-6 text-purple-500" />
            <span className="text-gray-400">Sessions</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalSessions}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <ChartBarIcon className="h-6 w-6 text-green-500" />
            <span className="text-gray-400">Completion</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.completionRate}%</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <ChartBarIcon className="h-6 w-6 text-yellow-500" />
            <span className="text-gray-400">Total Tasks</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalTasks}</p>
        </div>
      </div>

      {/* Task Priority List */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Top Priority Tasks</h2>
        <div className="space-y-3">
          {tasks.slice(0, 5).map((task, index) => (
            <div key={task.id} className="flex items-center gap-4 p-3 bg-gray-700 rounded-lg">
              <span className="text-lg font-bold text-white">#{index + 1}</span>
              <div className="flex-1">
                <p className="text-white font-medium">{task.title}</p>
                <p className="text-sm text-gray-400">Score: {task.overall_score?.toFixed(1)}</p>
              </div>
              <div className="w-32 bg-gray-600 rounded-full h-2">
                <div 
                  className={`h-full rounded-full ${
                    task.overall_score > 70 ? 'bg-red-500' : 
                    task.overall_score > 40 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${task.overall_score}%` }} 
                />
              </div>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-gray-400">No tasks yet</p>}
        </div>
      </div>
    </div>
  )
}
}
