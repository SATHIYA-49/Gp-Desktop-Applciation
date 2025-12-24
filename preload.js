const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Listen for events FROM Main Process (e.g. update-progress)
  on: (channel, func) => {
    // Whitelist channels for security
    const validChannels = ['update-status', 'update-progress', 'update-log'];
    if (validChannels.includes(channel)) {
      // Remove existing listeners to avoid duplicates
      ipcRenderer.removeAllListeners(channel);
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  
  // Send events TO Main Process (optional, good for later)
  send: (channel, data) => {
    const validChannels = ['app-version'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  }
});