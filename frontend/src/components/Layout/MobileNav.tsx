import { NavLink } from 'react-router-dom'
import {
  HomeIcon,
  BookOpenIcon,
  CalendarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/solid'

const navigation = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'Study', href: '/study', icon: BookOpenIcon },
  { name: 'Schedule', href: '/schedule', icon: CalendarIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
]

export default function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-dark-surface/95 backdrop-blur-xl border-t border-dark-border z-50">
      <div className="grid grid-cols-4 gap-1 px-2 py-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-200
              ${
                isActive
                  ? 'bg-primary/20 text-primary'
                  : 'text-gray-400 hover:text-gray-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`h-6 w-6 ${isActive ? 'text-primary' : ''}`} />
                <span className="text-xs font-medium">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
