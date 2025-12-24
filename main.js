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

  if (app.isPackaged) {
    autoUpdater.checkForUpdates();
  }
});

/* =========================
   AUTO UPDATE LOGIC
========================= */

// 1. Update available
autoUpdater.on("update-available", () => {
  if (win) win.webContents.send("update-status", "Update available. Downloading...");
  new Notification({ title: "Golden Power ERP", body: "Downloading update..." }).show();
});

// 2. PROGRESS BAR LOGIC (NEW) 🔥
autoUpdater.on("download-progress", (progressObj) => {
  if (win) {
    // Send percentage (e.g., 45.5) to React
    win.webContents.send("update-progress", progressObj.percent);
  }
});

// 3. Update downloaded
autoUpdater.on("update-downloaded", () => {
  if (win) win.webContents.send("update-status", "Download complete.");
  
  dialog.showMessageBox({
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

autoUpdater.on("error", err => {
  console.error("Auto update error:", err);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});