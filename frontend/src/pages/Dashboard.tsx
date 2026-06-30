import { useState, useEffect, useRef } from 'react'
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/solid'
import { taskService } from '../services/taskService'
import { useFocusTimer } from '../context/FocusTimerContext'
import { getFocusedSecondsForDate } from '../utils/focusStorage'
import WelcomeQuote from '../components/Dashboard/WelcomeQuote'
import StatsCard from '../components/Dashboard/StatsCard'
import CircularGauge from '../components/Dashboard/CircularGauge'
import UpcomingTasksWidget from '../components/Dashboard/UpcomingTasksWidget'
import HighPriorityTasksWidget from '../components/Dashboard/HighPriorityTasksWidget'

const formatHoursMinutes = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  return `${hours}h ${minutes}m`
}

export default function Dashboard() {
  const [tasksToday, setTasksToday] = useState(0)
  const [completedTasks, setCompletedTasks] = useState(0)
  const [totalTasks, setTotalTasks] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const focusTimer = useFocusTimer()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const prevFocusSecondsRef = useRef(focusTimer.todaysFocusSeconds)
  const prevSeconds = prevFocusSecondsRef.current
  const currentSeconds = focusTimer.todaysFocusSeconds

  useEffect(() => {
    if (currentSeconds !== prevSeconds) {
      prevFocusSecondsRef.current = currentSeconds
      return
    }
    focusTimer.refreshTodaysFocus()
  }, [currentSeconds, focusTimer.refreshTodaysFocus])

  useEffect(() => {
    const handler = () => {
      const fresh = getFocusedSecondsForDate()
      if (fresh !== prevFocusSecondsRef.current) {
        prevFocusSecondsRef.current = fresh
        focusTimer.refreshTodaysFocus()
      }
    }
    window.addEventListener('focus-timer:focus-complete', handler as EventListener)
    window.addEventListener('focus-timer:series-complete', handler as EventListener)
    return () => {
      window.removeEventListener('focus-timer:focus-complete', handler as EventListener)
      window.removeEventListener('focus-timer:series-complete', handler as EventListener)
    }
  }, [focusTimer.refreshTodaysFocus])

  const fetchDashboardData = async () => {
    try {
      const tasksData = await taskService.getTasks()
      const tasks = tasksData.tasks

      const today = new Date().toDateString()
      const todayCount = tasks.filter(t => {
        if (!t.created_at) return false
        return new Date(t.created_at).toDateString() === today
      }).length

      const completedCount = tasks.filter(t => t.status === 'completed').length

      setTasksToday(todayCount)
      setCompletedTasks(completedCount)
      setTotalTasks(tasks.length)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const todaysFocusSeconds =
    focusTimer.todaysFocusSeconds || getFocusedSecondsForDate()
  const focusTimeString = formatHoursMinutes(todaysFocusSeconds)

  return (
    <div className="space-y-8 pb-20 lg:pb-6 animate-fadeIn">
      <div className="py-8 px-4">
        <WelcomeQuote />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="Tasks Today"
          value={isLoading ? '...' : tasksToday}
          icon={CheckCircleIcon}
          color="from-primary to-primary-light"
          change={isLoading ? undefined : '+2'}
        />

        <StatsCard
          title="Focus Session"
          value={isLoading ? '...' : focusTimeString}
          icon={ClockIcon}
          color="from-earth-500 to-earth-600"
          change={isLoading ? undefined : '+45m'}
        />

        <StatsCard
          title="Completed Tasks"
          value=""
          icon={() => null}
          color="from-primary to-accent-purple"
        >
          <div className="flex items-center gap-4">
            <CircularGauge
              completed={completedTasks}
              total={totalTasks}
              size={80}
              strokeWidth={8}
            />
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {completedTasks}
              </h3>
              <p className="text-sm text-gray-400">out of {totalTasks} total</p>
            </div>
          </div>
        </StatsCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <UpcomingTasksWidget onStatusChange={fetchDashboardData} />
        <HighPriorityTasksWidget />
      </div>
    </div>
  )
}
