const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const log = require("electron-log");

/* =========================
   AUTO UPDATER CONFIG
========================= */
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.logger = log;
log.transports.file.level = "info";

let win;

/* =========================
   WINDOW CREATION
========================= */
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: !app.isPackaged,
      devTools:false
    }
  });

  // 🔥 FIX BLANK SCREEN
  if (!app.isPackaged) {
    win.loadURL("http://localhost:3000");
  } else {
    const indexPath = path.join(app.getAppPath(), "build", "index.html");
    win.loadURL(`file://${indexPath}`);
  }
// 🔥 STRICTLY BLOCK KEYBOARD SHORTCUTS (F12, Ctrl+Shift+I, Ctrl+Shift+R)
  win.webContents.on("before-input-event", (event, input) => {
    if (
      input.key === "F12" || 
      (input.control && input.shift && input.key === "I") || 
      (input.control && input.shift && input.key === "R")
    ) {
      event.preventDefault(); // 🛑 STOP THE ACTION
      console.log("DevTools Blocked!");
    }
  });
  win.once("ready-to-show", () => {
    win.show();
    // Auto update only in production
    if (app.isPackaged) {
      setTimeout(() => {
        autoUpdater.checkForUpdates();
      }, 3000);
    }
  });

  win.on("closed", () => {
    win = null;
  });
}

/* =========================
   APP LIFE CYCLE
========================= */
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* =========================
   IPC (REACT ↔ ELECTRON)
========================= */

// Get app version
ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

// Manual update check
ipcMain.on("manual-check-update", () => {
  if (app.isPackaged) {
    autoUpdater.checkForUpdates();
  }
});

// ✅ ADDED: Handle Download Click
ipcMain.on("start-download", () => {
  log.info("User requested download...");
  autoUpdater.downloadUpdate();
});

// ✅ ADDED: Handle Restart Click
ipcMain.on("restart-app", () => {
  log.info("User requested restart...");
  autoUpdater.quitAndInstall();
});

/* =========================
   AUTO UPDATER EVENTS
========================= */

// Checking
autoUpdater.on("checking-for-update", () => {
  log.info("Checking for updates...");
});

// Update available -> Send to React (No Native Dialog)
autoUpdater.on("update-available", info => {
  log.info("Update available:", info.version);
  if (win && !win.isDestroyed()) {
    win.webContents.send("update-available", info);
  }
});

// No update
autoUpdater.on("update-not-available", () => {
  log.info("No updates available");
});

// Download progress -> Send to React
autoUpdater.on("download-progress", progress => {
  const percent = Math.round(progress.percent);
  log.info(`Downloading ${percent}%`);
  if (win && !win.isDestroyed()) {
    win.webContents.send("update-progress", percent);
  }
});

// Downloaded -> Send to React
autoUpdater.on("update-downloaded", () => {
  log.info("Update downloaded");
  if (win && !win.isDestroyed()) {
    win.webContents.send("update-downloaded");
  }
});

// Errors
autoUpdater.on("error", err => {
  log.error("Updater error:", err);
});