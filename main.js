const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const { authenticateWithGoogle } = require('./google-auth');

let tray = null;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 700,
    height: 550,
    resizable: false,
    center: true,
    maximizable: false,
    icon: path.join(__dirname, 'toilet.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,       // ✅ Must be false
      contextIsolation: true 
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile('index.html');

  autoUpdater.checkForUpdatesAndNotify();
}

app.whenReady().then(() => {
  // Enable auto-launch at startup
  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe')  // Ensures the current exe is used
  });

  createWindow();
  
  tray = new Tray(path.join(__dirname, 'toilet-icon.png'));
const trayMenu = Menu.buildFromTemplate([
  { label: 'Show App', click: () => mainWindow.show() },
  {
    label: 'Quit',
    click: () => {
      app.isQuiting = true;
      app.quit(); // This will now trigger real quit
    }
  }
]);
tray.setToolTip('Washroom App');
tray.setContextMenu(trayMenu);

mainWindow.on('close', (event) => {
  if (!app.isQuiting) {
    event.preventDefault();
    mainWindow.hide();  // hide to tray
  }
});

});

ipcMain.handle('google-login', async () => {
  const user = await authenticateWithGoogle();
  return user;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

const AutoLaunch = require('electron-auto-launch');

const washroomAppAutoLauncher = new AutoLaunch({
  name: 'WashroomApp',
  path: app.getPath('exe'),
});

washroomAppAutoLauncher.isEnabled().then((isEnabled) => {
  if (!isEnabled) washroomAppAutoLauncher.enable();
});

ipcMain.on('manual-update-check', (event) => {
  const webContents = event.sender;

  autoUpdater.once('update-available', () => {
    webContents.send('update-message', '⬇️ Update available. Downloading...');
  });

  autoUpdater.once('update-not-available', () => {
    webContents.send('update-message', '✅ You are using the latest version.');
  });

  autoUpdater.once('error', (err) => {
    webContents.send('update-message', `❌ Update check failed: ${err.message}`);
  });

  autoUpdater.once('update-downloaded', () => {
    webContents.send('update-message', '📦 Update downloaded. Will install on restart.');
  });

  autoUpdater.checkForUpdates().catch(err => {
    webContents.send('update-message', `❌ Update check failed: ${err.message}`);
  });
});


// Optional: Handle logout (just reload window)
ipcMain.on('logout', () => {
  mainWindow.reload();
});
