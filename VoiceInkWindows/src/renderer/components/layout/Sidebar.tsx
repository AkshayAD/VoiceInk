import React from 'react'
import { 
  Mic, 
  History, 
  Settings, 
  Zap, 
  Download,
  Home,
  FileText 
} from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

export interface SidebarItem {
  id: string
  label: string
  icon: React.ReactNode
  path: string
  badge?: string | number
}

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
  className?: string
}

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
    path: '/recorder'
  },
  {
    id: 'history',
    label: 'History',
    icon: <History size={18} />,
    path: '/history'
  },
  {
    id: 'models',
    label: 'AI Models',
    icon: <Download size={18} />,
    path: '/models'
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

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentPage, 
  onPageChange, 
  className 
}) => {
  return (
    <div className={cn(
      "w-64 h-full bg-card border-r border-border flex flex-col",
      className
    )}>
      {/* Logo Section */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Mic size={18} className="text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">VoiceInk</h2>
            <p className="text-xs text-muted-foreground">AI Voice Assistant</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-2">
        <div className="space-y-1">
          {sidebarItems.map((item) => (
            <Button
              key={item.id}
              variant={currentPage === item.id ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-10",
                currentPage === item.id && "bg-secondary text-secondary-foreground"
              )}
              onClick={() => onPageChange(item.id)}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Button>
          ))}
        </div>
      </nav>

      {/* Status Section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Ready to record</span>
        </div>
      </div>
    </div>
  )
}