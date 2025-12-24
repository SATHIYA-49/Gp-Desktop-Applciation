const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Listen for progress percentage
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (_event, value) => callback(value)),
  
  // Listen for status text
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_event, value) => callback(value)),
  
  // Cleanup listeners to prevent memory leaks
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-progress');
    ipcRenderer.removeAllListeners('update-status');
  }
});