const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getClipboardHistory: () => ipcRenderer.invoke('clipboard:get-history'),
  onClipboardUpdate: (callback) => {
    // Strip ipcRenderer event to prevent leaking it to the renderer
    ipcRenderer.on('clipboard:update', (_event, history) => callback(history));
  },
  hideWindow: () => ipcRenderer.send('window:hide'),
  copyToClipboard: (text) => ipcRenderer.invoke('clipboard:copy', text),
  pasteItem: (text) => ipcRenderer.invoke('clipboard:paste', text),
  toggleBookmark: (text) => ipcRenderer.invoke('clipboard:toggle-bookmark', text)
});
