import { useState, useEffect } from 'react'
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/solid'
import { taskService } from '../services/taskService'
import { focusService } from '../services/focusService'
import WelcomeQuote from '../components/Dashboard/WelcomeQuote'
import StatsCard from '../components/Dashboard/StatsCard'
import CircularGauge from '../components/Dashboard/CircularGauge'
import UpcomingTasksWidget from '../components/Dashboard/UpcomingTasksWidget'
import HighPriorityTasksWidget from '../components/Dashboard/HighPriorityTasksWidget'

export default function Dashboard() {
  const [tasksToday, setTasksToday] = useState(0)
  const [focusTime, setFocusTime] = useState('0h 0m')
  const [completedTasks, setCompletedTasks] = useState(0)
  const [totalTasks, setTotalTasks] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

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
      
      let focusTimeString = '0h 0m'
      try {
        const focusData = await focusService.getAnalytics()
        if (focusData.analytics?.total_focus_hours) {
          const hours = Math.floor(focusData.analytics.total_focus_hours)
          const minutes = Math.round((focusData.analytics.total_focus_hours % 1) * 60)
          focusTimeString = `${hours}h ${minutes}m`
        }
      } catch (e) {
        console.log('Focus data not available yet')
      }
      
      setTasksToday(todayCount)
      setFocusTime(focusTimeString)
      setCompletedTasks(completedCount)
      setTotalTasks(tasks.length)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8 pb-20 lg:pb-6 animate-fadeIn">
      {/* Welcome Quote Section */}
      <div className="py-8 px-4">
        <WelcomeQuote />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tasks Today */}
        <StatsCard
          title="Tasks Today"
          value={isLoading ? '...' : tasksToday}
          icon={CheckCircleIcon}
          color="from-primary to-primary-light"
          change={isLoading ? undefined : '+2'}
        />

        {/* Focus Session */}
        <StatsCard
          title="Focus Session"
          value={isLoading ? '...' : focusTime}
          icon={ClockIcon}
          color="from-earth-500 to-earth-600"
          change={isLoading ? undefined : '+45m'}
        />

        {/* Completed Tasks with Circular Gauge */}
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

      {/* Main Content - Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Upcoming Tasks */}
        <UpcomingTasksWidget onStatusChange={fetchDashboardData} />

        {/* Right: High Priority Tasks */}
        <HighPriorityTasksWidget />
      </div>
    </div>
  )
}
