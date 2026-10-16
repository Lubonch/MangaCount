import { app, BrowserWindow, Tray, Menu, ipcMain, protocol, shell, nativeImage, clipboard, dialog as electronDialog, safeStorage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db/client.js';
import { registerHandlers, handlers } from './ipc/handlers.js';
import { createLogger } from './services/logger.js';
import { PROFILE_IMAGE_SCHEME } from './services/files.js';
import { loadResolvedPrefs } from './services/prefs.js';
import { createSecrets } from './services/secrets.js';
import { getAutostart, setAutostart } from './services/autostart.js';
import { startAutoBackup } from './services/auto-backup.js';
import { createDiscordBot } from './services/discord-bot.js';
import { fetchLatestRelease, compareVersions, resolveUpdateMode } from './services/updates.js';
import { createUpdateController } from './services/update-controller.js';
import electronUpdater from 'electron-updater';
import { shouldStartHidden, shouldQuitOnAllWindowsClosed, trayMenuTemplate } from './lifecycle.js';

// electron-updater es CommonJS: `autoUpdater` viene en el default, no como named export.
const { autoUpdater } = electronUpdater;

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
let win = null;
let tray = null;
let appCtx = null;
let stopAutoBackup = null;
let bot = null;
let botStatus = 'apagado';

// Captura global de errores del proceso main y de la finalización de procesos.
// `log` arranca como console y se reemplaza por el logger en initBackend().
process.on('uncaughtException', (err) => log?.error?.('uncaughtException', err));
process.on('unhandledRejection', (reason) => log?.error?.('unhandledRejection', reason));
app.on('render-process-gone', (_event, _contents, details) =>
  log?.error?.(`render-process-gone: ${details?.reason ?? 'unknown'}`)
);
app.on('child-process-gone', (_event, details) =>
  log?.error?.(`child-process-gone: ${details?.type ?? ''}/${details?.reason ?? ''}`)
);

// Flag de salida: `close` oculta la ventana salvo que estemos saliendo de verdad.
app.isQuitting = false;

// Instancia única: el autostart + una apertura manual no deben crear dos
// procesos (dos conexiones de bot y dos escritores de SQLite). Si no somos la
// instancia primaria, salimos y NO inicializamos el backend.
// Reintenta el lock unos segundos: al auto-actualizar, electron-updater lanza el
// proceso nuevo ANTES de que el viejo termine de salir (la app vieja cierra en
// cuanto `isQuitting` está seteado), y el nuevo debe tomar el lock.
async function acquireSingleInstanceLock(retries = 12, delayMs = 400) {
  for (let i = 0; i <= retries; i += 1) {
    if (app.requestSingleInstanceLock()) return true;
    if (i < retries) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

app.on('second-instance', () => showWindow());

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
  log.info(`MangaCount v${app.getVersion()} · ${process.platform}/${process.arch} · ${app.getLocale()}`);
  const db = openDb(dataDir);
  const ctx = {
    db,
    dataDir,
    app,
    clipboard,
    shell,
    logger: log,
    secrets: createSecrets({ dataDir, safeStorage }),
    autostart: {
      get: () => getAutostart({ app }),
      set: (enabled) => setAutostart(enabled, { app }),
    },
    dialog: {
      async pickDirectory() {
        const res = await electronDialog.showOpenDialog(win ?? undefined, {
          properties: ['openDirectory', 'createDirectory'],
        });
        return res.canceled ? null : res.filePaths[0] ?? null;
      },
      async pickFile(filters) {
        const res = await electronDialog.showOpenDialog(win ?? undefined, {
          properties: ['openFile'],
          filters: filters?.length ? filters : [{ name: 'Backup MangaCount', extensions: ['zip'] }],
        });
        return res.canceled ? null : res.filePaths[0] ?? null;
      },
    },
  };
  registerHandlers(ipcMain, ctx);
  serveProfileImages(dataDir);

  // Controller de actualizaciones: auto (Windows/AppImage) o link (deb/makepkg).
  const mode = resolveUpdateMode({
    isPackaged: app.isPackaged,
    platform: process.platform,
    env: process.env,
  });
  ctx.update = createUpdateController({
    mode,
    autoUpdater: mode === 'auto' ? autoUpdater : undefined,
    getVersion: () => app.getVersion(),
    fetchLatestRelease,
    compareVersions,
    isPackaged: app.isPackaged,
    logger: log,
    onState: (state) => win?.webContents.send('update:state', state),
    onBeforeInstall: () => {
      app.isQuitting = true;
    },
  });

  log.info(`backend listo en ${dataDir}`);
  app.on('before-quit', () => ctx.db.close());
  return ctx;
}

function createWindow() {
  win = new BrowserWindow({
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
    // Solo http(s): evita abrir `file://` u otros esquemas desde el renderer.
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Cerrar la ventana la oculta: la app queda residente (y el bot sigue vivo).
  win.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '../../mangacount.client/dist/index.html'));
  } else {
    win.loadURL(DEV_URL);
  }
}

function showWindow() {
  if (!win || win.isDestroyed()) {
    createWindow();
  }
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

// Programa los disparadores del backup automático reusando el handler (que ya
// registra `lastBackupAt` / `lastBackupStatus`). Devuelve `stop()`.
function scheduleAutoBackup(ctx) {
  return startAutoBackup({
    loadConfig: () => loadResolvedPrefs(ctx.dataDir).backup,
    runBackup: (destinationDir) => handlers['backup:create'](ctx, destinationDir),
    logger: ctx.logger,
  });
}

// Arranca el bot de Discord si está habilitado y hay token; el estado se refleja
// en el tray. Cualquier fallo se loguea y no rompe la app.
function startBot(ctx) {
  const controller = createDiscordBot({
    getConfig: () => loadResolvedPrefs(ctx.dataDir).bot,
    getToken: () => ctx.secrets.getToken(),
    getDb: () => ctx.db,
    logger: ctx.logger,
    onStatusChange: (status) => {
      botStatus = status;
      refreshTrayMenu();
    },
  });
  ctx.bot = controller;
  controller.start().catch((err) => ctx.logger?.error?.(`bot: ${err?.message ?? err}`));
  return controller;
}

function handleTrayAction(id, menuItem) {
  if (id === 'open') {
    showWindow();
  } else if (id === 'quit') {
    app.isQuitting = true;
    app.quit();
  } else if (id === 'autostart') {
    if (menuItem) setAutostart(menuItem.checked, { app });
    refreshTrayMenu();
  }
}

function refreshTrayMenu() {
  if (!tray) return;
  const template = trayMenuTemplate({
    botStatus,
    autostart: getAutostart({ app }),
  }).map((item) =>
    item.id ? { ...item, click: (menuItem) => handleTrayAction(item.id, menuItem) } : item
  );
  tray.setContextMenu(Menu.buildFromTemplate(template));
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '../assets/tray-icon.png'));
  tray = new Tray(icon);
  tray.setToolTip('MangaCount');
  tray.on('click', () => showWindow());
  refreshTrayMenu();
}

async function initialize() {
  const isPrimaryInstance = await acquireSingleInstanceLock();
  if (!isPrimaryInstance) {
    app.quit();
    return;
  }
  await app.whenReady();
  appCtx = initBackend();
  createTray();
  stopAutoBackup = scheduleAutoBackup(appCtx);
  bot = startBot(appCtx);
  const prefs = loadResolvedPrefs(app.getPath('userData'));
  if (!shouldStartHidden(process.argv, prefs)) createWindow();
  app.on('activate', () => showWindow());
}

initialize();

app.on('before-quit', () => {
  app.isQuitting = true;
  stopAutoBackup?.();
  bot?.stop();
});

app.on('window-all-closed', () => {
  if (shouldQuitOnAllWindowsClosed()) app.quit();
});
