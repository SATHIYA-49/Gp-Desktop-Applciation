const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("updater", {
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates")
});
