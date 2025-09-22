// Window management handlers
import { BrowserWindow, ipcMain } from 'electron';

let miniRecorderWindow: BrowserWindow | null = null;

export function registerWindowHandlers(mainWindow: BrowserWindow) {
  // Window state management
  ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window-unmaximize', () => {
    mainWindow.unmaximize();
  });

  ipcMain.on('window-close', () => {
    mainWindow.close();
  });

  ipcMain.handle('window-isMaximized', () => {
    return mainWindow.isMaximized();
  });

  // Listen for window state changes
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state-changed');
    mainWindow.webContents.send('window-maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state-changed');
    mainWindow.webContents.send('window-unmaximized');
  });

  mainWindow.on('minimize', () => {
    mainWindow.webContents.send('window-state-changed');
  });

  mainWindow.on('restore', () => {
    mainWindow.webContents.send('window-state-changed');
  });

  // Mini recorder window management
  ipcMain.handle('window-openMiniRecorder', async () => {
    if (miniRecorderWindow && !miniRecorderWindow.isDestroyed()) {
      miniRecorderWindow.focus();
      return;
    }

    miniRecorderWindow = new BrowserWindow({
      width: 320,
      height: 180,
      minWidth: 280,
      minHeight: 140,
      maxWidth: 480,
      maxHeight: 280,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: true,
      skipTaskbar: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: __dirname + '/preload.js'
      }
    });

    // Load mini recorder HTML
    if (process.env.NODE_ENV === 'development') {
      miniRecorderWindow.loadURL('http://localhost:5173/#/mini-recorder');
    } else {
      miniRecorderWindow.loadFile('dist/renderer/index.html', {
        hash: '/mini-recorder'
      });
    }

    miniRecorderWindow.on('closed', () => {
      miniRecorderWindow = null;
      mainWindow.webContents.send('mini-recorder-closed');
    });

    return true;
  });

  ipcMain.handle('window-closeMiniRecorder', async () => {
    if (miniRecorderWindow && !miniRecorderWindow.isDestroyed()) {
      miniRecorderWindow.close();
      miniRecorderWindow = null;
      return true;
    }
    return false;
  });

  ipcMain.handle('window-toggleMiniRecorder', async () => {
    if (miniRecorderWindow && !miniRecorderWindow.isDestroyed()) {
      miniRecorderWindow.close();
      miniRecorderWindow = null;
      return false;
    } else {
      await ipcMain.emit('window-openMiniRecorder');
      return true;
    }
  });
}

export function getMiniRecorderWindow() {
  return miniRecorderWindow;
}