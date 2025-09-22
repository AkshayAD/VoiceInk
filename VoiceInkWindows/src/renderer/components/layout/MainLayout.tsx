import React, { useState } from 'react'
import { TitleBar } from './TitleBar'
import { Sidebar } from './Sidebar'
import { cn } from '../../lib/utils'

interface MainLayoutProps {
  children: React.ReactNode
  className?: string
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, className }) => {
  const [currentPage, setCurrentPage] = useState('dashboard')

  return (
    <div className={cn("flex flex-col h-screen bg-background", className)}>
      {/* Title Bar */}
      <TitleBar />
      
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          currentPage={currentPage} 
          onPageChange={setCurrentPage} 
        />
        
        {/* Content */}
        <main className="flex-1 overflow-auto">
          {React.cloneElement(children as React.ReactElement, { 
            currentPage, 
            onPageChange: setCurrentPage 
          })}
        </main>
      </div>
    </div>
  )
}