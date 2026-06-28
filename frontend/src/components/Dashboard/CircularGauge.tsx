import { useState, useEffect } from 'react'

interface CircularGaugeProps {
  completed: number
  total: number
  size?: number
  strokeWidth?: number
}

export default function CircularGauge({ 
  completed, 
  total, 
  size = 80, 
  strokeWidth = 8 
}: CircularGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0)
  
  const percentage = total > 0 ? (completed / total) * 100 : 0
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedValue / 100) * circumference
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(percentage)
    }, 300)
    return () => clearTimeout(timer)
  }, [percentage])

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle (semi-transparent) */}
        <svg 
          width={size} 
          height={size} 
          className="transform -rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(45, 36, 30, 0.5)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle (orangish-brown) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#d97706"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
            style={{
              filter: 'drop-shadow(0 0 4px rgba(217, 119, 6, 0.4))'
            }}
          />
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className="text-sm text-gray-400">
          {completed} / {total} done
        </p>
      </div>
    </div>
  )
}
