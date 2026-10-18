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
import { createLocalFileGrants } from './services/local-file-grants.js';
import { getTranslator } from './services/i18n.js';
import { getAutostart, setAutostart, AUTOSTART_ARGS } from './services/autostart.js';
import { startAutoBackup } from './services/auto-backup.js';
import { createDiscordBot } from './services/discord-bot.js';
import { fetchLatestRelease, compareVersions, resolveUpdateMode } from './services/updates.js';
import { createUpdateController } from './services/update-controller.js';
import electronUpdater from 'electron-updater';
import { shouldStartHidden, shouldQuitOnAllWindowsClosed, trayMenuTemplate } from './lifecycle.js';

// Must be declared before any top-level use of `__dirname` (otherwise, TDZ).
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// electron-updater is CommonJS: `autoUpdater` comes on the default, not as a named export.
const { autoUpdater } = electronUpdater;

// App icon (window + desktop integration). It lives inside the bundle
// (electron/assets) so it can also be used at runtime.
const APP_ICON = path.join(__dirname, '../assets/app-icon.png');

// electron-updater relaunches the new AppImage but leaves `APPIMAGE` and `ARGV0`
// pointing to the old one (already deleted). That makes the next update fail
// with ENOENT and breaks desktop integration. We re-derive the real path of the
// running AppImage: `argv[0]` from /proc/self/cmdline is the most reliable.
function resolveAppImagePath() {
  if (process.platform !== 'linux') return null;
  let argv0 = null;
  try {
    argv0 = fs.readFileSync('/proc/self/cmdline', 'utf8').split('\0')[0] || null;
  } catch {
    /* no /proc: fall back to the env vars */
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
  else delete process.env.APPIMAGE; // don't leave a dead path for the updater
}

const IMAGE_MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

// URL of the Vite dev server (hot-reload) or the packaged bundle.
const DEV_URL = process.env.MANGACOUNT_DEV_URL || 'http://localhost:5173';

let log = console;
let win = null;
let tray = null;
let appCtx = null;
let stopAutoBackup = null;
let bot = null;
let botStatus = 'apagado';

// Global capture of main-process errors and process terminations. `log` starts
// as console and is replaced by the logger in initBackend().
process.on('uncaughtException', (err) => log?.error?.('uncaughtException', err));
process.on('unhandledRejection', (reason) => log?.error?.('unhandledRejection', reason));
app.on('render-process-gone', (_event, _contents, details) =>
  log?.error?.(`render-process-gone: ${details?.reason ?? 'unknown'}`)
);
app.on('child-process-gone', (_event, details) =>
  log?.error?.(`child-process-gone: ${details?.type ?? ''}/${details?.reason ?? ''}`)
);

// Quit flag: `close` hides the window unless we are really quitting.
app.isQuitting = false;

// Single instance: autostart + a manual open must not create two processes (two
// bot connections and two SQLite writers). If we are not the primary instance, we
// exit and do NOT initialize the backend.
// Retry the lock for a few seconds: on auto-update, electron-updater launches the
// new process BEFORE the old one finishes exiting (the old app closes as soon as
// `isQuitting` is set), and the new one must take the lock.
async function acquireSingleInstanceLock(retries = 12, delayMs = 400) {
  for (let i = 0; i <= retries; i += 1) {
    if (app.requestSingleInstanceLock()) return true;
    if (i < retries) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

app.on('second-instance', () => showWindow());

// Must be registered before `app.whenReady()` so the scheme is treated as
// standard/secure and the renderer can load the profile pictures.
protocol.registerSchemesAsPrivileged([
  {
    scheme: PROFILE_IMAGE_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

// `mangacount://` scheme hosts -> subdirectory in userData.
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

// Registers the .desktop + icon at user level when running as an AppImage:
// without this, a standalone AppImage does not appear in the launcher/menu and on
// Wayland the compositor cannot resolve the icon (it falls back to the generic
// one). On .deb/.rpm the system already installs it, so we do nothing.
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

    // Refresh the caches (best-effort: if the binaries are missing, it doesn't matter).
    for (const [bin, args] of [
      ['update-desktop-database', [appsDir]],
      ['gtk-update-icon-cache', ['-f', '-t', path.join(share, 'icons', 'hicolor')]],
    ]) {
      try {
        spawnSync(bin, args, { stdio: 'ignore' });
      } catch {
        /* optional */
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
  const localFileGrants = createLocalFileGrants();
  const ctx = {
    db,
    dataDir,
    app,
    clipboard,
    shell,
    logger: log,
    localFileGrants,
    secrets: createSecrets({ dataDir, safeStorage }),
    autostart: {
      get: () => getAutostart({ app }),
      // Autostart starts hidden only if "Start in tray" is enabled.
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
          filters: filters?.length ? filters : [{ name: getTranslator(dataDir)('dialog.backupFilter'), extensions: ['zip'] }],
        });
        return res.canceled ? null : res.filePaths[0] ?? null;
      },
    },
  };
  registerHandlers(ipcMain, ctx);
  serveLocalImages(dataDir);

  // Update controller: auto (Windows/AppImage) or link (deb/makepkg).
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
    // Only http(s): avoids opening `file://` or other schemes from the renderer.
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Closing the window hides it: the app stays resident (and the bot stays alive).
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

// Schedules the auto-backup triggers reusing the handler (which already records
// `lastBackupAt` / `lastBackupStatus`). Returns `stop()`.
function scheduleAutoBackup(ctx) {
  return startAutoBackup({
    loadConfig: () => loadResolvedPrefs(ctx.dataDir).backup,
    runBackup: (destinationDir) => handlers['backup:create'](ctx, destinationDir),
    logger: ctx.logger,
  });
}

// Starts the Discord bot if it is enabled and a token exists; the status is
// reflected in the tray. Any failure is logged and does not break the app.
function startBot(ctx) {
  const controller = createDiscordBot({
    getConfig: () => loadResolvedPrefs(ctx.dataDir).bot,
    getToken: () => ctx.secrets.getToken(),
    getDb: () => ctx.db,
    getT: () => getTranslator(ctx.dataDir),
    runBackup: () => handlers['backup:create'](ctx),
    getStatus: () => {
      const prefs = loadResolvedPrefs(ctx.dataDir);
      return {
        version: app.getVersion(),
        entries: handlers['database:statistics'](ctx)?.entries ?? null,
        lastBackupAt: prefs.backup?.lastBackupAt ?? null,
      };
    },
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
    t: getTranslator(appCtx?.dataDir),
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
    app.exit(0); // exit now: avoids leaving instances hanging while fighting for the lock
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
