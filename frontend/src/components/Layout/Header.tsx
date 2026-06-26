import { Bars3Icon } from '@heroicons/react/24/outline'
import { BellIcon, Cog6ToothIcon } from '@heroicons/react/24/solid'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-dark-surface/80 backdrop-blur-xl border-b border-dark-border">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-dark-elevated transition-colors"
          >
            <Bars3Icon className="h-6 w-6 text-gray-300" />
          </button>

          {/* Search bar */}
          <div className="flex-1 max-w-2xl mx-4 hidden sm:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Search tasks, documents, or ask AI..."
                className="w-full input pl-10"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-dark-elevated transition-colors group">
              <BellIcon className="h-6 w-6 text-gray-300 group-hover:text-primary transition-colors" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-accent-pink rounded-full animate-pulse" />
            </button>

            {/* Settings */}
            <button className="p-2 rounded-lg hover:bg-dark-elevated transition-colors group">
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
      </div>
    </header>
  )
}
