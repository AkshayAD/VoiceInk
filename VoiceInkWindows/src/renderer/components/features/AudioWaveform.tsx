import React, { useRef, useEffect, useState } from 'react'
import { cn } from '../../lib/utils'

interface AudioWaveformProps {
  audioData?: Float32Array | number[]
  isRecording?: boolean
  height?: number
  barWidth?: number
  barGap?: number
  color?: string
  backgroundColor?: string
  className?: string
  animate?: boolean
  style?: 'bars' | 'wave' | 'circle'
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  audioData,
  isRecording = false,
  height = 100,
  barWidth = 3,
  barGap = 2,
  color = '#3B82F6',
  backgroundColor = '#E5E7EB',
  className = '',
  animate = true,
  style = 'bars'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const [dimensions, setDimensions] = useState({ width: 0, height })

  // Generate random data for animation when recording
  const generateRandomData = (length: number): number[] => {
    return Array.from({ length }, () => Math.random() * 0.5 + 0.1)
  }

  // Resize observer for responsive canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width } = entry.contentRect
        setDimensions({ width, height })
        canvas.width = width
        canvas.height = height
      }
    })

    resizeObserver.observe(canvas.parentElement!)

    return () => {
      resizeObserver.disconnect()
    }
  }, [height])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height)

      if (style === 'bars') {
        drawBars(ctx)
      } else if (style === 'wave') {
        drawWave(ctx)
      } else if (style === 'circle') {
        drawCircle(ctx)
      }

      if (animate && isRecording) {
        animationRef.current = requestAnimationFrame(draw)
      }
    }

    const drawBars = (ctx: CanvasRenderingContext2D) => {
      const barCount = Math.floor(dimensions.width / (barWidth + barGap))
      const data = audioData || (isRecording ? generateRandomData(barCount) : new Array(barCount).fill(0.1))
      
      // Draw background bars
      ctx.fillStyle = backgroundColor
      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + barGap)
        ctx.fillRect(x, 0, barWidth, dimensions.height)
      }

      // Draw active bars
      ctx.fillStyle = color
      for (let i = 0; i < Math.min(barCount, data.length); i++) {
        const x = i * (barWidth + barGap)
        const barHeight = data[i] * dimensions.height
        const y = (dimensions.height - barHeight) / 2
        
        ctx.fillRect(x, y, barWidth, barHeight)
      }
    }

    const drawWave = (ctx: CanvasRenderingContext2D) => {
      const data = audioData || (isRecording ? generateRandomData(100) : new Array(100).fill(0))
      const sliceWidth = dimensions.width / data.length
      
      ctx.lineWidth = 2
      ctx.strokeStyle = color
      ctx.beginPath()

      let x = 0
      for (let i = 0; i < data.length; i++) {
        const amplitude = data[i] * dimensions.height * 0.8
        const y = dimensions.height / 2 + (amplitude * Math.sin(i * 0.1 + Date.now() * 0.001))
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
        
        x += sliceWidth
      }

      ctx.stroke()
    }

    const drawCircle = (ctx: CanvasRenderingContext2D) => {
      const centerX = dimensions.width / 2
      const centerY = dimensions.height / 2
      const radius = Math.min(dimensions.width, dimensions.height) * 0.3
      const data = audioData || (isRecording ? generateRandomData(60) : new Array(60).fill(0.1))
      
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      
      for (let i = 0; i < data.length; i++) {
        const angle = (i / data.length) * Math.PI * 2 - Math.PI / 2
        const amplitude = data[i] * radius * 0.5
        const x1 = centerX + Math.cos(angle) * radius
        const y1 = centerY + Math.sin(angle) * radius
        const x2 = centerX + Math.cos(angle) * (radius + amplitude)
        const y2 = centerY + Math.sin(angle) * (radius + amplitude)
        
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [dimensions, audioData, isRecording, animate, style, barWidth, barGap, color, backgroundColor])

  return (
    <div className={cn('relative w-full', className)} style={{ height }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
      {!isRecording && !audioData && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <span className="text-sm">No audio signal</span>
        </div>
      )}
    </div>
  )
}

// Spectrum Analyzer Component
interface SpectrumAnalyzerProps {
  analyser?: AnalyserNode
  isActive?: boolean
  className?: string
  barCount?: number
  color?: string
}

export const SpectrumAnalyzer: React.FC<SpectrumAnalyzerProps> = ({
  analyser,
  isActive = false,
  className = '',
  barCount = 32,
  color = '#3B82F6'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !analyser || !isActive) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      analyser.getByteFrequencyData(dataArray)
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const barWidth = canvas.width / barCount
      const barGap = 2
      
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * bufferLength / barCount)
        const barHeight = (dataArray[dataIndex] / 255) * canvas.height
        
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height)
        gradient.addColorStop(0, color)
        gradient.addColorStop(1, `${color}33`)
        
        ctx.fillStyle = gradient
        ctx.fillRect(
          i * barWidth + barGap / 2,
          canvas.height - barHeight,
          barWidth - barGap,
          barHeight
        )
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [analyser, isActive, barCount, color])

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={150}
      className={cn('w-full h-full', className)}
    />
  )
}