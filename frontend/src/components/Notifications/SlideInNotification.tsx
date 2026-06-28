import { useNotifications } from './NotificationProvider'

export default function SlideInNotification() {
  const { activeNotification, dismissNotification, isPlayingAlarm } = useNotifications()

  if (!activeNotification) return null

  return (
    <div className={`fixed right-4 top-4 z-[70] max-w-sm w-full transform transition-all duration-500 ease-out ${
      activeNotification ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`rounded-2xl border p-4 shadow-2xl backdrop-blur-lg ${
        activeNotification.type === 'critical' 
          ? 'bg-red-500/10 border-red-500/50' 
          : 'bg-primary/10 border-primary/50'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full animate-pulse ${
            activeNotification.type === 'critical' ? 'bg-red-500' : 'bg-primary'
          }`} />
          
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-bold ${
              activeNotification.type === 'critical' ? 'text-red-400' : 'text-primary'
            }`}>
              {activeNotification.type === 'critical' ? 'Critical Task Alert' : 'Task Reminder'}
            </h4>
            <p className="text-gray-200 text-sm mt-1">{activeNotification.message}</p>
            
            {isPlayingAlarm && (
              <p className="text-xs text-red-400 mt-2 animate-pulse">
                Alarm active! Click to dismiss.
              </p>
            )}
          </div>
          
          <button
            onClick={dismissNotification}
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors text-xs uppercase tracking-wider font-medium"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
