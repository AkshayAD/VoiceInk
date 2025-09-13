/**
 * Main entry point for VoiceInk Windows
 * Manages app lifecycle, windows, and system integration
 */

import { app, BrowserWindow, Menu, Tray, ipcMain, shell, globalShortcut, clipboard, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { autoUpdater } from 'electron-updater'

// Import services
import { AudioRecorder } from './audio/recorder'
import { WhisperService } from './whisper/service'
import { HotkeyManager } from './system/hotkeys'
import { WindowDetector } from './system/window'
import { ClipboardManager } from './system/clipboard'
import { DatabaseService } from './database/service'
import { setupIPC } from './ipc/handlers'

// Initialize store for settings
const store = new Store({
  defaults: {
    alwaysOnTop: false,
    startMinimized: false,
    launchAtLogin: false,
    theme: 'dark',
    selectedModel: 'ggml-base.en',
    hotkeys: {
      toggleRecording: 'Alt+Space',
      toggleMiniRecorder: 'Alt+Shift+R',
      pasteLastTranscription: 'Alt+Shift+V'
    }
  }
})

class VoiceInkApp {
  private mainWindow: BrowserWindow | null = null
  private miniRecorderWindow: BrowserWindow | null = null
  private tray: Tray | null = null
  private audioRecorder: AudioRecorder
  private whisperService: WhisperService
  private hotkeyManager: HotkeyManager
  private windowDetector: WindowDetector
  private clipboardManager: ClipboardManager
  private databaseService: DatabaseService
  private isQuitting = false

  constructor() {
    // Initialize services
    this.audioRecorder = new AudioRecorder()
    this.whisperService = new WhisperService()
    this.hotkeyManager = new HotkeyManager()
    this.windowDetector = new WindowDetector()
    this.clipboardManager = new ClipboardManager()
    this.databaseService = new DatabaseService()
  }

  async initialize() {
    // Setup single instance lock
    const gotTheLock = app.requestSingleInstanceLock()
    if (!gotTheLock) {
      app.quit()
      return
    }

    // Enable high DPI support
    app.commandLine.appendSwitch('high-dpi-support', '1')
    app.commandLine.appendSwitch('force-device-scale-factor', '1')

    // Setup app event handlers
    this.setupAppEvents()
    
    // Wait for app ready
    await app.whenReady()

    // Initialize services
    await this.initializeServices()

    // Create main window
    this.createMainWindow()

    // Setup system tray
    this.setupSystemTray()

    // Setup IPC handlers
    setupIPC({
      audioRecorder: this.audioRecorder,
      whisperService: this.whisperService,
      windowDetector: this.windowDetector,
      clipboardManager: this.clipboardManager,
      databaseService: this.databaseService,
      store
    })

    // Register global shortcuts
    this.registerGlobalShortcuts()

    // Check for updates
    if (is.prod) {
      autoUpdater.checkForUpdatesAndNotify()
    }
  }

  private setupAppEvents() {
    // Handle second instance
    app.on('second-instance', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) this.mainWindow.restore()
        this.mainWindow.focus()
      }
    })

    // Prevent app quit on window close
    app.on('window-all-closed', (e: Event) => {
      if (process.platform !== 'darwin' && !this.isQuitting) {
        e.preventDefault()
      }
    })

    // Handle app activation (macOS)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow()
      }
    })

    // Cleanup on quit
    app.on('before-quit', () => {
      this.isQuitting = true
      globalShortcut.unregisterAll()
      this.audioRecorder.cleanup()
      this.whisperService.cleanup()
    })
  }

  private async initializeServices() {
    // Initialize database
    await this.databaseService.initialize()

    // Initialize audio recorder
    await this.audioRecorder.initialize()

    // Load whisper model
    const selectedModel = store.get('selectedModel') as string
    await this.whisperService.loadModel(selectedModel)

    // Initialize window detector
    this.windowDetector.startMonitoring()
  }

  private createMainWindow() {
    // Create the browser window
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      show: false,
      frame: false, // Custom title bar
      backgroundColor: '#1a1a1a',
      icon: join(__dirname, '../../resources/icons/icon.ico'),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    // Load the app
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      if (!store.get('startMinimized')) {
        this.mainWindow?.show()
      }
    })

    // Handle window events
    this.mainWindow.on('close', (e) => {
      if (!this.isQuitting) {
        e.preventDefault()
        this.mainWindow?.hide()
      }
    })

    // Open DevTools in development
    if (is.dev) {
      this.mainWindow.webContents.openDevTools()
    }

    // Optimize window behavior
    optimizer.watchWindowShortcuts(this.mainWindow)
  }

  private createMiniRecorderWindow() {
    if (this.miniRecorderWindow) {
      this.miniRecorderWindow.show()
      return
    }

    this.miniRecorderWindow = new BrowserWindow({
      width: 320,
      height: 120,
      minWidth: 320,
      minHeight: 120,
      maxWidth: 400,
      maxHeight: 200,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    // Load mini recorder page
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.miniRecorderWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/mini-recorder`)
    } else {
      this.miniRecorderWindow.loadFile(join(__dirname, '../renderer/index.html'), {
        hash: '/mini-recorder'
      })
    }

    // Position window
    const { screen } = require('electron')
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize
    this.miniRecorderWindow.setPosition(width - 340, height - 140)

    // Handle close
    this.miniRecorderWindow.on('closed', () => {
      this.miniRecorderWindow = null
    })
  }

  private setupSystemTray() {
    // Create tray icon
    const icon = nativeImage.createFromPath(join(__dirname, '../../resources/icons/tray.png'))
    this.tray = new Tray(icon)
    this.tray.setToolTip('VoiceInk - Voice to Text')

    // Create context menu
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show VoiceInk',
        click: () => {
          this.mainWindow?.show()
        }
      },
      {
        label: 'Toggle Mini Recorder',
        click: () => {
          if (this.miniRecorderWindow) {
            this.miniRecorderWindow.isVisible() 
              ? this.miniRecorderWindow.hide() 
              : this.miniRecorderWindow.show()
          } else {
            this.createMiniRecorderWindow()
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Start Recording',
        accelerator: store.get('hotkeys.toggleRecording') as string,
        click: () => {
          this.toggleRecording()
        }
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => {
          this.mainWindow?.show()
          this.mainWindow?.webContents.send('navigate', '/settings')
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          this.isQuitting = true
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)

    // Handle tray click
    this.tray.on('click', () => {
      this.mainWindow?.isVisible() 
        ? this.mainWindow.hide() 
        : this.mainWindow?.show()
    })
  }

  private registerGlobalShortcuts() {
    // Get hotkey settings
    const hotkeys = store.get('hotkeys') as any

    // Register toggle recording
    globalShortcut.register(hotkeys.toggleRecording, () => {
      this.toggleRecording()
    })

    // Register toggle mini recorder
    globalShortcut.register(hotkeys.toggleMiniRecorder, () => {
      if (this.miniRecorderWindow) {
        this.miniRecorderWindow.isVisible() 
          ? this.miniRecorderWindow.hide() 
          : this.miniRecorderWindow.show()
      } else {
        this.createMiniRecorderWindow()
      }
    })

    // Register paste last transcription
    globalShortcut.register(hotkeys.pasteLastTranscription, async () => {
      const lastTranscription = await this.databaseService.getLastTranscription()
      if (lastTranscription) {
        this.clipboardManager.pasteText(lastTranscription.text)
      }
    })
  }

  private async toggleRecording() {
    if (this.audioRecorder.isRecording()) {
      // Stop recording and transcribe
      const audioBuffer = await this.audioRecorder.stopRecording()
      
      // Notify UI
      this.mainWindow?.webContents.send('recording-stopped')
      this.miniRecorderWindow?.webContents.send('recording-stopped')

      // Transcribe audio
      const transcription = await this.whisperService.transcribe(audioBuffer)
      
      // Save to database
      const activeWindow = this.windowDetector.getActiveWindow()
      await this.databaseService.saveTranscription({
        text: transcription.text,
        model: this.whisperService.currentModel,
        duration: audioBuffer.duration,
        applicationName: activeWindow?.name,
        applicationPath: activeWindow?.path
      })

      // Send to UI
      this.mainWindow?.webContents.send('transcription-complete', transcription)
      this.miniRecorderWindow?.webContents.send('transcription-complete', transcription)

      // Auto-paste if enabled
      const autoPaste = store.get('autoPaste')
      if (autoPaste) {
        this.clipboardManager.pasteText(transcription.text)
      }
    } else {
      // Start recording
      await this.audioRecorder.startRecording()
      
      // Notify UI
      this.mainWindow?.webContents.send('recording-started')
      this.miniRecorderWindow?.webContents.send('recording-started')
    }
  }
}

// Create and initialize app
const app = new VoiceInkApp()
app.initialize().catch(console.error)