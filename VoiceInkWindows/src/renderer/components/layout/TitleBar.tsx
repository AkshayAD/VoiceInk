import React, { useState, useEffect } from 'react'
import { Minus, Square, X, MoreHorizontal } from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

interface TitleBarProps {
  title?: string
  className?: string
}

export const TitleBar: React.FC<TitleBarProps> = ({ 
  title = "VoiceInk", 
  className 
}) => {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    // Listen for window state changes
    const handleMaximize = () => setIsMaximized(true)
    const handleUnmaximize = () => setIsMaximized(false)
    
    if (window.electronAPI) {
      window.electronAPI.onMaximized?.(handleMaximize)
      window.electronAPI.onUnmaximized?.(handleUnmaximize)
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners?.('window-maximized')
        window.electronAPI.removeAllListeners?.('window-unmaximized')
      }
    }
  }, [])

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow()
  }

  const handleMaximize = () => {
    window.electronAPI?.maximizeWindow()
  }

  const handleClose = () => {
    window.electronAPI?.closeWindow()
  }

  return (
    <div className={cn(
      "flex items-center justify-between h-8 bg-background border-b border-border titlebar-drag select-none",
      className
    )}>
      {/* App Icon and Title */}
      <div className="flex items-center gap-2 px-3">
        <div className="w-4 h-4 bg-primary rounded-sm flex items-center justify-center">
          <span className="text-[10px] text-primary-foreground font-bold">V</span>
        </div>
        <span className="text-sm font-medium">{title}</span>
      </div>

      {/* Window Controls */}
      <div className="flex titlebar-no-drag">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-12 rounded-none hover:bg-muted"
          onClick={handleMinimize}
        >
          <Minus size={14} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-12 rounded-none hover:bg-muted"
          onClick={handleMaximize}
        >
          <Square size={12} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-12 rounded-none hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleClose}
        >
          <X size={14} />
        </Button>
      </div>
    </div>
  )
}