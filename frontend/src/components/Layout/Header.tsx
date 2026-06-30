import { useState } from 'react'
import { BellIcon, Cog6ToothIcon } from '@heroicons/react/24/solid'
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../Notifications/NotificationProvider'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const { notifications, dismissNotification, dismissAllNotifications } = useNotifications()
  const [showDropdown, setShowDropdown] = useState(false)

  const handleDismiss = (id: string) => {
    dismissNotification(id)
    if (notifications.length === 1) {
      setShowDropdown(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-dark-surface/80 backdrop-blur-xl border-b border-dark-border">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-end gap-2">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="relative p-2 rounded-lg hover:bg-dark-elevated transition-colors group"
            >
              <BellIcon className="h-6 w-6 text-gray-300 group-hover:text-primary transition-colors" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-accent-pink rounded-full animate-pulse" />
              )}
            </button>

            {/* Notification Dropdown */}
            {showDropdown && notifications.length > 0 && (
              <div className="absolute right-0 mt-2 w-80 bg-dark-surface border-2 border-primary/40 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-dark-border flex items-center justify-between">
                  <h3 className="text-sm font-bold text-primary">Notifications</h3>
                  <button
                    onClick={dismissAllNotifications}
                    className="text-xs text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Clear All
                  </button>
                </div>
                <div className="divide-y divide-dark-border">
                  {notifications.map((notif) => (
                    <div key={notif.id} className="p-3 hover:bg-dark-elevated transition-colors">
                      <div className="flex items-start gap-2">
                        <div className={`flex-shrink-0 w-2 h-2 mt-1.5 rounded-full ${
                          notif.type === 'critical' ? 'bg-red-500' : 'bg-primary'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-xs font-bold ${
                            notif.type === 'critical' ? 'text-red-400' : 'text-primary'
                          }`}>
                            {notif.type === 'critical' ? 'Critical Task Alert' : 'Task Reminder'}
                          </h4>
                          <p className="text-gray-200 text-xs mt-0.5">{notif.message}</p>
                        </div>
                        <button
                          onClick={() => handleDismiss(notif.id)}
                          className="flex-shrink-0 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {showDropdown && notifications.length === 0 && (
              <div className="absolute right-0 mt-2 w-80 bg-dark-surface border-2 border-primary/40 rounded-xl shadow-2xl z-50 p-4 text-center">
                <p className="text-gray-400 text-sm">No notifications</p>
              </div>
            )}
          </div>

          {/* Settings */}
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-lg hover:bg-dark-elevated transition-colors group"
          >
            <Cog6ToothIcon className="h-6 w-6 text-gray-300 group-hover:text-primary transition-colors" />
          </button>

          {/* User avatar */}
          <div className="ml-2 flex items-center gap-3 pl-3 border-l border-dark-border">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-100">You</p>
              <p className="text-xs text-gray-400">Personal AI</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
              <span className="text-white font-semibold">AI</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
