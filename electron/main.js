const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const dotenv = require('dotenv');

const isDev = !app.isPackaged;

// ---- 1. Load backend env vars (.env) from the right location ----
const envPath = isDev
  ? path.join(__dirname, '..', 'server', '.env')
  : path.join(process.resourcesPath, 'server', '.env');
dotenv.config({ path: envPath });

// ---- 2. Uploads folder must be writable. In a packaged app the install ----
//         folder is read-only, so we redirect uploads to userData instead.
process.env.UPLOADS_DIR = path.join(app.getPath('userData'), 'uploads');

let mainWindow;
let backendStarted = false;

function startBackend() {
  if (backendStarted) return;
  backendStarted = true;

  const serverEntry = isDev
    ? path.join(__dirname, '..', 'server', 'server.js')
    : path.join(process.resourcesPath, 'server', 'server.js');

  try {
    require(serverEntry); // server.js starts listening on require (see PORT at bottom of file)
    console.log('✅ Backend server started from:', serverEntry);
  } catch (err) {
    console.error('❌ Failed to start backend server:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 650,
    backgroundColor: '#121212',
    show: false,
    icon: path.join(__dirname, '..', 'build-assets', 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Open external links (http/https) in the OS browser, not inside the app window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  const devServerUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';

  if (isDev) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
