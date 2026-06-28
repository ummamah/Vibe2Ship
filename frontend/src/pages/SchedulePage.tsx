import { useState, useEffect } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, PlusIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon, SparklesIcon } from '@heroicons/react/24/solid'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { format, addDays, differenceInDays, startOfDay } from 'date-fns'
import { taskService } from '../services/taskService'
import { plannerService, DailyChunk, defaultPreferences } from '../services/plannerService'
import PlanPreviewModal from '../components/Calendar/PlanPreviewModal'
import TaskDetailModal from '../components/Tasks/TaskDetailModal'
import { calendarStorage, CalendarPortion } from '../utils/calendarStorage'

interface TaskPortion {
  id: string
  parentTaskId: string
  title: string
  description: string
  date: Date
  time: string
  duration: number // in minutes
  priority: 'high' | 'medium' | 'low'
  completed: boolean
  portionNumber: number
  totalPortions: number
}

interface Task {
  id: string
  title: string
  description: string
  deadline: Date | null
  estimatedHours: number
  priority: 'high' | 'medium' | 'low'
  completed: boolean
  portions: TaskPortion[]
  createdAt: Date
}

interface DayData {
  tasks: TaskPortion[]
}

// Helper function to break down tasks into portions
const breakdownTask = (task: Task, startDate: Date): TaskPortion[] => {
  if (!task.deadline) return []
  
  const today = startOfDay(new Date())
  const start = startOfDay(startDate) > today ? startOfDay(startDate) : today
  const deadline = startOfDay(task.deadline)
  const daysAvailable = differenceInDays(deadline, start)
  
  if (daysAvailable <= 0) return []
  
  const totalMinutes = task.estimatedHours * 60
  const maxDailyMinutes = 120 // Max 2 hours per day per task
  
  // Calculate how many portions we need
  const minPortions = Math.ceil(totalMinutes / maxDailyMinutes)
  const actualPortions = Math.min(minPortions, daysAvailable)
  const minutesPerPortion = Math.ceil(totalMinutes / actualPortions)
  
  const portions: TaskPortion[] = []
  const interval = Math.max(1, Math.floor(daysAvailable / actualPortions))
  
  for (let i = 0; i < actualPortions; i++) {
    const portionDate = addDays(start, i * interval)
    if (portionDate <= deadline) {
      portions.push({
        id: `${task.id}-portion-${i + 1}`,
        parentTaskId: task.id,
        title: `${task.title} - Part ${i + 1}/${actualPortions}`,
        description: task.description,
        date: portionDate,
        time: '09:00 AM', // Default time, can be customized
        duration: minutesPerPortion,
        priority: task.priority,
        completed: false,
        portionNumber: i + 1,
        totalPortions: actualPortions
      })
    }
  }
  
  return portions
}

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksData, setTasksData] = useState<Record<string, DayData>>({})
  const [showCompletedDropdown, setShowCompletedDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPlanPreview, setShowPlanPreview] = useState(false)
  const [pendingPlan, setPendingPlan] = useState<any>(null)
  const [pendingTaskId, setPendingTaskId] = useState<string>('')
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<any>(null)
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false)
  
  // Load calendar portions from localStorage on mount
  useEffect(() => {
    calendarStorage.cleanupOldPortions()
    const stored = calendarStorage.getPortions()
    if (stored.length > 0) {
      // Group portions by parent task
      const grouped: Record<string, CalendarPortion[]> = {}
      stored.forEach(p => {
        if (!grouped[p.parentTaskId]) grouped[p.parentTaskId] = []
        grouped[p.parentTaskId].push(p)
      })

      // Convert to Task objects
      const loadedTasks: Task[] = Object.entries(grouped).map(([parentId, portions]) => {
        const firstPortion = portions[0]
        return {
          id: parentId,
          title: firstPortion.title.split(' - Part')[0],
          description: firstPortion.description,
          deadline: null,
          estimatedHours: 0,
          priority: firstPortion.priority,
          completed: portions.every(p => p.completed),
          portions: portions.map(p => ({ ...p, date: new Date(p.date) })),
          createdAt: new Date()
        }
      })
      setTasks(loadedTasks)
    }
  }, [])
  
  // Form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    deadline: '',
    estimatedHours: 1,
    approximateTime: 60,
    priority: 'medium' as 'high' | 'medium' | 'low',
    planForTask: false
  })

  // Update calendar data when tasks change
  useEffect(() => {
    const calendarData: Record<string, DayData> = {}
    
    tasks.forEach(task => {
      task.portions.forEach(portion => {
        const dateKey = format(portion.date, 'yyyy-MM-dd')
        if (!calendarData[dateKey]) {
          calendarData[dateKey] = { tasks: [] }
        }
        calendarData[dateKey].tasks.push(portion)
      })
    })
    
    setTasksData(calendarData)
  }, [tasks])
  
  const handleAddTask = async () => {
    if (!newTask.title || !newTask.deadline) {
      alert('Please fill in task title and deadline')
      return
    }
    
    setIsLoading(true)
    
    try {
      // Create task on backend
      const created = await taskService.createTask({
        title: newTask.title,
        description: newTask.description,
        deadline: newTask.deadline,
        duration_minutes: newTask.estimatedHours * 60,
        priority: newTask.priority,
        category: 'Study',
        tags: [],
        energy_required: 'medium'
      })
      
      const taskId = created.task.id
      const deadline = new Date(newTask.deadline)
      
      if (newTask.planForTask) {
        // Generate AI plan directly (zero-step flow)
        const { plan } = await plannerService.generateAIPlan(taskId, defaultPreferences)
        
        // Convert plan.daily_chunks -> TaskPortion[]
        const portions: TaskPortion[] = []
        let portionCounter = 1
        
        plan.daily_chunks.forEach((chunk) => {
          const minutesPerSubtask = chunk.subtask_names.length > 0
            ? Math.floor(chunk.total_minutes / chunk.subtask_names.length)
            : 0
          
          chunk.subtask_names.forEach((subtaskName) => {
            portions.push({
              id: `${taskId}-portion-${portionCounter}`,
              parentTaskId: taskId,
              title: subtaskName,
              description: newTask.description,
              date: new Date(chunk.date),
              time: '09:00 AM',
              duration: minutesPerSubtask,
              priority: newTask.priority,
              completed: false,
              portionNumber: portionCounter,
              totalPortions: plan.daily_chunks.reduce((acc, c) => acc + c.subtask_names.length, 0)
            })
            portionCounter++
          })
        })
        
        const task: Task = {
          id: taskId,
          title: newTask.title,
          description: newTask.description,
          deadline,
          estimatedHours: newTask.estimatedHours,
          priority: newTask.priority,
          completed: false,
          portions,
          createdAt: new Date()
        }
        
        setTasks(prev => [...prev, task])
        setShowAddTaskModal(false)
        resetForm()
        return
      }
      
      // Fallback: local breakdown
      const task: Task = {
        id: taskId,
        title: newTask.title,
        description: newTask.description,
        deadline,
        estimatedHours: newTask.estimatedHours,
        priority: newTask.priority,
        completed: false,
        portions: [],
        createdAt: new Date()
      }
      
      task.portions = breakdownTask(task, new Date())
      setTasks(prev => [...prev, task])
      setShowAddTaskModal(false)
      resetForm()
      
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Failed to create task. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  const resetForm = () => {
    setNewTask({
      title: '',
      description: '',
      deadline: '',
      estimatedHours: 1,
      approximateTime: 60,
      priority: 'medium',
      planForTask: false
    })
  }

  const handleGenerateAIPlan = async () => {
    if (!newTask.title || !newTask.description || !newTask.deadline) {
      alert('Please fill in task title, description, and deadline')
      return
    }

    setIsLoading(true)
    try {
      const created = await taskService.createTask({
        title: newTask.title,
        description: newTask.description,
        deadline: newTask.deadline,
        duration_minutes: newTask.approximateTime,
        approximate_time_minutes: newTask.approximateTime,
        priority: newTask.priority,
        category: 'Study',
        tags: [],
        energy_required: 'medium'
      })

      const taskId = created.task.id
      const { plan } = await plannerService.generateAIPlan(taskId, defaultPreferences)

      setPendingPlan(plan)
      setPendingTaskId(taskId)
      setShowAddTaskModal(false)
      setShowPlanPreview(true)
    } catch (error) {
      console.error('Error generating AI plan:', error)
      alert('Failed to generate AI plan. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const finalizePlan = (editedPlan: { title: string; daily_chunks: DailyChunk[] }) => {
    const taskId = pendingTaskId
    const deadline = new Date(newTask.deadline)
    const portions: CalendarPortion[] = []
    let portionCounter = 1

    editedPlan.daily_chunks.forEach((chunk) => {
      const minutesPerSubtask = chunk.subtask_names.length > 0
        ? Math.floor(chunk.total_minutes / chunk.subtask_names.length)
        : 0

      chunk.subtask_names.forEach((subtaskName) => {
        portions.push({
          id: `${taskId}-portion-${portionCounter}`,
          parentTaskId: taskId,
          title: subtaskName,
          description: newTask.description,
          date: new Date(chunk.date).toISOString(),
          time: '09:00 AM',
          duration: minutesPerSubtask,
          priority: newTask.priority,
          completed: false,
          portionNumber: portionCounter,
          totalPortions: editedPlan.daily_chunks.reduce((acc, c) => acc + c.subtask_names.length, 0)
        })
        portionCounter++
      })
    })

    const existing = calendarStorage.getPortions()
    calendarStorage.savePortions([...existing.filter(p => p.parentTaskId !== taskId), ...portions])

    const taskPortions: TaskPortion[] = portions.map(p => ({
      ...p,
      date: new Date(p.date)
    }))

    const task: Task = {
      id: taskId,
      title: newTask.title,
      description: newTask.description,
      deadline,
      estimatedHours: newTask.estimatedHours,
      priority: newTask.priority,
      completed: false,
      portions: taskPortions,
      createdAt: new Date()
    }

    setTasks(prev => [...prev.filter(t => t.id !== taskId), task])
    setShowPlanPreview(false)
    setPendingPlan(null)
    setPendingTaskId('')
    resetForm()
  }
  
  const toggleTaskCompletion = async (portionId: string, parentTaskId: string) => {
    setTasks(tasks.map(task => ({
      ...task,
      portions: task.portions.map(portion =>
        portion.id === portionId
          ? { ...portion, completed: !portion.completed }
          : portion
      )
    })))
    
    // Optional: Update parent task status when all portions are complete
    const task = tasks.find(t => t.id === parentTaskId)
    if (task) {
      const updatedPortions = task.portions.map(p => 
        p.id === portionId ? { ...p, completed: !p.completed } : p
      )
      const allComplete = updatedPortions.every(p => p.completed)
      
      if (allComplete) {
        try {
          await taskService.updateTaskStatus(parentTaskId, 'completed')
        } catch (error) {
          console.error('Error updating task status:', error)
        }
      }
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    return { firstDay, daysInMonth }
  }

  const { firstDay, daysInMonth } = getDaysInMonth(currentDate)

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
    setSelectedDay(null)
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
    setSelectedDay(null)
  }

  const isToday = (day: number) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-gradient-to-r from-primary to-accent-pink'
      case 'medium': return 'bg-gradient-to-r from-earth-500 to-earth-600'
      case 'low': return 'bg-gradient-to-r from-earth-600 to-earth-700'
      default: return 'bg-dark-hover'
    }
  }
  
  const getTasksForDay = (day: number): TaskPortion[] => {
    const dateKey = format(
      new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
      'yyyy-MM-dd'
    )
    return tasksData[dateKey]?.tasks || []
  }
  
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
    if (hours > 0) return `${hours}h`
    return `${mins}m`
  }

  return (
    <div className="pb-20 lg:pb-6 space-y-6">
      {/* Header */}
      <div className="card-elevated">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2">Schedule & Calendar</h1>
            <p className="text-gray-400">Plan your study sessions and track your progress</p>
          </div>
          <button 
            onClick={() => setShowAddTaskModal(true)}
            className="btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2 inline" />
            Add Task
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="card">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={previousMonth}
                  className="p-2 rounded-lg bg-dark-elevated hover:bg-dark-hover transition-colors"
                >
                  <ChevronLeftIcon className="h-5 w-5 text-gray-300" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-lg bg-dark-elevated hover:bg-dark-hover transition-colors"
                >
                  <ChevronRightIcon className="h-5 w-5 text-gray-300" />
                </button>
              </div>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-gray-400 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: firstDay }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1
                const dayTasks = getTasksForDay(day)
                const taskCount = dayTasks.length
                const isSelected = selectedDay === day
                const today = isToday(day)

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`
                      aspect-square p-2 rounded-xl transition-all duration-200 relative
                      ${today ? 'ring-2 ring-primary' : ''}
                      ${isSelected 
                        ? 'bg-gradient-primary text-white shadow-glow scale-105' 
                        : taskCount > 0
                          ? 'bg-dark-elevated hover:bg-dark-hover text-white' 
                          : 'bg-dark-surface hover:bg-dark-elevated text-gray-400'
                      }
                    `}
                  >
                    <div className="flex flex-col h-full">
                      <span className={`text-sm font-semibold ${today && !isSelected ? 'text-primary' : ''}`}>
                        {day}
                      </span>
                      {taskCount > 0 && (
                        <div className="flex-1 flex items-center justify-center">
                          <div className={`
                            text-xs px-2 py-1 rounded-full
                            ${isSelected 
                              ? 'bg-white/20 text-white' 
                              : 'bg-primary/20 text-primary'
                            }
                          `}>
                            {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Tasks Panel */}
        <div className="lg:col-span-1">
          <div className="card sticky top-20 max-h-[calc(100vh-100px)] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 sticky top-0 bg-dark-card pb-2 z-10">
              <ClockIcon className="h-6 w-6 icon-primary" />
              {selectedDay ? `Tasks for ${monthNames[currentDate.getMonth()]} ${selectedDay}` : 'Select a Day'}
            </h3>

            {selectedDay ? (
              (() => {
                const dayTasks = getTasksForDay(selectedDay)
                const upcomingTasks = dayTasks.filter(task => !task.completed)
                const completedTasks = dayTasks.filter(task => task.completed)
                
                return dayTasks.length > 0 ? (
                  <div className="space-y-6">
                    {/* Upcoming Tasks */}
                    {upcomingTasks.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary"></span>
                          Upcoming Tasks ({upcomingTasks.length})
                        </h4>
                        <div className="space-y-3">
                          {upcomingTasks.map((task) => (
                            <div
                              key={task.id}
                              className="p-4 rounded-xl transition-all duration-200 border bg-dark-elevated border-dark-border hover:border-primary/50"
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-1 h-full rounded-full ${getPriorityColor(task.priority)}`} />
                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-white">
                                        {task.title}
                                      </h4>
                                      {task.description && (
                                        <p className="text-sm text-gray-400 mt-1">{task.description}</p>
                                      )}
                                    </div>
<button 
                                       onClick={() => toggleTaskCompletion(task.id, task.parentTaskId)}
                                       className="text-gray-400 hover:text-green-500 transition-colors ml-2"
                                     >
                                       <CheckCircleIcon className="h-5 w-5" />
                                     </button>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                      <ClockIcon className="h-4 w-4" />
                                      <span>{task.time}</span>
                                      <span className="text-gray-500">•</span>
                                      <span>{formatDuration(task.duration)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        task.priority === 'high' ? 'bg-primary/20 text-primary border border-primary/30' :
                                        task.priority === 'medium' ? 'bg-earth-500/20 text-earth-500 border border-earth-500/30' :
                                        'bg-earth-600/20 text-earth-600 border border-earth-600/30'
                                      }`}>
                                        {task.priority}
                                      </span>
                                      <span className="text-gray-500 text-xs">
                                        Part {task.portionNumber} of {task.totalPortions}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Completed Tasks */}
                    {completedTasks.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          Completed Tasks ({completedTasks.length})
                        </h4>
                        <div className="space-y-3">
                          {completedTasks.map((task) => (
                            <div
                              key={task.id}
                              className="p-4 rounded-xl transition-all duration-200 border bg-dark-bg border-green-500/30 opacity-75"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-1 h-full rounded-full bg-green-500" />
                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-gray-500 line-through">
                                        {task.title}
                                      </h4>
                                      {task.description && (
                                        <p className="text-sm text-gray-500 mt-1 line-through">{task.description}</p>
                                      )}
                                    </div>
<button 
                                       onClick={() => toggleTaskCompletion(task.id, task.parentTaskId)}
                                       className="text-green-500 hover:text-gray-400 transition-colors ml-2"
                                     >
                                       <CheckCircleIcon className="h-5 w-5 fill-current" />
                                     </button>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                      <ClockIcon className="h-4 w-4" />
                                      <span>{task.time}</span>
                                      <span className="text-gray-600">•</span>
                                      <span>{formatDuration(task.duration)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-600">
                                        Completed
                                      </span>
                                      <span className="text-gray-600 text-xs">
                                        Part {task.portionNumber} of {task.totalPortions}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-elevated flex items-center justify-center">
                      <ClockIcon className="h-8 w-8 text-gray-500" />
                    </div>
                    <p className="text-gray-400 mb-4">No tasks scheduled for this day</p>
                    <button 
                      onClick={() => setShowAddTaskModal(true)}
                      className="btn-primary"
                    >
                      <PlusIcon className="h-4 w-4 mr-2 inline" />
                      Add Task
                    </button>
                  </div>
                )
              })()
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-elevated flex items-center justify-center">
                  <CalendarIcon className="h-8 w-8 text-gray-500" />
                </div>
                <p className="text-gray-400">Select a day to view tasks</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Completed Tasks Dropdown - Bottom Right */}
      {selectedDay && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setShowCompletedDropdown(!showCompletedDropdown)}
            className="bg-gradient-primary text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-glow transition-all flex items-center gap-3"
          >
            <CheckCircleIcon className="h-5 w-5" />
            <span className="font-semibold">Completed: {getTasksForDay(selectedDay).filter(t => t.completed).length}</span>
            {showCompletedDropdown ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </button>

          {showCompletedDropdown && (
            <div className="absolute bottom-full right-0 mb-2 w-80 max-h-96 overflow-y-auto bg-dark-card rounded-xl shadow-glow border border-dark-border p-4">
              {(() => {
                const completedTasks = getTasksForDay(selectedDay).filter(t => t.completed)
                if (completedTasks.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-400">
                      <CheckCircleIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No completed tasks for this day</p>
                    </div>
                  )
                }
                return (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      Completed Tasks ({completedTasks.length})
                    </h4>
                    {completedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 rounded-lg bg-dark-elevated border border-green-500/30"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-white text-sm line-through">
                              {task.title}
                            </h5>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDuration(task.duration)}
                            </p>
                          </div>
                          <button
                            onClick={() => toggleTaskCompletion(task.id, task.parentTaskId)}
                            className="text-green-500 hover:text-gray-400 transition-colors ml-2"
                          >
                            <CheckCircleIcon className="h-4 w-4 fill-current" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}
      
      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Add New Task</h2>
              <button
                onClick={() => setShowAddTaskModal(false)}
                className="p-2 rounded-lg bg-dark-elevated hover:bg-dark-hover transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Task Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                  placeholder="e.g., Complete Physics Assignment"
                />
              </div>

              {/* Task Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors resize-none"
                  rows={3}
                  placeholder="Additional details about the task..."
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Deadline *
                </label>
                <input
                  type="date"
                  value={newTask.deadline}
                  onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Estimated Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Estimated Hours to Complete
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={newTask.estimatedHours}
                  onChange={(e) => setNewTask({ ...newTask, estimatedHours: parseFloat(e.target.value) || 1 })}
                  className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
                />
                <p className="text-sm text-gray-500 mt-1">
                  The task will be automatically divided into manageable portions
                </p>
              </div>

              {/* Approximate Time Needed (minutes) - for AI learning */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Approximate Time Needed (minutes) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={newTask.approximateTime}
                  onChange={(e) => setNewTask({ ...newTask, approximateTime: parseInt(e.target.value) || 60 })}
                  className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
                />
                <p className="text-sm text-gray-500 mt-1">
                  AI will use this for context-based reminders
                </p>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Priority
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['low', 'medium', 'high'] as const).map((priority) => (
                    <button
                      key={priority}
                      onClick={() => setNewTask({ ...newTask, priority })}
                      className={`
                        px-4 py-3 rounded-xl border-2 transition-all font-medium capitalize
                        ${newTask.priority === priority
                          ? priority === 'high' 
                            ? 'border-red-500 bg-red-500/20 text-red-400'
                            : priority === 'medium'
                            ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
                            : 'border-green-500 bg-green-500/20 text-green-400'
                          : 'border-dark-border bg-dark-elevated text-gray-400 hover:border-gray-600'
                        }
                      `}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-4">
                <button
                  onClick={handleGenerateAIPlan}
                  disabled={isLoading}
                  className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white font-medium hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <SparklesIcon className="h-5 w-5" />
                  {isLoading ? 'Generating AI Plan...' : 'Generate AI Plan'}
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddTaskModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl bg-dark-elevated text-gray-300 hover:bg-dark-hover transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddTask}
                    disabled={isLoading}
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Creating...' : 'Add Task'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Preview Modal */}
      {showPlanPreview && pendingPlan && (
        <PlanPreviewModal
          taskId={pendingTaskId}
          plan={pendingPlan}
          onFinalize={finalizePlan}
          onCancel={() => {
            setShowPlanPreview(false)
            setPendingPlan(null)
            setPendingTaskId('')
          }}
        />
      )}

      {/* Task Detail Modal */}
      {showTaskDetailModal && selectedTaskForDetail && (
        <TaskDetailModal
          task={selectedTaskForDetail}
          onClose={() => {
            setShowTaskDetailModal(false)
            setSelectedTaskForDetail(null)
          }}
          onStatusChange={async (taskId, status) => {
            try {
              await taskService.updateTaskStatus(taskId, status)
              setSelectedTaskForDetail({ ...selectedTaskForDetail, status })
            } catch (error) {
              console.error('Failed to update status:', error)
            }
          }}
          onDelete={async (taskId) => {
            try {
              await taskService.deleteTask(taskId)
              const portions = calendarStorage.getPortions().filter(p => p.parentTaskId !== taskId)
              calendarStorage.savePortions(portions)
              setTasks(prev => prev.filter(t => t.id !== taskId))
              setShowTaskDetailModal(false)
              setSelectedTaskForDetail(null)
            } catch (error) {
              console.error('Failed to delete task:', error)
            }
          }}
        />
      )}
    </div>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}
