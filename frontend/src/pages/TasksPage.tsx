import { useState, useEffect } from 'react'
import { SparklesIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid'
import { taskService } from '../services/taskService'

interface Task {
  id: string
  title: string
  description: string
  deadline: string | null
  duration_minutes: number
  importance: number
  is_skippable: boolean
  status: string
  overall_score?: number
  ai_analysis?: {
    urgency_score: number
    importance_score: number
    effort_score: number
    overall_priority_score: number
    reasoning: string
    ai_insights: string[]
  }
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState({ title: '', description: '', deadline: '', duration_minutes: 30, importance: 50, is_skippable: true })
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const data = await taskService.getPrioritizedTasks()
      setTasks(data.tasks)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await taskService.createTask({
        ...newTask,
        deadline: newTask.deadline || null
      })
      setNewTask({ title: '', description: '', deadline: '', duration_minutes: 30, importance: 50, is_skippable: true })
      setShowForm(false)
      fetchTasks()
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const handleDelete = async (taskId: string) => {
    try {
      await taskService.deleteTask(taskId)
      fetchTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const getPriorityColor = (score: number) => {
    if (score >= 80) return 'bg-red-500'
    if (score >= 60) return 'bg-orange-500'
    if (score >= 40) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <SparklesIcon className="h-8 w-8 text-blue-500" />
          AI Task Prioritizer
        </h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          Add Task
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-800 p-6 rounded-xl space-y-4">
          <h3 className="text-xl font-semibold text-white">Create New Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Task title" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600" required />
            <input type="datetime-local" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600" />
            <input type="number" placeholder="Duration (minutes)" value={newTask.duration_minutes} onChange={e => setNewTask({...newTask, duration_minutes: Number(e.target.value)})} className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600" />
            <input type="number" placeholder="Importance (0-100)" value={newTask.importance} onChange={e => setNewTask({...newTask, importance: Number(e.target.value)})} className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600" min="0" max="100" />
          </div>
          <textarea placeholder="Description" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600" rows={3} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="skippable" checked={newTask.is_skippable} onChange={e => setNewTask({...newTask, is_skippable: e.target.checked})} className="h-5 w-5" />
            <label htmlFor="skippable" className="text-gray-300">Skippable task</label>
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold">Create Task</button>
        </form>
      )}

      <div className="space-y-4">
        {tasks.map((task, index) => (
          <div key={task.id} className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl font-bold text-white">#{index + 1}</span>
                  <h3 className="text-xl font-semibold text-white">{task.title}</h3>
                  {!task.is_skippable && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">Non-skippable</span>}
                </div>
                <p className="text-gray-400 mb-3">{task.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {task.ai_analysis?.ai_insights.map((insight, i) => (
                    <span key={i} className="bg-blue-900 text-blue-300 text-xs px-2 py-1 rounded">{insight}</span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {task.deadline && <span className="text-red-400">Date: {new Date(task.deadline).toLocaleDateString()}</span>}
                  <span className="text-yellow-400">Duration: {task.duration_minutes} min</span>
                  <span className="text-purple-400">Score: {task.overall_score?.toFixed(1)}</span>
                </div>
                <div className="mt-3 w-full bg-gray-700 rounded-full h-2">
                  <div className={`h-full rounded-full ${getPriorityColor(task.overall_score || 0)}`} style={{ width: `${task.overall_score}%` }} />
                </div>
              </div>
              <button onClick={() => handleDelete(task.id)} className="text-red-400 hover:text-red-300">
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}