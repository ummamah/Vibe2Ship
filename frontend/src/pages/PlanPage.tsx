import { useState } from 'react'
import { CalendarIcon, PlusIcon, AcademicCapIcon } from '@heroicons/react/24/solid'

interface DailyPlan {
  id: string
  date: string
  tasks: PlanTask[]
}

interface PlanTask {
  id: string
  title: string
  description: string
  duration: number
  completed: boolean
}

export default function PlanPage() {
  const [tasks, setTasks] = useState<PlanTask[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [description, setDescription] = useState('')

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Parse description to create subtasks
    const subtasks = generateSubtasks(title, description, deadline)
    setTasks([...tasks, ...subtasks])
    
    setTitle('')
    setDeadline('')
    setDescription('')
    setShowForm(false)
  }

  const generateSubtasks = (mainTitle: string, desc: string, date: string): PlanTask[] => {
    // Simple AI to parse chapters/difficulty from description
    const subtasks: PlanTask[] = []
    const chaptersMatch = desc.match(/(\d+)\s*chapters?/i)
    const numChapters = chaptersMatch ? parseInt(chaptersMatch[1]) : 3
    
    // Parse difficulty keywords
    const difficultMatch = desc.match(/(\d+)\s*(?:difficult|hard)/i)
    const numDifficult = difficultMatch ? parseInt(difficultMatch[1]) : 0
    
    const easyMatch = desc.match(/(\d+)\s*(?:easy|simple)/i)
    const numEasy = easyMatch ? parseInt(easyMatch[1]) : numChapters - numDifficult
    
    const deadlineDate = new Date(date)
    const today = new Date()
    const daysDiff = Math.max(1, Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
    
    // Distribute chapters across days
    const chaptersPerDay = Math.ceil(numChapters / daysDiff)
    let chapterNum = 1
    
    for (let day = 0; day < daysDiff && chapterNum <= numChapters; day++) {
      for (let i = 0; i < chaptersPerDay && chapterNum <= numChapters; i++) {
        const isDifficult = chapterNum <= numDifficult
        const duration = isDifficult ? 90 : 60
        
        subtasks.push({
          id: `task-${Date.now()}-${chapterNum}`,
          title: `${mainTitle} - Chapter ${chapterNum}`,
          description: isDifficult ? 'Difficult chapter (extra time needed)' : 'Standard reading',
          duration: duration,
          completed: false
        })
        
        chapterNum++
      }
    }
    
    return subtasks
  }

  // Group tasks by day (simplified - groups sequential tasks)
  const getTodaysTasks = () => {
    return tasks.slice(0, 3) // Show first 3 as "today's"
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
       tracker        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <CalendarIcon className="h-8 w-8 text-purple-500" />
          Task Planner & Calendar
        </h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add Task
        </button>
      </div>

      {/* Add Task Form */}
      {showForm && (
        <form onSubmit={handleAddTask} className="bg-gray-800 p-6 rounded-xl space-y-4">
          <h3 className="text-xl font-semibold text-white">Add New Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Task Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Math Exam Prep"
                className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600"
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Deadline</label>
              <input 
                type="date" 
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600"
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
              className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600"
              rows={3}
              required 
            />
            <p className="text-xs text-gray-400">
              Tip: Include chapter count and difficulty (e.g., "6 chapters, 3 difficult, 2 easy")
            </p>
          </div>
          <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-semibold">
            Generate Plan
          </button>
        </form>
      )}

      {/* Calendar View */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <AcademicCapIcon className="h-6 w-6 text-blue-500" />
          Today's Schedule
        </h2>
        
        {getTodaysTasks().length > 0 ? (
          <div className="space-y-3">
            {getTodaysTasks().map((task) => (
              <div 
                key={task.id} 
                className="bg-gray-700 p-4 rounded-lg border border-gray-600 hover:border-blue-500 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${task.completed ? 'bg-green-500' : 'bg-blue-500'}`} />
                    <div>
                      <h3 className="text-white font-medium">{task.title}</h3>
                      <p className="text-sm text-gray-400">{task.description}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-400">{task.duration} min</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CalendarIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No tasks scheduled for today</p>
            <p className="text-sm text-gray-500 mt-1">Add a task to see your plan!</p>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-gray-400 text-sm">Total Tasks</h3>
          <p className="text-3xl font-bold text-white">{tasks.length}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-gray-400 text-sm">Completed</h3>
          <p className="text-3xl font-bold text-white">{tasks.filter(t => t.completed).length}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-gray-400 text-sm">Remaining</h3>
          <p className="text-3xl font-bold text-white">{tasks.filter(t => !t.completed).length}</p>
        </div>
      </div>
    </div>
  )
}