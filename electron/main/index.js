import { app, BrowserWindow, ipcMain, protocol, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db/client.js';
import { registerHandlers } from './ipc/handlers.js';
import { createLogger } from './services/logger.js';
import { PROFILE_IMAGE_SCHEME } from './services/files.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const IMAGE_MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

// URL del dev server de Vite (hot-reload) o bundle empaquetado.
const DEV_URL = process.env.MANGACOUNT_DEV_URL || 'http://localhost:5173';

let log = console;

// Debe registrarse antes de `app.whenReady()` para que el esquema sea tratado
// como estándar/seguro y el renderer pueda cargar las fotos de perfil.
protocol.registerSchemesAsPrivileged([
  {
    scheme: PROFILE_IMAGE_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

function serveProfileImages(dataDir) {
  protocol.handle(PROFILE_IMAGE_SCHEME, (request) => {
    const url = new URL(request.url);
    if (url.hostname !== 'profiles') {
      return new Response('Not found', { status: 404 });
    }
    const fileName = path.basename(decodeURIComponent(url.pathname));
    const filePath = path.join(dataDir, 'profiles', fileName);
    if (!fileName || !fs.existsSync(filePath)) {
      return new Response('Not found', { status: 404 });
    }
    const type = IMAGE_MIME[path.extname(fileName).toLowerCase()] ?? 'application/octet-stream';
    return new Response(fs.readFileSync(filePath), { headers: { 'content-type': type } });
  });
}

function initBackend() {
  const dataDir = app.getPath('userData');
  log = createLogger({ logsDir: path.join(dataDir, 'logs') });
  const db = openDb(dataDir);
  registerHandlers(ipcMain, { db, dataDir });
  serveProfileImages(dataDir);
  log.info(`backend listo en ${dataDir}`);
  app.on('before-quit', () => db.close());
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '../../mangacount.client/dist/index.html'));
  } else {
    win.loadURL(DEV_URL);
  }
}

app.whenReady().then(() => {
  initBackend();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
