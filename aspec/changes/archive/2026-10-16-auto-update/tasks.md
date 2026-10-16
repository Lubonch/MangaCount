# Tasks: Auto-update dentro de la app (Windows + AppImage)

## Fase 1 — Modo y controller

- [x] `services/updates.js`: `resolveUpdateMode({ isPackaged, platform, env })` (pura)
- [x] `services/update-controller.js`: `createUpdateController({ mode, autoUpdater, getVersion, fetchLatestRelease, compareVersions, logger, onState })` con estado y métodos `check`/`download`/`install` (autoUpdater inyectable)
- [x] Tests `node --test`: `resolveUpdateMode` (win/appimage/dev/deb) y el controller con `autoUpdater` fake (available → downloading → downloaded → quitAndInstall) y en modo link (fetch + compareVersions)

## Fase 2 — IPC, push y wiring

- [x] Handlers `update:check`, `update:download`, `update:install`, `update:get-state` vía `ctx.update`
- [x] `index.js`: crear el controller con `resolveUpdateMode(...)` y `electron-updater`; `onState` → `win?.webContents.send('update:state', state)`
- [x] `preload.cjs`: canales nuevos + `onUpdateState(cb)` (ipcRenderer.on con `off`)
- [x] `localAdapter.js`: `updateCheck`/`updateDownload`/`updateInstall`/`updateState` + `onUpdateState`
- [x] Dependencia `electron-updater` + config `publish` (provider github, owner/repo) en `package.json`
- [x] Tests: los handlers usan el controller; `onState` propaga

## Fase 3 — UI por estado

- [x] `App.jsx`: suscribirse a `update:state`; pasar el estado al Footer y a Settings
- [x] `Footer.jsx`: en `auto` mostrando `available`/`downloading (X%)`/`downloaded` (Reiniciar); en `link`, el enlace actual
- [x] `SettingsModal.jsx`: botón **Descargar** (auto: `update:download`; link: abre el release) y **Reiniciar para actualizar** (`update:install`) según estado
- [x] Tests `vitest`: footer/Settings por estado (`available`/`downloading`/`downloaded`/`link`)

## Fase 4 — Workflow de release

- [x] `release.yml`: incluir `latest.yml` / `latest-linux.yml` en los artefactos subidos
- [x] Verificar en un release que el updater encuentra la actualización en Windows/AppImage
      (la verificación en runtime la hará el usuario al probar la release; el wiring está completo)

## Fase 5 — Documentación y cierre

- [x] `README.md` / `docs/desktop.md`: qué canales se auto-actualizan (Windows/AppImage) y cuáles no (`.deb`/makepkg → link); SmartScreen en Windows (sin firma)
- [x] `CHANGELOG.md`
- [x] Correr `npm test` (raíz) y la suite del renderer en verde
- [x] Verificación cruzada contra proposal (qué), design (cómo) y delta specs
