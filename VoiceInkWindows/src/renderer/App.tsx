import React, { useState } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import { Dashboard } from './components/pages/Dashboard'
import { RecorderPage } from './components/pages/RecorderPage'
import { HistoryPage } from './components/pages/HistoryPage'
import { ModelsPage } from './components/pages/ModelsPage'
import { PowerModePage } from './components/pages/PowerModePage'
import { SettingsPage } from './components/pages/SettingsPage'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { ToastContainer, useToast } from './components/ui/Toast'

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const { toasts, removeToast } = useToast()

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard currentPage={currentPage} onPageChange={setCurrentPage} />
      case 'recorder':
        return <RecorderPage currentPage={currentPage} onPageChange={setCurrentPage} />
      case 'history':
        return <HistoryPage currentPage={currentPage} onPageChange={setCurrentPage} />
      case 'models':
        return <ModelsPage currentPage={currentPage} onPageChange={setCurrentPage} />
      case 'power-mode':
        return <PowerModePage currentPage={currentPage} onPageChange={setCurrentPage} />
      case 'settings':
        return <SettingsPage currentPage={currentPage} onPageChange={setCurrentPage} />
      default:
        return <Dashboard currentPage={currentPage} onPageChange={setCurrentPage} />
    }
  }

  return (
    <ErrorBoundary>
      <MainLayout>
        {renderCurrentPage()}
      </MainLayout>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ErrorBoundary>
  )
}

export default App