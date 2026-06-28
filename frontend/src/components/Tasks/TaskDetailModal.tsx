import { useState } from 'react'
import { XMarkIcon, CalendarIcon, ClockIcon, DocumentTextIcon, TrashIcon } from '@heroicons/react/24/solid'
import { Task } from '../../services/taskService'

interface TaskDetailModalProps {
  task: Task | null
  onClose: () => void
  onStatusChange: (taskId: string, status: string) => void
  onDelete: (taskId: string) => void
}

const STATUS_OPTIONS = [
  { value: 'have_to_start', label: "Haven't Started", color: 'bg-gray-500' },
  { value: 'working_on_it', label: 'In Progress', color: 'bg-yellow-500' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500' },
  { value: 'overdue', label: 'Overdue', color: 'bg-red-500' }
]

export default function TaskDetailModal({ task, onClose, onStatusChange, onDelete }: TaskDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!task) return null

  const handleDelete = () => {
    onDelete(task.id)
    setShowDeleteConfirm(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Task Details</h2>
          <button onClick={onClose} className="p-2 rounded-lg bg-dark-elevated hover:bg-dark-hover transition-colors">
            <XMarkIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Title */}
          <div>
            <h3 className="text-xl font-bold text-white mb-2">{task.title}</h3>
            {task.is_critical && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                ⚠️ Critical Task
              </span>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <DocumentTextIcon className="h-4 w-4" />
                <span className="font-medium">Description</span>
              </div>
              <p className="text-gray-300 bg-dark-elevated rounded-lg p-3">{task.description}</p>
            </div>
          )}

          {/* Deadline & Duration */}
          <div className="grid grid-cols-2 gap-4">
            {task.deadline && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="font-medium">Deadline</span>
                </div>
                <p className="text-white">
                  {new Date(task.deadline).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <ClockIcon className="h-4 w-4" />
                <span className="font-medium">Duration</span>
              </div>
              <p className="text-white">{task.duration_minutes} minutes</p>
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Status</label>
            <div className="relative">
              <select
                value={task.status}
                onChange={(e) => onStatusChange(task.id, e.target.value)}
                className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-xl text-white focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
              >
                {STATUS_OPTIONS.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* AI Analysis (if available) */}
          {task.ai_analysis && (
            <div className="space-y-3 p-4 bg-dark-elevated rounded-xl border border-dark-border">
              <h4 className="text-sm font-medium text-gray-300">AI Analysis</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Urgency</p>
                  <p className="text-sm text-white">{task.ai_analysis.urgency_score.toFixed(0)}/100</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Importance</p>
                  <p className="text-sm text-white">{task.ai_analysis.importance_score.toFixed(0)}/100</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Effort</p>
                  <p className="text-sm text-white">{task.ai_analysis.effort_score.toFixed(0)}/100</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Priority Score</p>
                  <p className="text-sm text-white">{task.ai_analysis.overall_priority_score.toFixed(0)}/100</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-dark-border">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </button>
            <button onClick={onClose} className="flex-1 btn-secondary">
              Close
            </button>
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setShowDeleteConfirm(false)}>
              <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white mb-4">Delete Task?</h3>
                <p className="text-gray-300 mb-6">This action cannot be undone. The task and all its divisions will be permanently removed.</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 btn-secondary">Cancel</button>
                  <button onClick={handleDelete} className="flex-1 bg-red-500 text-white px-4 py-3 rounded-xl hover:bg-red-600 transition-colors font-medium">Delete</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
