import { useState } from 'react'
import { ClockIcon, CheckCircleIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, LightBulbIcon } from '@heroicons/react/24/solid'
import { Task } from '../../services/taskService'

interface SmartTaskCardProps {
  task: Task
  onStatusChange: (taskId: string, status: string) => void
  onDelete: (taskId: string) => void
  index: number
}

export default function SmartTaskCard({ task, onStatusChange, onDelete, index }: SmartTaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  
  const analysis = task.ai_analysis
  const score = analysis?.overall_priority_score || 0
  
  const getPriorityColor = (score: number) => {
    if (score >= 80) return 'from-red-500 to-orange-500'
    if (score >= 60) return 'from-orange-400 to-yellow-400'
    if (score >= 40) return 'from-yellow-400 to-green-400'
    return 'from-green-400 to-emerald-500'
  }
  
  const getPriorityLabel = (score: number) => {
    if (score >= 80) return 'Critical'
    if (score >= 60) return 'High'
    if (score >= 40) return 'Medium'
    return 'Low'
  }
  
  const formatTimeRemaining = (deadline: string | null) => {
    if (!deadline) return 'No deadline'
    const diff = new Date(deadline).getTime() - new Date().getTime()
    const hours = Math.floor(diff / 1000 / 60 / 60)
    const days = Math.floor(hours / 24)
    
    if (hours < 0) return 'Overdue!'
    if (hours < 1) return 'Less than 1 hour'
    if (hours < 24) return `${hours}h left`
    if (days === 1) return '1 day left'
    return `${days} days left`
  }
  
  const isCompleted = task.status === 'completed'
  
  return (
    <div className={`group relative overflow-hidden rounded-xl border border-dark-border bg-dark-surface transition-all hover:border-primary/30 ${
      isCompleted ? 'opacity-60' : ''
    }`}>
      {/* Priority Score Bar */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${getPriorityColor(score)}`} />
      
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Rank */}
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-dark-elevated text-sm font-bold text-primary">
            {index + 1}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className={`font-semibold text-white truncate ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                {task.title}
              </h3>
              <span className={`flex-shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                score >= 80 ? 'bg-red-500/20 text-red-400' :
                score >= 60 ? 'bg-orange-500/20 text-orange-400' :
                score >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {getPriorityLabel(score)}
              </span>
            </div>
            
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <ClockIcon className="h-3.5 w-3.5" />
                {formatTimeRemaining(task.deadline)}
              </span>
              <span className="flex items-center gap-1">
                {task.duration_minutes} min
              </span>
              {task.category && (
                <span className="rounded bg-dark-elevated px-2 py-0.5">{task.category}</span>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onStatusChange(task.id, isCompleted ? 'pending' : 'completed')}
              className={`rounded-lg p-1.5 transition-colors ${
                isCompleted ? 'bg-green-500/20 text-green-400' : 'hover:bg-dark-elevated text-gray-400 hover:text-primary'
              }`}
            >
              <CheckCircleIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-dark-elevated hover:text-white"
            >
              {expanded ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-500/20 hover:text-red-400"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Expandable AI Analysis */}
        {expanded && analysis && (
          <div className="mt-4 space-y-3 border-t border-dark-border pt-3">
            <div className="grid grid-cols-3 gap-3">
              <ScoreBar label="Urgency" score={analysis.urgency_score} color="bg-red-500" />
              <ScoreBar label="Importance" score={analysis.importance_score} color="bg-blue-500" />
              <ScoreBar label="Effort" score={analysis.effort_score} color="bg-purple-500" />
            </div>
            
            <div className="space-y-2">
              {analysis.ai_insights.map((insight: string, i: number) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-dark-elevated p-2 text-sm">
                  <LightBulbIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" />
                  <span className="text-gray-300">{insight}</span>
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>Best time: <strong className="text-primary">{analysis.optimal_time_of_day}</strong></span>
              <span>Focus blocks: <strong className="text-primary">{analysis.estimated_focus_blocks}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="font-medium text-white">{Math.round(score)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-dark-elevated">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}
