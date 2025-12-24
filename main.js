const { app, BrowserWindow, dialog, Notification } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (!app.isPackaged) {
    win.loadURL("http://localhost:3000");
  } else {
    win.loadFile(path.join(__dirname, "build", "index.html"));
  }

  win.on("closed", () => (win = null));
}

app.whenReady().then(() => {
  createWindow();

  // 🔥 Auto update only in PROD
  if (app.isPackaged) {
    autoUpdater.checkForUpdates();
  }
});

/* =========================
   AUTO UPDATE NOTIFICATIONS
========================= */

// Update available → PUSH notification
autoUpdater.on("update-available", () => {
  new Notification({
    title: "Golden Power ERP",
    body: "New update available. Downloading in background..."
  }).show();
});

// Update downloaded → Ask restart
autoUpdater.on("update-downloaded", () => {
  dialog
    .showMessageBox({
      type: "question",
      title: "Update Ready",
      message: "Update downloaded. Restart app now?",
      buttons: ["Restart Now", "Later"]
    })
    .then(result => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
});

// Error handling
autoUpdater.on("error", err => {
  console.error("Auto update error:", err);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
