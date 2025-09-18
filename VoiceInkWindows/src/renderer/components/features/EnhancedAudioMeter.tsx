import React, { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'

interface EnhancedAudioMeterProps {
  level?: number
  className?: string
  height?: number
  showPeak?: boolean
  showDb?: boolean
  gradient?: boolean
}

export const EnhancedAudioMeter: React.FC<EnhancedAudioMeterProps> = ({
  level = 0,
  className,
  height = 40,
  showPeak = true,
  showDb = false,
  gradient = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [peak, setPeak] = useState(0)
  const [peakHoldTime, setPeakHoldTime] = useState(0)
  const animationRef = useRef<number>()
  const historyRef = useRef<number[]>([])

  useEffect(() => {
    // Update peak
    if (level > peak) {
      setPeak(level)
      setPeakHoldTime(30) // Hold peak for 30 frames (~0.5s at 60fps)
    }
  }, [level, peak])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const barHeight = height

    // Add to history
    historyRef.current.push(level)
    if (historyRef.current.length > width / 2) {
      historyRef.current.shift()
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, barHeight)

      // Draw background
      ctx.fillStyle = 'rgba(30, 30, 40, 0.3)'
      ctx.fillRect(0, 0, width, barHeight)

      // Draw waveform history
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)'
      ctx.lineWidth = 1
      ctx.beginPath()
      historyRef.current.forEach((val, i) => {
        const x = (i / historyRef.current.length) * width
        const y = barHeight - (val * barHeight)
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.stroke()

      // Draw main level bar
      const barWidth = width * Math.min(level, 1)
      
      if (gradient) {
        const gradient = ctx.createLinearGradient(0, 0, width, 0)
        gradient.addColorStop(0, '#10b981') // green
        gradient.addColorStop(0.5, '#eab308') // yellow
        gradient.addColorStop(0.8, '#ef4444') // red
        gradient.addColorStop(1, '#dc2626') // dark red
        ctx.fillStyle = gradient
      } else {
        if (level < 0.5) {
          ctx.fillStyle = '#10b981'
        } else if (level < 0.8) {
          ctx.fillStyle = '#eab308'
        } else {
          ctx.fillStyle = '#ef4444'
        }
      }
      
      ctx.fillRect(0, 0, barWidth, barHeight)

      // Draw peak indicator
      if (showPeak && peak > 0) {
        const peakX = width * Math.min(peak, 1)
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(peakX, 0)
        ctx.lineTo(peakX, barHeight)
        ctx.stroke()

        // Decay peak hold
        if (peakHoldTime > 0) {
          setPeakHoldTime(prev => prev - 1)
        } else {
          setPeak(prev => Math.max(prev - 0.01, 0))
        }
      }

      // Draw grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 1
      for (let i = 1; i < 10; i++) {
        const x = (width / 10) * i
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, barHeight)
        ctx.stroke()
      }

      // Draw dB labels
      if (showDb) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.font = '10px monospace'
        ctx.textAlign = 'center'
        
        const db = level > 0 ? (20 * Math.log10(level)).toFixed(0) : '-∞'
        ctx.fillText(`${db} dB`, width / 2, barHeight - 5)
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [level, peak, peakHoldTime, height, showPeak, showDb, gradient])

  return (
    <div className={cn('relative', className)}>
      <canvas
        ref={canvasRef}
        width={300}
        height={height}
        className="w-full h-full rounded"
      />
      
      {/* Level indicators */}
      <div className="absolute inset-x-0 top-0 flex justify-between px-1 text-[8px] text-gray-500">
        <span>-60</span>
        <span>-40</span>
        <span>-20</span>
        <span>0</span>
      </div>
    </div>
  )
}