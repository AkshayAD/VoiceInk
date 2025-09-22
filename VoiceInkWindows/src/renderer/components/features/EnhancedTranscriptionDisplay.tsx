import React, { useState, useRef, useEffect } from 'react'
import { User, Clock, Play, Pause, Copy, Check, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

interface Speaker {
  id: string
  label: string
  color: string
}

interface TranscriptionSegment {
  id: string
  text: string
  startTime: number
  endTime: number
  speakerId?: string
  confidence?: number
  isPlaying?: boolean
}

interface EnhancedTranscriptionDisplayProps {
  segments: TranscriptionSegment[]
  speakers?: Speaker[]
  currentTime?: number
  isPlaying?: boolean
  onTimestampClick?: (time: number) => void
  onSegmentEdit?: (segmentId: string, text: string) => void
  showSpeakers?: boolean
  showTimestamps?: boolean
  showConfidence?: boolean
  highlightLowConfidence?: boolean
  className?: string
}

const SPEAKER_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
]

export const EnhancedTranscriptionDisplay: React.FC<EnhancedTranscriptionDisplayProps> = ({
  segments = [],
  speakers = [],
  currentTime = 0,
  isPlaying = false,
  onTimestampClick,
  onSegmentEdit,
  showSpeakers = true,
  showTimestamps = true,
  showConfidence = false,
  highlightLowConfidence = true,
  className = ''
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Auto-generate speakers if not provided
  const effectiveSpeakers = speakers.length > 0 ? speakers : 
    Array.from(new Set(segments.map(s => s.speakerId).filter(Boolean))).map((id, index) => ({
      id: id!,
      label: `Speaker ${index + 1}`,
      color: SPEAKER_COLORS[index % SPEAKER_COLORS.length]
    }))

  // Find active segment based on current time
  const activeSegmentIndex = segments.findIndex(
    seg => currentTime >= seg.startTime && currentTime <= seg.endTime
  )

  // Auto-scroll to active segment
  useEffect(() => {
    if (autoScroll && activeSegmentIndex >= 0 && containerRef.current) {
      const activeElement = containerRef.current.querySelector(`[data-segment="${activeSegmentIndex}"]`)
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [activeSegmentIndex, autoScroll])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleCopySegment = (segment: TranscriptionSegment) => {
    navigator.clipboard.writeText(segment.text)
    setCopiedId(segment.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleEditStart = (segment: TranscriptionSegment) => {
    setEditingId(segment.id)
    setEditText(segment.text)
  }

  const handleEditSave = () => {
    if (editingId && onSegmentEdit) {
      onSegmentEdit(editingId, editText)
    }
    setEditingId(null)
    setEditText('')
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditText('')
  }

  const getSpeakerColor = (speakerId?: string): string => {
    const speaker = effectiveSpeakers.find(s => s.id === speakerId)
    return speaker?.color || '#6B7280'
  }

  const getSpeakerLabel = (speakerId?: string): string => {
    const speaker = effectiveSpeakers.find(s => s.id === speakerId)
    return speaker?.label || 'Unknown'
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with controls */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold">Transcription</h3>
          {segments.length > 0 && (
            <Badge variant="secondary">
              {segments.length} segments
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(autoScroll && 'bg-primary/10')}
          >
            Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
          </Button>
        </div>
      </div>

      {/* Speaker legend */}
      {showSpeakers && effectiveSpeakers.length > 1 && (
        <div className="flex items-center gap-4 p-4 border-b bg-gray-50">
          <span className="text-sm font-medium">Speakers:</span>
          <div className="flex flex-wrap gap-2">
            {effectiveSpeakers.map(speaker => (
              <div
                key={speaker.id}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-white border"
                style={{ borderColor: speaker.color }}
              >
                <User size={14} style={{ color: speaker.color }} />
                <span className="text-sm">{speaker.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transcription segments */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        onScroll={() => setAutoScroll(false)}
      >
        {segments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No transcription available yet...
          </div>
        ) : (
          segments.map((segment, index) => {
            const isActive = index === activeSegmentIndex
            const isLowConfidence = segment.confidence && segment.confidence < 0.7
            const isEditing = editingId === segment.id
            const isCopied = copiedId === segment.id

            return (
              <div
                key={segment.id}
                data-segment={index}
                className={cn(
                  'group relative rounded-lg border p-4 transition-all',
                  isActive && 'ring-2 ring-primary bg-primary/5',
                  isLowConfidence && highlightLowConfidence && 'bg-yellow-50 border-yellow-300',
                  'hover:shadow-md'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Speaker indicator */}
                  {showSpeakers && segment.speakerId && (
                    <div 
                      className="w-1 self-stretch rounded-full"
                      style={{ backgroundColor: getSpeakerColor(segment.speakerId) }}
                    />
                  )}

                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      {showSpeakers && segment.speakerId && (
                        <Badge 
                          variant="outline" 
                          style={{ 
                            color: getSpeakerColor(segment.speakerId),
                            borderColor: getSpeakerColor(segment.speakerId) 
                          }}
                        >
                          <User size={12} className="mr-1" />
                          {getSpeakerLabel(segment.speakerId)}
                        </Badge>
                      )}
                      
                      {showTimestamps && (
                        <button
                          onClick={() => onTimestampClick?.(segment.startTime)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Clock size={12} />
                          {formatTime(segment.startTime)}
                          {segment.endTime > segment.startTime && (
                            <>
                              <ChevronRight size={12} />
                              {formatTime(segment.endTime)}
                            </>
                          )}
                        </button>
                      )}
                      
                      {showConfidence && segment.confidence && (
                        <Badge 
                          variant={segment.confidence > 0.8 ? 'success' : segment.confidence > 0.6 ? 'warning' : 'destructive'}
                          className="text-xs"
                        >
                          {Math.round(segment.confidence * 100)}%
                        </Badge>
                      )}

                      {/* Action buttons */}
                      <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onTimestampClick && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onTimestampClick(segment.startTime)}
                          >
                            <Play size={14} />
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopySegment(segment)}
                        >
                          {isCopied ? <Check size={14} /> : <Copy size={14} />}
                        </Button>
                        
                        {onSegmentEdit && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditStart(segment)}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Text content */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleEditSave}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleEditCancel}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{segment.text}</p>
                    )}
                  </div>
                </div>

                {/* Playing indicator */}
                {isActive && isPlaying && (
                  <div className="absolute -left-6 top-1/2 -translate-y-1/2">
                    <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer with statistics */}
      {segments.length > 0 && (
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Total duration: {formatTime(segments[segments.length - 1]?.endTime || 0)}
          </div>
          <div>
            Word count: {segments.reduce((acc, seg) => acc + seg.text.split(' ').length, 0)}
          </div>
        </div>
      )}
    </div>
  )
}