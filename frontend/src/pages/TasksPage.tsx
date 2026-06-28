import { useState, useEffect } from 'react'
import { SparklesIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid'
import { taskService } from '../services/taskService'

import type { Task as TaskType } from '../services/taskService'

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskType[]>([])
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

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2 text-glow">
          <SparklesIcon className="h-8 w-8 icon-primary" />
          AI Task Prioritizer
        </h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          Add Task
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card-elevated space-y-4">
          <h3 className="text-xl font-semibold text-white">Create New Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Task title" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="input" required />
            <input type="datetime-local" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} className="input" />
            <input type="number" placeholder="Duration (minutes)" value={newTask.duration_minutes} onChange={e => setNewTask({...newTask, duration_minutes: Number(e.target.value)})} className="input" />
            <input type="number" placeholder="Importance (0-100)" value={newTask.importance} onChange={e => setNewTask({...newTask, importance: Number(e.target.value)})} className="input" min="0" max="100" />
          </div>
          <textarea placeholder="Description" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="input" rows={3} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="skippable" checked={newTask.is_skippable} onChange={e => setNewTask({...newTask, is_skippable: e.target.checked})} className="h-5 w-5 accent-primary" />
            <label htmlFor="skippable" className="text-gray-300">Skippable task</label>
          </div>
          <button type="submit" className="w-full btn-primary py-2">Create Task</button>
        </form>
      )}

      <div className="space-y-4">
        {tasks.map((task, index) => (
          <div key={task.id} className="card-elevated">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl font-bold text-white">#{index + 1}</span>
                  <h3 className="text-xl font-semibold text-white">{task.title}</h3>
                  {!task.is_skippable && <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded border border-primary/50">Non-skippable</span>}
                </div>
                <p className="text-gray-300 mb-3">{task.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {task.ai_analysis?.ai_insights.map((insight, i) => (
                    <span key={i} className="bg-dark-elevated text-primary-light text-xs px-2 py-1 rounded border border-primary/30">{insight}</span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {task.deadline && <span className="text-primary-light">Date: {new Date(task.deadline).toLocaleDateString()}</span>}
                  <span className="text-yellow-400">Duration: {task.duration_minutes} min</span>
                  <span className="text-primary-light">Score: {task.overall_score?.toFixed(1)}</span>
                </div>
                <div className="mt-3 w-full bg-dark-elevated rounded-full h-2 border border-primary/20">
                  <div className={`h-full rounded-full bg-gradient-to-r from-primary to-primary-light shadow-glow`} style={{ width: `${task.overall_score}%` }} />
                </div>
              </div>
              <button onClick={() => handleDelete(task.id)} className="text-primary hover:text-primary-light transition-colors">
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}