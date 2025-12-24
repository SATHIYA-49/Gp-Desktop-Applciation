const { app, BrowserWindow, dialog, Notification, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");

// --- 1. SETUP LOGGING ---
// This allows us to send text logs to the React Window
function sendLog(message) {
  console.log(`[Updater] ${message}`);
  if (win) {
    win.webContents.send("update-log", message);
  }
}

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

  // --- 2. TRIGGER UPDATE CHECK ON LOAD (With Delay) ---
  win.once('ready-to-show', () => {
    if (app.isPackaged) {
      // Wait 3 seconds for app to settle, then check
      setTimeout(() => {
        sendLog("Initializing update check...");
        autoUpdater.checkForUpdates();
      }, 3000);
    } else {
      sendLog("Dev Mode: Skipping update check.");
    }
  });
}

app.whenReady().then(() => {
  createWindow();
});

/* =========================
   REMOTE UPDATE CONTROL LOGIC
========================= */

// Disable auto-download so we can prompt the user first
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// A. CHECKING
autoUpdater.on("checking-for-update", () => {
  sendLog("Checking GitHub for releases...");
});

// B. UPDATE AVAILABLE (Remote Control Step)
autoUpdater.on("update-available", (info) => {
  sendLog(`Version ${info.version} found on GitHub!`);
  
  // Prompt User
  dialog.showMessageBox(win, {
    type: 'info',
    title: 'New Update Found',
    message: `A new version (${info.version}) is available.\n\nRelease Date: ${info.releaseDate}\n\nDo you want to download it now?`,
    buttons: ['Yes, Download', 'No, Later']
  }).then((result) => {
    if (result.response === 0) {
      sendLog("User accepted update. Starting download...");
      autoUpdater.downloadUpdate(); // <--- Manually start download
    } else {
      sendLog("User declined update.");
    }
  });
});

// C. UPDATE NOT AVAILABLE
autoUpdater.on("update-not-available", () => {
  sendLog("App is up to date.");
});

// D. ERROR
autoUpdater.on("error", (err) => {
  sendLog(`Error: ${err.message}`);
  // If signature error, helpful hint:
  if(err.message.includes("signature")) {
     sendLog("Signature Validation Failed. Ensure package.json has verifyUpdateCodeSignature: false");
  }
});

// E. DOWNLOAD PROGRESS
autoUpdater.on("download-progress", (progressObj) => {
  const percent = Math.round(progressObj.percent);
  // Send Log
  sendLog(`Downloading: ${percent}% (${(progressObj.transferred / 1000000).toFixed(2)} MB / ${(progressObj.total / 1000000).toFixed(2)} MB)`);
  
  // Send Progress Bar Data
  if (win) win.webContents.send("update-progress", percent);
});

// F. UPDATE DOWNLOADED
autoUpdater.on("update-downloaded", () => {
  sendLog("Download complete. Verifying...");
  
  dialog.showMessageBox(win, {
      type: "question",
      title: "Install Update",
      message: "Update downloaded and ready. Restart the app now to apply?",
      buttons: ["Restart Now", "Later"]
    })
    .then(result => {
      if (result.response === 0) {
        sendLog("Quitting to install...");
        autoUpdater.quitAndInstall();
      } else {
        sendLog("User postponed restart.");
      }
    });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});