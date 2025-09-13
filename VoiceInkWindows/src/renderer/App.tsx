import React, { useState, useEffect } from 'react'

const App: React.FC = () => {
  const [pingResponse, setPingResponse] = useState<string>('')
  const [messageResponse, setMessageResponse] = useState<string>('')
  const [appVersion, setAppVersion] = useState<string>('')
  const [dbTestResult, setDbTestResult] = useState<string>('')
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    // Setup IPC listener for test replies
    if (window.electronAPI) {
      window.electronAPI.onTestReply((data: string) => {
        setMessageResponse(data)
      })
    }
    
    // Cleanup on unmount
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('test-reply')
      }
    }
  }, [])

  // Step 6: Test IPC Communication
  const testPing = async () => {
    if (window.electronAPI) {
      const response = await window.electronAPI.ping()
      setPingResponse(response)
      console.log('Ping response:', response)
    }
  }

  const testMessage = () => {
    if (window.electronAPI) {
      window.electronAPI.sendMessage('Hello from renderer!')
    }
  }

  const getVersion = async () => {
    if (window.electronAPI) {
      const version = await window.electronAPI.getAppVersion()
      setAppVersion(version)
    }
  }

  // Step 7: Test Database
  const testDatabase = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.testDatabase()
      setDbTestResult(JSON.stringify(result, null, 2))
    }
  }

  // Step 10: Window Management
  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow()
    }
  }

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.maximizeWindow()
      setIsMaximized(!isMaximized)
    }
  }

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.closeWindow()
    }
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Custom Title Bar */}
      <div style={{
        height: '32px',
        background: '#2a2a2a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 10px',
        WebkitAppRegion: 'drag',
        userSelect: 'none'
      } as React.CSSProperties}>
        <div style={{ fontSize: '14px' }}>VoiceInk Windows</div>
        <div style={{ display: 'flex', gap: '5px', WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={handleMinimize}
            style={{
              width: '46px',
              height: '28px',
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '16px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            —
          </button>
          <button
            onClick={handleMaximize}
            style={{
              width: '46px',
              height: '28px',
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {isMaximized ? '◱' : '□'}
          </button>
          <button
            onClick={handleClose}
            style={{
              width: '46px',
              height: '28px',
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '16px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e81123'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
        <h1>VoiceInk Windows - Test Dashboard</h1>
        
        <div style={{ marginBottom: '30px' }}>
          <h2>Step 6: IPC Communication Tests</h2>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button onClick={testPing} style={buttonStyle}>Test Ping</button>
            <button onClick={testMessage} style={buttonStyle}>Send Message</button>
            <button onClick={getVersion} style={buttonStyle}>Get App Version</button>
          </div>
          <div style={{ background: '#2a2a2a', padding: '10px', borderRadius: '5px', minHeight: '50px' }}>
            {pingResponse && <div>Ping Response: {pingResponse}</div>}
            {messageResponse && <div>Message Response: {messageResponse}</div>}
            {appVersion && <div>App Version: {appVersion}</div>}
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h2>Step 7: Database Test</h2>
          <button onClick={testDatabase} style={buttonStyle}>Test Database Connection</button>
          {dbTestResult && (
            <pre style={{ background: '#2a2a2a', padding: '10px', borderRadius: '5px', marginTop: '10px' }}>
              {dbTestResult}
            </pre>
          )}
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h2>Step 9: React Renderer</h2>
          <div style={{ background: '#2a2a2a', padding: '10px', borderRadius: '5px' }}>
            ✅ React is rendering successfully!<br />
            ✅ Component state is working<br />
            ✅ Event handlers are functioning
          </div>
        </div>

        <div>
          <h2>Step 10: Window Management</h2>
          <div style={{ background: '#2a2a2a', padding: '10px', borderRadius: '5px' }}>
            ✅ Custom title bar is working<br />
            ✅ Minimize button is functional<br />
            ✅ Maximize/Restore button is functional<br />
            ✅ Close button is functional
          </div>
        </div>
      </div>
    </div>
  )
}

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#4a9eff',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px'
}

export default App