// System tray integration
import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron'
import path from 'path'

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null
let isRecording = false

export function createSystemTray(window: BrowserWindow) {
  mainWindow = window

  // Create tray icon
  const iconPath = createTrayIcon('idle')
  tray = new Tray(iconPath)

  // Set initial tooltip
  tray.setToolTip('VoiceInk - Ready')

  // Create context menu
  updateTrayMenu()

  // Handle tray click
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  // Handle right-click (Windows/Linux)
  tray.on('right-click', () => {
    tray?.popUpContextMenu()
  })

  console.log('✅ System tray created')
}

function createTrayIcon(status: 'idle' | 'recording' | 'processing'): nativeImage {
  // Create a simple colored circle as tray icon
  const size = process.platform === 'darwin' ? 22 : 16
  const canvas = Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" 
              fill="${status === 'idle' ? '#10b981' : status === 'recording' ? '#ef4444' : '#eab308'}" 
              stroke="white" stroke-width="1"/>
      ${status === 'recording' ? `<circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="white"/>` : ''}
    </svg>
  `)

  return nativeImage.createFromBuffer(canvas)
}

function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'VoiceInk',
      type: 'normal',
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      label: isRecording ? '⏹️ Stop Recording' : '🎤 Start Recording',
      type: 'normal',
      click: toggleRecording,
      accelerator: 'CommandOrControl+Shift+R'
    },
    {
      label: '📱 Open Mini Recorder',
      type: 'normal',
      click: openMiniRecorder,
      accelerator: 'CommandOrControl+Shift+M'
    },
    {
      type: 'separator'
    },
    {
      label: '📊 Show Dashboard',
      type: 'normal',
      click: showMainWindow
    },
    {
      label: '📜 View History',
      type: 'normal',
      click: () => showMainWindow('/history')
    },
    {
      label: '⚙️ Settings',
      type: 'normal',
      click: () => showMainWindow('/settings')
    },
    {
      type: 'separator'
    },
    {
      label: 'About VoiceInk',
      type: 'normal',
      click: showAbout
    },
    {
      label: 'Quit VoiceInk',
      type: 'normal',
      accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
      click: () => {
        app.quit()
      }
    }
  ])

  tray?.setContextMenu(contextMenu)
}

async function toggleRecording() {
  try {
    if (isRecording) {
      // Stop recording
      mainWindow?.webContents.send('tray:stopRecording')
      updateRecordingStatus(false)
    } else {
      // Start recording
      mainWindow?.webContents.send('tray:startRecording')
      updateRecordingStatus(true)
    }
  } catch (error) {
    console.error('Failed to toggle recording from tray:', error)
  }
}

function openMiniRecorder() {
  mainWindow?.webContents.send('tray:openMiniRecorder')
}

function showMainWindow(route?: string) {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
    
    if (route) {
      mainWindow.webContents.send('navigate', route)
    }
  }
}

function showAbout() {
  const { dialog } = require('electron')
  
  dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: 'About VoiceInk',
    message: 'VoiceInk',
    detail: `Version: ${app.getVersion()}\nAI-powered voice transcription for Windows\n\nBuilt with ❤️ for productivity`,
    buttons: ['OK']
  })
}

export function updateRecordingStatus(recording: boolean) {
  isRecording = recording
  
  // Update tray icon
  const iconStatus = recording ? 'recording' : 'idle'
  const newIcon = createTrayIcon(iconStatus)
  tray?.setImage(newIcon)
  
  // Update tooltip
  const tooltip = recording ? 'VoiceInk - Recording...' : 'VoiceInk - Ready'
  tray?.setToolTip(tooltip)
  
  // Update context menu
  updateTrayMenu()
  
  // Show notification
  if (recording) {
    tray?.displayBalloon({
      title: 'Recording Started',
      content: 'VoiceInk is now recording audio',
      icon: newIcon
    })
  } else {
    tray?.displayBalloon({
      title: 'Recording Stopped',
      content: 'Processing transcription...',
      icon: newIcon
    })
  }
}

export function updateProcessingStatus(processing: boolean) {
  const iconStatus = processing ? 'processing' : 'idle'
  const newIcon = createTrayIcon(iconStatus)
  tray?.setImage(newIcon)
  
  const tooltip = processing ? 'VoiceInk - Processing...' : 'VoiceInk - Ready'
  tray?.setToolTip(tooltip)
}

export function destroyTray() {
  if (tray) {
    tray.destroy()
    tray = null
    console.log('🗑️ System tray destroyed')
  }
}