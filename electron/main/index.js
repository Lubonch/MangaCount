import { app, BrowserWindow, Tray, Menu, ipcMain, protocol, shell, nativeImage, clipboard, dialog as electronDialog, safeStorage } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openDb } from './db/client.js';
import { registerHandlers, handlers } from './ipc/handlers.js';
import { createLogger } from './services/logger.js';
import { PROFILE_IMAGE_SCHEME } from './services/files.js';
import { loadResolvedPrefs } from './services/prefs.js';
import { createSecrets } from './services/secrets.js';
import { getAutostart, setAutostart, AUTOSTART_ARGS } from './services/autostart.js';
import { startAutoBackup } from './services/auto-backup.js';
import { createDiscordBot } from './services/discord-bot.js';
import { fetchLatestRelease, compareVersions, resolveUpdateMode } from './services/updates.js';
import { createUpdateController } from './services/update-controller.js';
import electronUpdater from 'electron-updater';
import { shouldStartHidden, shouldQuitOnAllWindowsClosed, trayMenuTemplate } from './lifecycle.js';

// Debe declararse antes de cualquier uso top-level de `__dirname` (si no, TDZ).
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// electron-updater es CommonJS: `autoUpdater` viene en el default, no como named export.
const { autoUpdater } = electronUpdater;

// Ícono de la app (ventana + integración con el escritorio). Va dentro del
// bundle (electron/assets) para poder usarlo también en runtime.
const APP_ICON = path.join(__dirname, '../assets/app-icon.png');

// electron-updater relanza el AppImage nuevo pero deja `APPIMAGE` y `ARGV0`
// apuntando al viejo (ya borrado). Eso hace fallar el update siguiente con
// ENOENT y rompe la integración con el escritorio. Re-derivamos la ruta real del
// AppImage en ejecución: `argv[0]` de /proc/self/cmdline es lo más confiable.
function resolveAppImagePath() {
  if (process.platform !== 'linux') return null;
  let argv0 = null;
  try {
    argv0 = fs.readFileSync('/proc/self/cmdline', 'utf8').split('\0')[0] || null;
  } catch {
    /* sin /proc: nos quedamos con las env */
  }
  for (const candidate of [argv0, process.env.ARGV0, process.env.APPIMAGE]) {
    if (typeof candidate === 'string' && candidate.endsWith('.AppImage') && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

const APPIMAGE_PATH = resolveAppImagePath();
if (process.platform === 'linux') {
  if (APPIMAGE_PATH) process.env.APPIMAGE = APPIMAGE_PATH;
  else delete process.env.APPIMAGE; // no dejar una ruta muerta para el updater
}

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

// Hosts del esquema `mangacount://` -> subdirectorio en userData.
const SCHEME_HOST_DIRS = { profiles: 'profiles', covers: 'covers' };

function serveLocalImages(dataDir) {
  protocol.handle(PROFILE_IMAGE_SCHEME, (request) => {
    const url = new URL(request.url);
    const subdir = SCHEME_HOST_DIRS[url.hostname];
    if (!subdir) {
      return new Response('Not found', { status: 404 });
    }
    const fileName = path.basename(decodeURIComponent(url.pathname));
    const filePath = path.join(dataDir, subdir, fileName);
    if (!fileName || !fs.existsSync(filePath)) {
      return new Response('Not found', { status: 404 });
    }
    const type = IMAGE_MIME[path.extname(fileName).toLowerCase()] ?? 'application/octet-stream';
    return new Response(fs.readFileSync(filePath), { headers: { 'content-type': type } });
  });
}

// Registra el .desktop + ícono a nivel usuario cuando corre como AppImage: sin
// esto, un AppImage suelto no aparece en el lanzador/menú y en **Wayland** el
// compositor no puede resolver el ícono (queda el genérico). En .deb/.rpm ya lo
// instala el sistema, así que no hacemos nada.
function ensureDesktopIntegration() {
  if (process.platform !== 'linux') return;
  const appImage = APPIMAGE_PATH;
  if (!appImage || !fs.existsSync(appImage)) return;
  try {
    const share = path.join(os.homedir(), '.local', 'share');
    const appsDir = path.join(share, 'applications');
    const iconsDir = path.join(share, 'icons', 'hicolor', '512x512', 'apps');
    fs.mkdirSync(appsDir, { recursive: true });
    fs.mkdirSync(iconsDir, { recursive: true });
    if (fs.existsSync(APP_ICON)) fs.copyFileSync(APP_ICON, path.join(iconsDir, 'mangacount.png'));

    const desktop = [
      '[Desktop Entry]',
      'Type=Application',
      'Name=MangaCount',
      `Exec="${appImage}" %U`,
      'Icon=mangacount',
      'Terminal=false',
      'Categories=Office;',
      'StartupWMClass=MangaCount',
      `X-AppImage-Version=${app.getVersion()}`,
      '',
    ].join('\n');
    fs.writeFileSync(path.join(appsDir, 'mangacount.desktop'), desktop, { mode: 0o755 });

    // Refresca las cachés (best-effort: si los binarios no están, no importa).
    for (const [bin, args] of [
      ['update-desktop-database', [appsDir]],
      ['gtk-update-icon-cache', ['-f', '-t', path.join(share, 'icons', 'hicolor')]],
    ]) {
      try {
        spawnSync(bin, args, { stdio: 'ignore' });
      } catch {
        /* opcional */
      }
    }
  } catch (err) {
    log?.warn?.(`no se pudo registrar el .desktop: ${err?.message ?? err}`);
  }
}

function initBackend() {
  const dataDir = app.getPath('userData');
  log = createLogger({ logsDir: path.join(dataDir, 'logs') });
  log.info(`MangaCount v${app.getVersion()} · ${process.platform}/${process.arch} · ${app.getLocale()}`);
  ensureDesktopIntegration();
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
      // El autostart arranca oculto solo si "Arranque en bandeja" esta activo.
      set: (enabled) => {
        const { startInTray } = loadResolvedPrefs(app.getPath('userData'));
        return setAutostart(enabled, { app, args: startInTray === false ? [] : AUTOSTART_ARGS });
      },
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
  serveLocalImages(dataDir);

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
    icon: APP_ICON,
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
    app.exit(0); // salida inmediata: evita dejar instancias colgadas peleando el lock
    return;
  }
  await app.whenReady();
  appCtx = initBackend();
  createTray();
  stopAutoBackup = scheduleAutoBackup(appCtx);
  bot = startBot(appCtx);
  if (!shouldStartHidden(process.argv)) createWindow();
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
