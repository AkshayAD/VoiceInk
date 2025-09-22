/**
 * Simple React App for Steps 1-5
 */

import { useState } from 'react'

export default function App() {
  const [message, setMessage] = useState('')

  const handleClick = () => {
    if (window.electronAPI) {
      const result = window.electronAPI.sayHello()
      setMessage(result)
    } else {
      setMessage('Electron API not available')
    }
  }

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#1a1a1a',
      color: 'white',
      minHeight: '100vh'
    }}>
      <h1>VoiceInk Windows - Minimal Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleClick}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Click for Hello World
        </button>
      </div>

      {message && (
        <div style={{
          padding: '10px',
          backgroundColor: '#2a2a2a',
          borderRadius: '5px',
          marginTop: '10px'
        }}>
          <strong>Result:</strong> {message}
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#ccc' }}>
        <p>Platform: {window.electronAPI?.platform || 'Unknown'}</p>
        <p>Electron: {window.electronAPI?.version || 'Unknown'}</p>
      </div>
    </div>
  )
}