import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Add TypeScript declaration for electronAPI
declare global {
  interface Window {
    electronAPI: {
      ping: () => Promise<string>
      sendMessage: (message: string) => void
      onTestReply: (callback: (data: string) => void) => void
      getAppVersion: () => Promise<string>
      minimizeWindow: () => void
      maximizeWindow: () => void
      closeWindow: () => void
      testDatabase: () => Promise<any>
      removeAllListeners: (channel: string) => void
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)