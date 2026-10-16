# Design: Auto-update dentro de la app (Windows + AppImage)

## Approach

`electron-updater` **solo** en los canales donde puede reemplazar el ejecutable; en el resto se mantiene
el chequeo + link actual. Todo encapsulado en un **controller inyectable** (para testear sin red ni
Electron real).

1. **Detección de modo** (pura): `resolveUpdateMode({ isPackaged, platform, env })`.
   - `auto` si empaquetada y (`win32` **o** `env.APPIMAGE` seteado).
   - `link` en el resto (`.deb`, makepkg/`/opt`, dev).
2. **Controller** `createUpdateController({ mode, autoUpdater, getVersion, fetchLatestRelease, logger, onState })`:
   - modo `auto`: usa `autoUpdater` (check/download/events/`quitAndInstall`).
   - modo `link`: usa `fetchLatestRelease` + `compareVersions` (lo actual).
   - mantiene un **estado** y lo emite por `onState`.
3. **IPC + push**: `update:check`, `update:download`, `update:install`, `update:get-state`; el main hace
   `webContents.send('update:state', state)` cuando cambia (para “Descargando… X%” en vivo).
4. **Renderer**: `App` pide el estado y escucha `update:state`; footer y Settings muestran según el
   estado y el modo.
5. **Workflow**: subir `latest.yml`/`latest-linux.yml` junto a los instaladores.

## Architecture

```text
Electron main
├── services/updates.js          ← + resolveUpdateMode() (pura)
├── services/update-controller.js ← NUEVO: createUpdateController (autoUpdater inyectable)
├── index.js
│   ├── const mode = resolveUpdateMode({ isPackaged: app.isPackaged, platform: process.platform, env: process.env })
│   ├── const controller = createUpdateController({ mode, autoUpdater: electronUpdater.autoUpdater, getVersion: () => app.getVersion(), fetchLatestRelease, logger: log, onState: (s) => win?.webContents.send('update:state', s) })
│   └── ctx.update = controller
└── ipc/handlers.js
    ├── update:check    → ctx.update.check()
    ├── update:download → ctx.update.download()
    ├── update:install  → ctx.update.install()
    └── update:get-state→ ctx.update.state()

Renderer
├── api/localAdapter.js  ← updateCheck/updateDownload/updateInstall/updateState + onUpdateState (ipcRenderer.on)
├── App.jsx              ← estado de update + suscripción a update:state
├── components/Footer.jsx         ← versión + (link | progreso/reiniciar)
└── components/SettingsModal.jsx  ← botón según estado/modo
```

## Modo (`resolveUpdateMode`, pura)

```js
export function resolveUpdateMode({ isPackaged = false, platform = process.platform, env = process.env } = {}) {
  if (!isPackaged) return 'link';
  if (platform === 'win32') return 'auto';
  if (platform === 'linux' && env.APPIMAGE) return 'auto';
  return 'link';
}
```

## Controller (estados)

```text
idle → checking → (auto) available → downloading (percent) → downloaded → [Reiniciar]
                 └ (link) hasUpdate (url)         └ error
```

```js
export function createUpdateController({ mode, autoUpdater, getVersion, fetchLatestRelease, compareVersions, logger, onState } = {}) {
  let state = { mode, current: getVersion?.() ?? null, latest: null, hasUpdate: false, status: 'idle', percent: 0, url: null, error: null };
  const set = (patch) => { state = { ...state, ...patch }; onState?.(state); };

  if (mode === 'auto') {
    autoUpdater.autoDownload = false;
    autoUpdater.on('update-available', (info) => set({ hasUpdate: true, latest: info?.version ?? null, status: 'available' }));
    autoUpdater.on('update-not-available', () => set({ hasUpdate: false, status: 'idle' }));
    autoUpdater.on('download-progress', (p) => set({ status: 'downloading', percent: Math.round(p?.percent ?? 0) }));
    autoUpdater.on('update-downloaded', (info) => set({ status: 'downloaded', latest: info?.version ?? state.latest }));
    autoUpdater.on('error', (err) => { logger?.error?.(`update: ${err?.message ?? err}`); set({ status: 'error', error: err?.message ?? String(err) }); });
  }

  return {
    mode,
    state: () => state,
    async check() {
      if (mode === 'auto') { set({ status: 'checking', error: null }); await autoUpdater.checkForUpdates(); return state; }
      try {
        const rel = await fetchLatestRelease();
        set({ hasUpdate: compareVersions(getVersion(), rel.latest) > 0, latest: rel.latest, url: rel.url, error: null });
      } catch (err) { set({ error: err?.message ?? String(err) }); }
      return state;
    },
    async download() { if (mode === 'auto') await autoUpdater.downloadUpdate(); },
    install() { if (mode === 'auto') autoUpdater.quitAndInstall(); },
  };
}
```

## IPC y push

- Handlers: `update:check`, `update:download`, `update:install`, `update:get-state` (en `handlers.js`,
  vía `ctx.update`).
- Push: `onState` → `win?.webContents.send('update:state', state)`; el preload expone
  `onUpdateState(cb)` (registra `ipcRenderer.on('update:state')` y devuelve un `off`).

## UI

| Modo/estado | Footer | Settings |
|---|---|---|
| link + hasUpdate | `vX → vY (click)` | “vY disponible” + **Descargar** (abre el release) |
| auto available | `vX → vY` | **Descargar** (arranca `update:download`) |
| auto downloading | `Descargando… X%` | “Descargando… X%” |
| auto downloaded | **Reiniciar para actualizar** | **Reiniciar para actualizar** (`update:install`) |
| error | (sin cambios) | mensaje de error |

## Workflow de release

- `electron-builder` genera `latest.yml` (win) y `latest-linux.yml` (linux) cuando hay `publish`
  configurado; con `--publish never` los deja en `release/`.
- `release.yml` debe incluirlos en los artefactos subidos (hoy sube globs `release/*.deb|AppImage|exe`).
- La release tiene que quedar **publicada** (ya lo hacemos).

## Reuse map

| Necesidad | Fuente |
|---|---|
| Chequeo + link | `services/updates.js` (`fetchLatestRelease`, `compareVersions`) — ya existe |
| Auto-update | `electron-updater` (`autoUpdater`) |
| Estado → UI | IPC invoke + `webContents.send('update:state')` |
| Abrir release (link) | `setWindowOpenHandler` → `shell.openExternal` |

## Validation

- **Modo**: `resolveUpdateMode` → `auto` en win32/appimage empaquetado; `link` en dev/deb/makepkg.
- **Controller auto** (con `autoUpdater` fake): `check` → `available`; `download` → eventos → `downloaded`;
  `install` llama `quitAndInstall`.
- **Controller link**: `check` usa `fetchLatestRelease` + `compareVersions` y setea `hasUpdate`/`url`.
- **Errores**: `autoUpdater.on('error')` → estado `error` + log; no rompe.
- **UI**: footer/Settings reflejan cada estado; en link sigue abriendo el release.
- **Workflow**: un release incluye `latest.yml`/`latest-linux.yml`.
- **Tests**: `node --test` (modo + controller con autoUpdater/fetch fake); `vitest` (footer/Settings por
  estado).
