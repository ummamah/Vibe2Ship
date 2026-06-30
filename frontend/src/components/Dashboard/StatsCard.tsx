import { useState, useEffect } from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ElementType | null
  color?: string
  change?: string
  children?: React.ReactNode
}

export default function StatsCard({ 
  title, 
  value, 
  icon, 
  color = 'from-primary to-primary-light',
  change,
  children
}: StatsCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const Icon = icon

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div 
      className={`card group hover:scale-105 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        {icon && (
          <div className={`p-3 rounded-xl bg-gradient-to-r ${color} shadow-glow`}>
            {(() => {
              const IconComp = icon
              return <IconComp className="h-6 w-6 text-white" />
            })()}
          </div>
        )}
      </div>
      
      {children ? (
        children
      ) : (
        <>
          <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
          <p className="text-sm text-gray-400">{title}</p>
        </>
      )}
    </div>
  )
}
