const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");

// --- 1. CONFIGURATION ---
// Disable auto-download so we can prompt the user first
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Optional: Set logger if you want to see logs in a file
autoUpdater.logger = require("electron-log");
autoUpdater.logger.transports.file.level = "info";

let win;

// --- 2. LOGGING HELPER ---
function sendLog(message) {
  console.log(`[Updater] ${message}`);
  if (win && !win.isDestroyed()) {
    win.webContents.send("update-log", message);
  }
}

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

  // Load App
  if (!app.isPackaged) {
    win.loadURL("http://localhost:3000");
  } else {
    win.loadFile(path.join(__dirname, "../build/index.html"));
  }

  win.on("closed", () => (win = null));

  // --- 3. AUTO-CHECK ON STARTUP (Production Only) ---
  win.once('ready-to-show', () => {
    if (app.isPackaged) {
      // Wait 3 seconds for React to load, then check
      setTimeout(() => {
        sendLog("Initializing auto-update check...");
        autoUpdater.checkForUpdatesAndNotify(); 
      }, 3000);
    } else {
      sendLog("Dev Mode: Auto-update check skipped.");
    }
  });
}

// --- 4. APP LIFECYCLE ---
app.whenReady().then(() => {
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* ==================================================
   5. IPC LISTENERS (Connects to React)
================================================== */

// Trigger Manual Check (from Settings Page)
ipcMain.on('manual-check-update', () => {
  if (!app.isPackaged) {
    sendLog("Manual check ignored in Dev Mode.");
    return;
  }
  sendLog("Manual check started...");
  autoUpdater.checkForUpdates();
});

// Get App Version (for display in UI)
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

/* ==================================================
   6. AUTO-UPDATER EVENTS
================================================== */

// A. Checking
autoUpdater.on("checking-for-update", () => {
  sendLog("Checking GitHub for releases...");
});

// B. Update Available -> Prompt User
autoUpdater.on("update-available", (info) => {
  sendLog(`v${info.version} found! Release date: ${info.releaseDate}`);
  
  // Show Dialog
  if (win) {
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available.\n\nDo you want to download it now?`,
      buttons: ['Yes, Download', 'No, Later'],
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        sendLog("User accepted. Downloading...");
        autoUpdater.downloadUpdate();
      } else {
        sendLog("User declined update.");
      }
    });
  }
});

// C. Up to Date
autoUpdater.on("update-not-available", () => {
  sendLog("App is up to date.");
});

// D. Error Handling
autoUpdater.on("error", (err) => {
  sendLog(`Error: ${err.message}`);
  if(err.message.includes("signature")) {
     sendLog("Signature Error. Check 'verifyUpdateCodeSignature' in package.json.");
  }
});

// E. Download Progress -> Send to UI
autoUpdater.on("download-progress", (progressObj) => {
  const percent = Math.round(progressObj.percent);
  const transferred = (progressObj.transferred / 1024 / 1024).toFixed(2);
  const total = (progressObj.total / 1024 / 1024).toFixed(2);
  
  sendLog(`Downloading: ${percent}% (${transferred} MB / ${total} MB)`);
  
  if (win && !win.isDestroyed()) {
    win.webContents.send("update-progress", percent);
  }
});

// F. Update Downloaded -> Prompt Restart
autoUpdater.on("update-downloaded", () => {
  sendLog("Download complete. Preparing to install...");
  
  if (win) {
    dialog.showMessageBox(win, {
      type: "question",
      title: "Install Update",
      message: "Update is ready. Restart the app now to apply changes?",
      buttons: ["Restart Now", "Later"],
      cancelId: 1
    }).then(result => {
      if (result.response === 0) {
        sendLog("Quitting to install...");
        autoUpdater.quitAndInstall();
      } else {
        sendLog("Restart postponed.");
      }
    });
  }
});