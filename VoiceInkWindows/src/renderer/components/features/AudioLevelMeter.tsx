import React, { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'

interface AudioLevelMeterProps {
  isActive?: boolean
  level?: number // 0-100
  className?: string
  orientation?: 'horizontal' | 'vertical'
  showValue?: boolean
}

export const AudioLevelMeter: React.FC<AudioLevelMeterProps> = ({
  isActive = false,
  level = 0,
  className,
  orientation = 'horizontal',
  showValue = false
}) => {
  const [displayLevel, setDisplayLevel] = useState(0)

  useEffect(() => {
    if (!isActive) {
      setDisplayLevel(0)
      return
    }

    // Smooth the level changes
    const targetLevel = Math.max(0, Math.min(100, level))
    const diff = targetLevel - displayLevel
    const step = diff * 0.3 // Smooth transition

    const timer = setTimeout(() => {
      setDisplayLevel(prev => prev + step)
    }, 16) // ~60fps

    return () => clearTimeout(timer)
  }, [level, displayLevel, isActive])

  const renderBars = () => {
    const barCount = 20
    const barsActive = Math.floor((displayLevel / 100) * barCount)
    
    return Array.from({ length: barCount }, (_, i) => {
      const isBarActive = i < barsActive
      const intensity = i / barCount
      
      let barColor = 'bg-muted'
      if (isBarActive) {
        if (intensity < 0.6) {
          barColor = 'bg-green-500'
        } else if (intensity < 0.8) {
          barColor = 'bg-yellow-500'
        } else {
          barColor = 'bg-red-500'
        }
      }

      return (
        <div
          key={i}
          className={cn(
            "transition-colors duration-75",
            orientation === 'horizontal' ? "w-1 h-4" : "w-4 h-1",
            barColor,
            isBarActive && "opacity-100",
            !isBarActive && "opacity-30"
          )}
        />
      )
    })
  }

  return (
    <div className={cn(
      "flex items-center gap-1",
      orientation === 'horizontal' ? "flex-row" : "flex-col-reverse",
      className
    )}>
      {/* Level Bars */}
      <div className={cn(
        "flex gap-1",
        orientation === 'horizontal' ? "flex-row" : "flex-col-reverse"
      )}>
        {renderBars()}
      </div>

      {/* Numeric Value */}
      {showValue && (
        <div className="ml-2 text-xs font-mono text-muted-foreground w-8">
          {Math.round(displayLevel)}
        </div>
      )}
    </div>
  )
}