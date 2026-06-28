import { useState } from 'react'
import { XMarkIcon, PlusIcon, MinusIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid'
import { DailyChunk } from '../../services/plannerService'

interface PlanPreviewModalProps {
  taskId: string
  plan: {
    title: string
    daily_chunks: DailyChunk[]
    total_estimated_minutes: number
    start_date: string
    deadline: string
  }
  onFinalize: (editedPlan: {
    title: string
    daily_chunks: DailyChunk[]
  }) => void
  onCancel: () => void
}

export default function PlanPreviewModal({
  taskId: _taskId,
  plan,
  onFinalize,
  onCancel
}: PlanPreviewModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set())

  const [editableChunks, setEditableChunks] = useState<DailyChunk[]>(
    plan.daily_chunks.map(chunk => ({ ...chunk }))
  )

  const toggleDay = (index: number) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedDays(newExpanded)
  }

  const updateSubTask = (dayIndex: number, subtaskIndex: number, field: 'name' | 'estimated_minutes', value: string) => {
    if (!isEditing) return
    
    const newChunks = [...editableChunks]
    const day = newChunks[dayIndex]
    if (day) {
      const updatedSubtasks = [...day.subtask_names]
      if (field === 'name') {
        updatedSubtasks[subtaskIndex] = value
      }
      day.subtask_names = updatedSubtasks
      setEditableChunks(newChunks)
    }
  }

  const updateDayMinutes = (dayIndex: number, totalMinutes: number) => {
    if (!isEditing) return
    
    const newChunks = [...editableChunks]
    newChunks[dayIndex].total_minutes = totalMinutes
    setEditableChunks(newChunks)
  }

  const addSubTask = (dayIndex: number) => {
    if (!isEditing) return
    
    const newChunks = [...editableChunks]
    const day = newChunks[dayIndex]
    if (day) {
      day.subtask_names.push(`New Subtask ${day.subtask_names.length + 1}`)
      day.total_minutes += 30
      setEditableChunks(newChunks)
    }
  }

  const removeSubTask = (dayIndex: number, subtaskIndex: number) => {
    if (!isEditing) return
    
    const newChunks = [...editableChunks]
    const day = newChunks[dayIndex]
    if (day && day.subtask_names.length > 1) {
      day.subtask_names.splice(subtaskIndex, 1)
      day.total_minutes = Math.max(30, day.total_minutes - 30)
      setEditableChunks(newChunks)
    }
  }

  const moveSubTask = (fromDayIndex: number, fromSubtaskIndex: number, toDayIndex: number) => {
    if (!isEditing || fromDayIndex === toDayIndex) return
    
    const newChunks = [...editableChunks]
    const fromDay = newChunks[fromDayIndex]
    const toDay = newChunks[toDayIndex]
    
    if (fromDay && toDay) {
      const subtask = fromDay.subtask_names[fromSubtaskIndex]
      const minutes = Math.floor(fromDay.total_minutes / fromDay.subtask_names.length)
      
      fromDay.subtask_names.splice(fromSubtaskIndex, 1)
      fromDay.total_minutes = Math.max(0, fromDay.total_minutes - minutes)
      
      toDay.subtask_names.push(subtask)
      toDay.total_minutes += minutes
      
      setEditableChunks(newChunks)
    }
  }

  const handleFinalize = () => {
    onFinalize({
      title: plan.title,
      daily_chunks: editableChunks
    })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
    if (hours > 0) return `${hours}h`
    return `${mins}m`
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-dark-card py-2 z-10">
          <div>
            <h2 className="text-2xl font-bold text-white">Plan Preview</h2>
            <p className="text-gray-400 text-sm mt-1">{plan.title}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isEditing 
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                  : 'bg-dark-elevated text-gray-300 hover:bg-dark-hover'
              }`}
            >
              {isEditing ? 'Done Editing' : 'Modify Plan'}
            </button>
            <button
              onClick={onCancel}
              className="p-2 rounded-lg bg-dark-elevated hover:bg-dark-hover transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {editableChunks.map((chunk, dayIndex) => (
            <div
              key={dayIndex}
              className="rounded-xl border border-dark-border bg-dark-elevated overflow-hidden"
            >
              <button
                onClick={() => toggleDay(dayIndex)}
                className="w-full p-4 flex items-center justify-between hover:bg-dark-hover transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {expandedDays.has(dayIndex) ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{formatDate(chunk.date)}</h3>
                    <p className="text-sm text-gray-400">{chunk.notes}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-primary">
                    {formatDuration(chunk.total_minutes)}
                  </span>
                  <p className="text-sm text-gray-400">
                    {chunk.subtask_names.length} task{chunk.subtask_names.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </button>

              {expandedDays.has(dayIndex) && (
                <div className="p-4 border-t border-dark-border space-y-3">
                  {chunk.subtask_names.map((subtask: string, subtaskIndex: number) => (
                    <div
                      key={subtaskIndex}
                      className="flex items-center gap-3 p-3 bg-dark-bg rounded-lg"
                    >
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={subtask}
                            onChange={(e) => updateSubTask(dayIndex, subtaskIndex, 'name', e.target.value)}
                            className="flex-1 px-3 py-2 bg-dark-surface border border-dark-border rounded-lg text-white text-sm focus:outline-none focus:border-primary"
                            placeholder="Subtask name"
                          />
                          <input
                            type="number"
                            value={Math.floor(chunk.total_minutes / chunk.subtask_names.length)}
                            onChange={(e) => {
                              const newMinutes = parseInt(e.target.value) || 30
                              updateDayMinutes(dayIndex, newMinutes * chunk.subtask_names.length)
                            }}
                            className="w-20 px-3 py-2 bg-dark-surface border border-dark-border rounded-lg text-white text-sm focus:outline-none focus:border-primary"
                            placeholder="mins"
                          />
                          <select
                            onChange={(e) => {
                              const toDay = parseInt(e.target.value)
                              if (!isNaN(toDay)) {
                                moveSubTask(dayIndex, subtaskIndex, toDay)
                              }
                            }}
                            className="px-2 py-2 bg-dark-surface border border-dark-border rounded-lg text-white text-sm focus:outline-none"
                            value=""
                          >
                            <option value="">Move to...</option>
                            {editableChunks.map((c, idx) => 
                              idx !== dayIndex ? (
                                <option key={idx} value={idx}>
                                  {formatDate(c.date)}
                                </option>
                              ) : null
                            )}
                          </select>
                          <button
                            onClick={() => removeSubTask(dayIndex, subtaskIndex)}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors"
                            disabled={chunk.subtask_names.length <= 1}
                          >
                            <MinusIcon className="h-5 w-5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex-1">
                            <p className="text-white font-medium">{subtask}</p>
                            <p className="text-sm text-gray-400">
                              ~{Math.floor(chunk.total_minutes / chunk.subtask_names.length)} min
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {isEditing && (
                    <button
                      onClick={() => addSubTask(dayIndex)}
                      className="flex items-center gap-2 px-4 py-2 bg-dark-surface hover:bg-dark-hover rounded-lg text-gray-300 transition-colors"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add Subtask
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-dark-border flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl bg-dark-elevated text-gray-300 hover:bg-dark-hover transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleFinalize}
            className="flex-1 btn-primary"
          >
            Finalize Plan
          </button>
        </div>
      </div>
    </div>
  )
}