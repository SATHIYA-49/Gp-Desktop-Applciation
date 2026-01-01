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
      nodeIntegration: false
    }
  });

  // 🔥 VERY IMPORTANT FIX (BLANK SCREEN ISSUE)
  if (!app.isPackaged) {
    win.loadURL("http://localhost:3000");
  } else {
    const indexPath = path.join(app.getAppPath(), "build", "index.html");
    win.loadURL(`file://${indexPath}`);
  }

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

// Manual update check (Settings page)
ipcMain.on("manual-check-update", () => {
  if (app.isPackaged) {
    autoUpdater.checkForUpdates();
  }
});

/* =========================
   AUTO UPDATER EVENTS
========================= */

// Checking
autoUpdater.on("checking-for-update", () => {
  log.info("Checking for updates...");
});

// Update available
autoUpdater.on("update-available", info => {
  log.info("Update available:", info.version);

  dialog
    .showMessageBox(win, {
      type: "info",
      title: "Update Available",
      message: `New version ${info.version} is available.\n\nDownload now?`,
      buttons: ["Download", "Later"],
      cancelId: 1
    })
    .then(result => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
});

// No update
autoUpdater.on("update-not-available", () => {
  log.info("No updates available");
});

// Download progress
autoUpdater.on("download-progress", progress => {
  const percent = Math.round(progress.percent);
  log.info(`Downloading ${percent}%`);

  if (win && !win.isDestroyed()) {
    win.webContents.send("update-progress", percent);
  }
});

// Downloaded
autoUpdater.on("update-downloaded", () => {
  log.info("Update downloaded");

  dialog
    .showMessageBox(win, {
      type: "question",
      title: "Install Update",
      message: "Update ready. Restart now?",
      buttons: ["Restart", "Later"],
      cancelId: 1
    })
    .then(result => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
});

// Errors
autoUpdater.on("error", err => {
  log.error("Updater error:", err);
});
