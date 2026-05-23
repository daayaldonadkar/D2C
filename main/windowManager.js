const { BrowserWindow } = require('electron');
const path = require('path');

let mainWindow = null;

function createMainWindow() {
  if (mainWindow) return;

  mainWindow = new BrowserWindow({
    width: 500,
    height: 400,
    show: false, // Hidden at startup
    frame: false, // Frameless
    transparent: true, // Transparent
    alwaysOnTop: true, // Always on top
    center: true, // Centered
    skipTaskbar: true, // Skip taskbar
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  
  // Open the DevTools automatically for debugging
  // mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showWindow() {
  console.log('[WindowManager] showWindow called, mainWindow:', mainWindow ? 'exists' : 'null');
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.center();
    console.log('[WindowManager] Window shown and focused');
  }
}

function hideWindow() {
  if (mainWindow) {
    mainWindow.hide();
  }
}

function toggleWindow() {
  console.log('[WindowManager] toggleWindow called, mainWindow:', mainWindow ? 'exists' : 'null');
  if (!mainWindow) {
    // Window was destroyed, recreate it
    createMainWindow();
    setTimeout(() => showWindow(), 100);
    return;
  }
  if (mainWindow.isVisible()) {
    hideWindow();
  } else {
    showWindow();
  }
}

function focusWindow() {
  if (mainWindow) {
    mainWindow.focus();
  }
}

module.exports = {
  createMainWindow,
  showWindow,
  hideWindow,
  toggleWindow,
  focusWindow
};
