const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // We nest these under 'ipcRenderer' to match your React code:
  // "window.electron.ipcRenderer.on(...)"
  ipcRenderer: {
    // 1. LISTENER (Receiving from Main)
    on: (channel, func) => {
      const validChannels = [
        'update-available',  // ✅ Added: For the alert popup
        'update-progress',   // ✅ Added: For the progress bar
        'update-downloaded', // ✅ Added: For the restart button
        'update-log',
        'update-error',
        'update-status'
      ];
      
      if (validChannels.includes(channel)) {
        // Strip event to prevent memory leaks/security issues
        ipcRenderer.removeAllListeners(channel); // Optional: clear previous to avoid duplicates
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      } else {
        console.warn(`Blocked unauthorized receive on channel: ${channel}`);
      }
    },

    // 2. SENDER (Sending to Main)
    send: (channel, data) => {
      const validChannels = [
        'start-download',      // ✅ Added: Trigger download
        'restart-app',         // ✅ Added: Trigger restart
        'manual-check-update'  // ✅ Added: Check from settings
      ];
      
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      } else {
        console.warn(`Blocked unauthorized send on channel: ${channel}`);
      }
    },

    // 3. INVOKE (Async requests)
    invoke: (channel, data) => {
      const validChannels = ['get-app-version'];
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, data);
      }
    }
  },

  // --- Legacy Helpers (Optional, can keep if you use them elsewhere) ---
  checkUpdate: () => ipcRenderer.send('manual-check-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
});