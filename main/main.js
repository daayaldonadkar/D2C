const { app, globalShortcut } = require('electron');
const { createMainWindow, toggleWindow } = require('./windowManager');
const { setupIpcHandlers, notifyClipboardUpdate } = require('./ipcHandlers');
const { startListening, setUpdateCallback, saveHistory } = require('./clipboardService');

// Hide from dock to act like a macOS agent app
if (app.dock) {
  app.dock.hide();
}

app.whenReady().then(() => {
  setupIpcHandlers();
  
  setUpdateCallback((history) => {
    notifyClipboardUpdate(history);
  });
  
  startListening();
  createMainWindow();

  // Register global shortcuts
  const shortcuts = [
    'CommandOrControl+Shift+Space',
    'CommandOrControl+Shift+V'
  ];

  shortcuts.forEach(shortcut => {
    const success = globalShortcut.register(shortcut, () => {
      toggleWindow();
    });

    if (!success) {
      console.error(`Registration failed for shortcut: ${shortcut}`);
    } else {
      console.log(`Global shortcut ${shortcut} registered successfully.`);
    }
  });

  app.on('activate', () => {
    createMainWindow();
  });
});

app.on('will-quit', () => {
  saveHistory();
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
