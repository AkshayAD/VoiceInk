import React, { useState, useEffect } from 'react'
import { 
  Mic, 
  History, 
  Settings, 
  Zap, 
  Download,
  Home,
  ChevronLeft,
  ChevronRight,
  Circle,
  Square,
  Minimize2
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { cn } from '../../lib/utils'

export interface SidebarItem {
  id: string
  label: string
  icon: React.ReactNode
  path: string
  badge?: string | number | React.ReactNode
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

interface EnhancedSidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
  className?: string
}

export const EnhancedSidebar: React.FC<EnhancedSidebarProps> = ({ 
  currentPage, 
  onPageChange, 
  className 
}) => {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    return saved === 'true'
  })
  const [isRecording, setIsRecording] = useState(false)
  const [transcriptionCount, setTranscriptionCount] = useState(0)
  const [modelUpdateAvailable, setModelUpdateAvailable] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', collapsed.toString())
  }, [collapsed])

  useEffect(() => {
    // Listen for recording status
    const checkRecordingStatus = async () => {
      const status = await window.electronAPI?.audio?.isRecording()
      setIsRecording(status || false)
    }

    const interval = setInterval(checkRecordingStatus, 1000)
    checkRecordingStatus()

    // Listen for transcription updates
    const handleTranscriptionComplete = () => {
      setTranscriptionCount(prev => prev + 1)
    }

    window.electronAPI?.transcription?.onProgress?.((progress) => {
      if (progress.status === 'completed') {
        handleTranscriptionComplete()
      }
    })

    // Check for model updates
    const checkModelUpdates = async () => {
      const models = await window.electronAPI?.transcription?.getModels()
      const hasUpdates = models?.some((m: any) => m.updateAvailable)
      setModelUpdateAvailable(hasUpdates || false)
    }

    checkModelUpdates()

    return () => {
      clearInterval(interval)
    }
  }, [])

  // Update sidebar items with dynamic badges
  const sidebarItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Home size={18} />,
      path: '/dashboard'
    },
    {
      id: 'recorder',
      label: 'Recorder',
      icon: <Mic size={18} />,
      path: '/recorder',
      badge: isRecording ? <Circle className="w-2 h-2 fill-red-500 animate-pulse" /> : undefined
    },
    {
      id: 'history',
      label: 'History',
      icon: <History size={18} />,
      path: '/history',
      badge: transcriptionCount > 0 ? transcriptionCount : undefined,
      badgeVariant: 'secondary'
    },
    {
      id: 'models',
      label: 'AI Models',
      icon: <Download size={18} />,
      path: '/models',
      badge: modelUpdateAvailable ? 'Update' : undefined,
      badgeVariant: 'destructive'
    },
    {
      id: 'power-mode',
      label: 'Power Mode',
      icon: <Zap size={18} />,
      path: '/power-mode'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings size={18} />,
      path: '/settings'
    }
  ]

  const handleOpenMiniRecorder = () => {
    window.electronAPI?.window?.openMiniRecorder()
  }

  return (
    <div className={cn(
      "h-full bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Logo Section */}
      <div className={cn(
        "border-b border-border transition-all duration-300",
        collapsed ? "p-2" : "p-4"
      )}>
        <div className={cn(
          "flex items-center",
          collapsed ? "justify-center" : "gap-3"
        )}>
          <div className={cn(
            "bg-primary rounded-lg flex items-center justify-center transition-all",
            collapsed ? "w-10 h-10" : "w-8 h-8"
          )}>
            <Mic size={18} className="text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-in fade-in duration-300">
              <h2 className="font-semibold text-lg">VoiceInk</h2>
              <p className="text-xs text-muted-foreground">AI Voice Assistant</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <div className={cn(
        "flex border-b border-border",
        collapsed ? "justify-center p-2" : "justify-between items-center px-4 py-2"
      )}>
        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenMiniRecorder}
            className="gap-2"
          >
            <Minimize2 size={14} />
            <span className="text-xs">Mini Mode</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="transition-transform duration-200 hover:scale-105"
        >
          {collapsed ? (
            <ChevronRight size={16} />
          ) : (
            <ChevronLeft size={16} />
          )}
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <div className="space-y-1">
          {sidebarItems.map((item) => {
            const isActive = currentPage === item.id
            const isHovered = hoveredItem === item.id

            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full transition-all duration-200",
                  collapsed ? "justify-center px-0" : "justify-start gap-3",
                  "h-10",
                  isActive && "bg-secondary text-secondary-foreground shadow-sm",
                  isHovered && !isActive && "translate-x-1"
                )}
                onClick={() => onPageChange(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                title={collapsed ? item.label : undefined}
              >
                <div className="relative">
                  {item.icon}
                  {collapsed && item.badge && typeof item.badge !== 'string' && typeof item.badge !== 'number' && (
                    <div className="absolute -top-1 -right-1">
                      {item.badge}
                    </div>
                  )}
                </div>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left animate-in fade-in duration-300">
                      {item.label}
                    </span>
                    {item.badge && (
                      typeof item.badge === 'string' || typeof item.badge === 'number' ? (
                        <Badge variant={item.badgeVariant} className="animate-in slide-in-from-right duration-300">
                          {item.badge}
                        </Badge>
                      ) : (
                        <div className="animate-in fade-in duration-300">
                          {item.badge}
                        </div>
                      )
                    )}
                  </>
                )}
              </Button>
            )
          })}
        </div>
      </nav>

      {/* Status Section */}
      <div className={cn(
        "border-t border-border transition-all duration-300",
        collapsed ? "p-2" : "p-4"
      )}>
        <div className={cn(
          "flex items-center text-sm text-muted-foreground",
          collapsed ? "justify-center" : "gap-2"
        )}>
          {isRecording ? (
            <>
              <Square className="w-2 h-2 fill-red-500 animate-pulse" />
              {!collapsed && <span className="animate-in fade-in duration-300">Recording...</span>}
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              {!collapsed && <span className="animate-in fade-in duration-300">Ready</span>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}