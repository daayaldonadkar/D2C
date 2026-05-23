const { ipcMain, BrowserWindow, clipboard } = require('electron');
const { getHistory, saveHistory } = require('./clipboardService');
const { hideWindow } = require('./windowManager');

let robot;
try {
  robot = require('robotjs');
} catch (e) {
  console.log('RobotJS not loaded yet, please install/rebuild it if pasting fails.');
}

function setupIpcHandlers() {
  ipcMain.handle('clipboard:get-history', () => {
    return getHistory();
  });

  // Hide the window (called by renderer on Escape)
  ipcMain.on('window:hide', () => {
    hideWindow();
  });

  // Write selected text to system clipboard
  ipcMain.handle('clipboard:copy', (_event, text) => {
    clipboard.writeText(text);
  });

  // Write text and automatically paste it
  ipcMain.handle('clipboard:paste', async (_event, text) => {
    if (!text) return;

    // 1. Increment usage count in history
    const history = getHistory();
    const item = history.find(i => i.text === text);
    if (item) {
      item.usageCount = (item.usageCount || 0) + 1;
      saveHistory();
    }
    
    // 2. Write to clipboard
    clipboard.writeText(text);
    
    // 3. Hide our window so focus returns to the previous app
    hideWindow();
    
    // 4. Small delay to ensure the window has hidden and OS focus is restored
    setTimeout(() => {
      try {
        if (!robot) robot = require('robotjs');
        // Command + V on macOS
        robot.keyTap('v', 'command');
      } catch (err) {
        console.error('Failed to simulate paste with robotjs:', err);
      }
    }, 150);
  });

  // Toggle bookmark status
  ipcMain.handle('clipboard:toggle-bookmark', (_event, text) => {
    const history = getHistory();
    const item = history.find(i => i.text === text);
    if (item) {
      item.isBookmarked = !item.isBookmarked;
      saveHistory();
      return item.isBookmarked;
    }
    return false;
  });
}

function notifyClipboardUpdate(history) {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0 && !windows[0].isDestroyed()) {
    windows[0].webContents.send('clipboard:update', history);
  }
}

module.exports = {
  setupIpcHandlers,
  notifyClipboardUpdate
};
