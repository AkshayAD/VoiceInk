/**
 * Simple React entry point for Steps 1-5
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App-simple'

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)