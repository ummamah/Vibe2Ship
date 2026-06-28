import { useState } from 'react'
import { CalendarIcon, PlusIcon, AcademicCapIcon, LightBulbIcon, ClockIcon } from '@heroicons/react/24/solid'
import { plannerService } from '../services/plannerService'
import { TaskPlan, DailyChunk } from '../services/plannerService'

export default function PlanPage() {
  const [tasks, setTasks] = useState<{ id: string; title: string }[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [description, setDescription] = useState('')
  const [plan, setPlan] = useState<TaskPlan | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !deadline) return

    setIsLoading(true)
    setError('')

    try {
      const deadlineDate = new Date(deadline)
      const response = await plannerService.generateDirectPlan(
        title,
        description,
        deadlineDate.toISOString(),
        3  // 3 hours per day
      )

      setPlan(response.plan)
      setTasks(prev => [...prev, { id: response.plan.task_id || Date.now().toString(), title }])

      // Reset form
      setTitle('')
      setDeadline('')
      setDescription('')
      setShowForm(false)
    } catch (err: any) {
      console.error('Plan generation failed:', err)
      setError(err.response?.data?.detail || err.message || 'Failed to generate plan')
    } finally {
      setIsLoading(false)
    }
  }

  const getTodaysTasks = () => {
    if (!plan) return []
    const today = new Date().toISOString().split('T')[0]
    return plan.daily_chunks.filter(chunk => chunk.date.toString().startsWith(today))
  }

  const todayChunks = getTodaysTasks()
  const completedTasks = plan?.daily_chunks.reduce((acc, chunk) =>
    acc + chunk.subtask_names.filter(() => false).length, 0) || 0

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2 text-glow">
          <CalendarIcon className="h-8 w-8 icon-accent" />
          Task Planner & Calendar
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add Task
        </button>
      </div>

      {/* Add Task Form */}
      {showForm && (
        <form onSubmit={handleGeneratePlan} className="card-elevated space-y-4">
          <h3 className="text-xl font-semibold text-white">Add New Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Task Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Math Exam Prep"
                className="input"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your task. Example: 6 chapters to study, 3 are difficult and 2 are easy"
              className="input"
              rows={3}
              required
            />
            <p className="text-xs text-gray-400">
              Tip: Include chapter count and difficulty
            </p>
          </div>
          <button type="submit" className="w-full btn-primary py-2" disabled={isLoading}>
            {isLoading ? 'Generating Plan...' : 'Generate Plan'}
          </button>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </form>
      )}

      {/* Today's Schedule */}
      <div className="card-elevated">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <AcademicCapIcon className="h-6 w-6 icon-primary" />
          Today's Schedule
        </h2>

        {todayChunks.length > 0 ? (
          <div className="space-y-3">
            {todayChunks.map((chunk, idx) => (
              <div
                key={idx}
                className="bg-dark-elevated p-4 rounded-lg border border-primary/30 hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-primary to-primary-light shadow-glow" />
                    <div>
                      {chunk.subtask_names.map((name, i) => (
                        <h3 key={i} className="text-white font-medium">{name}</h3>
                      ))}
                      <p className="text-sm text-gray-300">{chunk.notes}</p>
                    </div>
                  </div>
                  <span className="text-sm text-primary-light">{chunk.total_minutes} min</span>
                </div>
              </div>
            ))}
          </div>
        ) : plan ? (
          <div className="text-center py-8">
            <CalendarIcon className="h-12 w-12 text-dark-hover mx-auto mb-3" />
            <p className="text-gray-400">No tasks scheduled for today</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <LightBulbIcon className="h-12 w-12 text-dark-hover mx-auto mb-3" />
            <p className="text-gray-400">Generate a plan to see your schedule!</p>
          </div>
        )}
      </div>

      {/* Full Plan Timeline */}
      {plan && (
        <div className="card-elevated space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ClockIcon className="h-6 w-6 icon-primary" />
              {plan.title} — Plan Overview
            </h2>
            <span className="text-sm text-primary-light">
              {plan.overall_duration_days} days
            </span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {plan.daily_chunks.map((chunk, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  chunk.is_buffer
                    ? 'bg-dark-surface border-primary/30'
                    : 'bg-dark-elevated border-primary/30 hover:border-primary'
                } transition-colors`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">
                    {new Date(chunk.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                    {chunk.is_buffer && (
                      <span className="ml-2 text-xs text-primary-light bg-primary/10 px-2 py-0.5 rounded">
                        Buffer
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-primary-light">{chunk.total_minutes} min</span>
                </div>
                <p className="text-sm text-gray-300 mb-2">{chunk.notes}</p>
                {chunk.subtask_names.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {chunk.subtask_names.map((name, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-dark-surface text-xs text-gray-300 rounded border border-primary/20"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* AI Insights */}
          {plan.insights.length > 0 && (
            <div className="mt-4 p-4 bg-dark-surface rounded-lg border border-primary/20">
              <h3 className="text-white font-medium mb-2">AI Insights</h3>
              <ul className="space-y-1">
                {plan.insights.map((insight, idx) => (
                  <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                    <LightBulbIcon className="h-4 w-4 text-primary-light flex-shrink-0 mt-0.5" />
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-elevated">
          <h3 className="text-gray-400 text-sm">Total Tasks</h3>
          <p className="text-3xl font-bold text-white text-glow">{tasks.length}</p>
        </div>
        <div className="card-elevated">
          <h3 className="text-gray-400 text-sm">Completed</h3>
          <p className="text-3xl font-bold text-white text-glow">
            0
          </p>
        </div>
        <div className="card-elevated">
          <h3 className="text-gray-400 text-sm">Remaining</h3>
          <p className="text-3xl font-bold text-white text-glow">
            {tasks.length}
          </p>
        </div>
      </div>
    </div>
  )
}