import { SparklesIcon, ClockIcon, CheckCircleIcon, ChartBarIcon } from '@heroicons/react/24/solid'

export default function HomePage() {
  const stats = [
    {
      name: 'Tasks Today',
      value: '5',
      icon: CheckCircleIcon,
      color: 'from-primary to-primary-light',
      change: '+2',
    },
    {
      name: 'Study Time',
      value: '2h 34m',
      icon: ClockIcon,
      color: 'from-earth-500 to-earth-600',
      change: '+45m',
    },
    {
      name: 'Completed',
      value: '12',
      icon: SparklesIcon,
      color: 'from-accent-purple to-accent-pink',
      change: '+4',
    },
    {
      name: 'Focus Score',
      value: '87%',
      icon: ChartBarIcon,
      color: 'from-primary to-accent-purple',
      change: '+5%',
    },
  ]

  return (
    <div className="space-y-6 pb-20 lg:pb-6 animate-fadeIn">
      {/* Welcome Section */}
      <div className="card-elevated">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back! 👋
            </h1>
            <p className="text-gray-400">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <button className="btn-primary">
            <SparklesIcon className="h-5 w-5 mr-2 inline" />
            Ask AI
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="card group hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color} shadow-glow`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm font-medium text-green-400">{stat.change}</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
            <p className="text-sm text-gray-400">{stat.name}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <div className="card">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircleIcon className="h-6 w-6 icon-primary" />
            Upcoming Tasks
          </h2>
          <div className="space-y-3">
            {[
              { title: 'Complete React assignment', time: '2:00 PM', priority: 'high' },
              { title: 'Study for Math exam', time: '4:30 PM', priority: 'medium' },
              { title: 'Read Chapter 5', time: '6:00 PM', priority: 'low' },
            ].map((task, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-dark-elevated hover:bg-dark-hover transition-colors cursor-pointer group"
              >
                <div className={`w-1 h-12 rounded-full ${
                  task.priority === 'high' ? 'bg-gradient-to-r from-primary to-accent-pink shadow-glow' :
                  task.priority === 'medium' ? 'bg-gradient-to-r from-earth-500 to-earth-600' :
                  'bg-gradient-to-r from-earth-600 to-earth-700'
                }`} />
                <div className="flex-1">
                  <p className="text-white font-medium group-hover:text-primary-light transition-colors">
                    {task.title}
                  </p>
                  <p className="text-sm text-gray-400">{task.time}</p>
                </div>
                <input type="checkbox" className="h-5 w-5 rounded border-gray-600" />
              </div>
            ))}
          </div>
          <button className="w-full mt-4 btn-secondary">View All Tasks</button>
        </div>

        {/* AI Chat Preview */}
        <div className="card">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <SparklesIcon className="h-6 w-6 icon-accent" />
            Quick AI Chat
          </h2>
          <div className="space-y-3 mb-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                <SparklesIcon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 bg-dark-elevated rounded-lg p-3">
                <p className="text-sm text-gray-300">
                  Hi! I'm your personal AI assistant. How can I help you today?
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask me anything..."
              className="input flex-1"
            />
            <button className="btn-primary px-6">Send</button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {[
            { action: 'Uploaded', item: 'Math_Notes.pdf', time: '10 mins ago', icon: '📄' },
            { action: 'Completed', item: 'Chemistry homework', time: '1 hour ago', icon: '✅' },
            { action: 'Created', item: 'Study schedule for finals', time: '2 hours ago', icon: '📅' },
            { action: 'Added', item: '5 new tasks', time: '3 hours ago', icon: '➕' },
          ].map((activity, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-dark-elevated transition-colors">
              <span className="text-2xl">{activity.icon}</span>
              <div className="flex-1">
                <p className="text-white">
                  <span className="text-gray-400">{activity.action}</span>{' '}
                  <span className="font-medium">{activity.item}</span>
                </p>
                <p className="text-sm text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
