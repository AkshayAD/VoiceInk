import React, { useState, useEffect, useRef } from 'react'
import { Copy, Edit, Save, X, FileText } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { cn } from '../../lib/utils'

interface TranscriptionSegment {
  id: string
  text: string
  startTime: number
  endTime: number
  confidence: number
  isFinal: boolean
}

interface TranscriptionDisplayProps {
  segments?: TranscriptionSegment[]
  isLive?: boolean
  currentTime?: number
  onEdit?: (segmentId: string, newText: string) => void
  onCopy?: (text: string) => void
  className?: string
  showTimestamps?: boolean
  showConfidence?: boolean
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  segments = [],
  isLive = false,
  currentTime = 0,
  onEdit,
  onCopy,
  className,
  showTimestamps = true,
  showConfidence = false
}) => {
  const [editingSegment, setEditingSegment] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new segments are added
  useEffect(() => {
    if (scrollRef.current && isLive) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [segments, isLive])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleEdit = (segment: TranscriptionSegment) => {
    setEditingSegment(segment.id)
    setEditText(segment.text)
  }

  const handleSaveEdit = () => {
    if (editingSegment && onEdit) {
      onEdit(editingSegment, editText)
    }
    setEditingSegment(null)
    setEditText('')
  }

  const handleCancelEdit = () => {
    setEditingSegment(null)
    setEditText('')
  }

  const handleCopyAll = () => {
    const allText = segments.map(s => s.text).join(' ')
    onCopy?.(allText)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success'
    if (confidence >= 0.6) return 'warning'
    return 'destructive'
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText size={20} />
            Transcription
            {isLive && (
              <Badge variant="success" className="ml-2">
                Live
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyAll}
              disabled={segments.length === 0}
            >
              <Copy size={16} className="mr-1" />
              Copy All
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <div 
          ref={scrollRef}
          className="h-full overflow-y-auto custom-scrollbar space-y-3"
        >
          {segments.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>No transcription yet</p>
                <p className="text-sm">Start recording to see live transcription</p>
              </div>
            </div>
          ) : (
            segments.map((segment) => (
              <div
                key={segment.id}
                className={cn(
                  "group p-3 rounded-lg border transition-all",
                  segment.isFinal ? "bg-card" : "bg-muted/50",
                  currentTime >= segment.startTime && currentTime <= segment.endTime && isLive
                    ? "ring-2 ring-primary"
                    : ""
                )}
              >
                {/* Segment Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {showTimestamps && (
                      <Badge variant="outline" className="text-xs">
                        {formatTime(segment.startTime)}
                      </Badge>
                    )}
                    {showConfidence && (
                      <Badge 
                        variant={getConfidenceColor(segment.confidence)}
                        className="text-xs"
                      >
                        {Math.round(segment.confidence * 100)}%
                      </Badge>
                    )}
                    {!segment.isFinal && (
                      <Badge variant="warning" className="text-xs">
                        Processing...
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(segment)}
                      disabled={!segment.isFinal}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onCopy?.(segment.text)}
                    >
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>

                {/* Segment Text */}
                {editingSegment === segment.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full p-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit}>
                        <Save size={14} className="mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                        <X size={14} className="mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className={cn(
                    "text-sm leading-relaxed",
                    !segment.isFinal && "opacity-70"
                  )}>
                    {segment.text || (
                      <span className="italic text-muted-foreground">
                        Listening...
                      </span>
                    )}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}