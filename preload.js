const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // --- 1. GENERIC LISTENER (Fixes "window.electron.on is not a function") ---
  on: (channel, func) => {
    const validChannels = ['update-log', 'update-progress', 'update-status'];
    if (validChannels.includes(channel)) {
      // Remove existing to prevent duplicates, then add
      ipcRenderer.removeAllListeners(channel);
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },

  // --- 2. GENERIC SENDER ---
  send: (channel, data) => {
    const validChannels = ['manual-check-update', 'app-version'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  // --- 3. SPECIFIC METHODS (For newer components) ---
  checkUpdate: () => ipcRenderer.send('manual-check-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
});