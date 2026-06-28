import { useState, useEffect } from 'react'
import { ClockIcon, BoltIcon } from '@heroicons/react/24/solid'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { focusService } from '../services/focusService'

const studyData = [
  { day: 'Sun', Math: 0, Physics: 0, Chemistry: 0, English: 0 },
  { day: 'Mon', Math: 25, Physics: 15, Chemistry: 10, English: 0 },
  { day: 'Tue', Math: 30, Physics: 20, Chemistry: 15, English: 5 },
  { day: 'Wed', Math: 20, Physics: 25, Chemistry: 20, English: 10 },
  { day: 'Thu', Math: 15, Physics: 10, Chemistry: 25, English: 12 },
  { day: 'Fri', Math: 35, Physics: 30, Chemistry: 10, English: 15 },
  { day: 'Sat', Math: 10, Physics: 5, Chemistry: 5, English: 0 },
]

interface SessionData {
  session_type: string
  start_time: string
  end_time: string
  planned_duration: number
  actual_duration: number
  topic: string
  completed: boolean
}

interface HistoryEntry {
  session_id: string
  topic: string
  started_at: string
  ended_at: string
  sessions: SessionData[]
  total_focus_time_seconds: number
  total_break_time_seconds: number
  completed: boolean
  cycle_count: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const totalMinutes = payload.reduce((sum: number, p: any) => sum + p.value, 0)
    return (
      <div className="bg-dark-elevated border-2 border-primary/60 rounded-lg p-3 shadow-xl">
        <p className="text-white font-bold mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((item: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-300">{item.name}:</span>
              <span className="text-white font-medium">{item.value} min</span>
            </div>
          ))}
          <div className="border-t border-primary/30 mt-2 pt-2">
            <p className="text-primary-light font-bold">Total: {totalMinutes} min</p>
          </div>
        </div>
      </div>
    )
  }
  return null
}

const CustomLegend = (props: any) => {
  const { payload } = props
  return (
    <div className="flex flex-wrap gap-4 justify-end">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-300 text-sm">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [streak, setStreak] = useState<number>(0)
  const [chartData] = useState<any[]>(studyData)

  useEffect(() => {
    fetchAnalytics()
    fetchHistory()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const data = await focusService.getAnalytics()
      setAnalytics(data.analytics)
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setAnalytics({
        total_focus_hours: 0,
        total_sessions: 0,
        completion_rate: 0,
        average_session_length: 0,
        most_active_topic: ''
      })
    }
  }

  const fetchHistory = async () => {
    try {
      const data = await focusService.getHistory()
      const historyData = data.history || []
      calculateStreak(historyData)
    } catch (err) {
      console.error('Error fetching history:', err)
      setStreak(0)
    }
  }

  const calculateStreak = (historyData: HistoryEntry[]) => {
    if (!historyData || historyData.length === 0) {
      setStreak(0)
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const minutesByDate = new Map<string, number>()

    historyData.forEach(entry => {
      entry.sessions.forEach(session => {
        if (session.session_type === 'focus' && session.completed) {
          const startDate = new Date(session.start_time)
          const dateKey = startDate.toISOString().split('T')[0]
          const minutes = session.actual_duration / 60
          minutesByDate.set(dateKey, (minutesByDate.get(dateKey) || 0) + minutes)
        }
      })
    })

    let streakCount = 0
    let currentDate = new Date(today)

    for (let i = 0; i < 365; i++) {
      const dateKey = currentDate.toISOString().split('T')[0]
      const totalMinutes = minutesByDate.get(dateKey) || 0

      if (totalMinutes >= 25) {
        streakCount++
      } else if (i > 0) {
        break
      }

      currentDate.setDate(currentDate.getDate() - 1)
    }

    setStreak(streakCount)
  }

  const totalHours = analytics?.total_focus_hours || 0

  return (
    <div className="pb-20 lg:pb-6">
      <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3 text-glow">
        <ClockIcon className="h-9 w-9 icon-primary" />
        Analytics Dashboard
      </h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Hours Studied Card */}
        <div className="card-elevated">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                Hours Studied
              </p>
              <p className="text-4xl font-bold text-white text-glow">
                {totalHours.toFixed(1)}h
              </p>
            </div>
            <ClockIcon className="h-10 w-10 icon-primary" />
          </div>
          <div className="h-1 w-full bg-dark-surface rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary-light shadow-glow"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Daily Streak Card */}
        <div className="card-elevated">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                Daily Streak
              </p>
              <p className="text-4xl font-bold text-white text-glow">
                {streak} <span className="text-lg">Days</span>
              </p>
              {streak === 0 && (
                <p className="text-sm text-primary-light mt-2 animate-pulse">
                  Start your streak!
                </p>
              )}
            </div>
            <BoltIcon className="h-10 w-10 icon-primary" />
          </div>
          <div className="h-1 w-full bg-dark-surface rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary-light shadow-glow transition-all duration-500"
              style={{ width: `${Math.min(100, streak * 10)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 7-Day Study Time by Subject Chart */}
      <div className="card-elevated">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <BoltIcon className="h-6 w-6 icon-accent" />
          7-Day Study Time by Subject
        </h2>
        
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="rgba(217, 119, 6, 0.1)" 
                vertical={false}
              />
              <XAxis
                dataKey="day"
                stroke="#d97706"
                tick={{ fill: '#d97706', fontSize: 14, fontWeight: 500 }}
                axisLine={{ stroke: 'rgba(217, 119, 6, 0.3)' }}
                tickLine={{ stroke: 'rgba(217, 119, 6, 0.5)' }}
                tickMargin={10}
              />
              <YAxis
                stroke="#d97706"
                tick={{ fill: '#d97706', fontSize: 14, fontWeight: 500 }}
                axisLine={{ stroke: 'rgba(217, 119, 6, 0.3)' }}
                tickLine={{ stroke: 'rgba(217, 119, 6, 0.5)' }}
                tickMargin={10}
                label={{ 
                  value: 'Minutes', 
                  angle: -90, 
                  position: 'insideLeft',
                  fill: '#d97706',
                  fontSize: 14,
                  fontWeight: 500
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                content={<CustomLegend />} 
                verticalAlign="top" 
                height={36}
              />
              <Bar 
                dataKey="Math" 
                stackId="a" 
                fill="#d97706"
                radius={[0, 0, 4, 4]}
                animationDuration={1000}
              />
              <Bar 
                dataKey="Physics" 
                stackId="a" 
                fill="#fbbf24"
                radius={[0, 0, 4, 4]}
                animationDuration={1000}
              />
              <Bar 
                dataKey="Chemistry" 
                stackId="a" 
                fill="#8b5a2b"
                radius={[0, 0, 4, 4]}
                animationDuration={1000}
              />
              <Bar 
                dataKey="English" 
                stackId="a" 
                fill="#f59e0b"
                radius={[0, 0, 4, 4]}
                animationDuration={1000}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}