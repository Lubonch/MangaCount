# Tasks: Chequeo de actualizaciones (footer + botón en Settings), diagnóstico/logging y layout sin scroll horizontal

## Fase 1 — Cliente de updates y canales IPC

- [x] `electron/main/services/updates.js`: `fetchLatestRelease({ fetchImpl })` (GitHub `/releases/latest`,
      `User-Agent`) y `compareVersions(a, b)` (semver, saca `v`/pre-release)
- [x] Handlers `update:check` (chequeo + `compareVersions`; error de red → `hasUpdate:false` + `error`;
      en dev `skipped:true`) y `app:info` (`version`, `platform`, `arch`, `packaged`)
- [x] Preferencia `updateCheck` (default `true`) en `prefs.js` + exponerla por `app:config-*`
- [x] Registrar los canales en `preload.cjs` y `localAdapter.js` (`updateCheck`, `appInfo`)
- [x] Tests `node --test`: `compareVersions`, `fetchLatestRelease` (fetch fake), `update:check` (app fake)

## Fase 2 — Footer

- [x] `components/Footer.jsx` (+ CSS): `MangaCount v<actual>`; con update → `v<actual> → v<nueva>` como
      enlace (`target="_blank"`, lo abre `setWindowOpenHandler`)
- [x] `App.jsx`: montar el Footer; al montar, pedir `app:info` y, si `updateCheck` ON, `update:check`
- [x] Tests `vitest`: Footer sin update (solo versión) y con update (link con `url`)

## Fase 3 — Settings

- [x] Sección General: “Versión actual: X” + botón **Buscar actualización** + estado
      (“Estás al día” / “vY disponible” + **Descargar**) + toggle `updateCheck`
- [x] Nada automático al **entrar** a Settings (solo el botón dispara el chequeo)
- [x] Tests `vitest`: el botón llama `updateCheck` y refleja el estado; el toggle persiste

## Fase 4 — Diagnóstico / logging

- [x] `index.js`: handlers globales `uncaughtException`/`unhandledRejection` y
      `render-process-gone`/`child-process-gone` → `logger.error`
- [x] Handler `log:error` (→ `ctx.logger.error`) + canal en `preload.cjs`/`localAdapter.js`
- [x] Renderer: `main.jsx` instala `window.onerror`/`unhandledrejection`; `ErrorBoundary` en `App`
      que reporta por `log:error`
- [x] `initBackend`: primera línea de contexto (`MangaCount vX · platform/arch · locale`)
- [x] Tests: `log:error` escribe en el log; el bridge del renderer llama al IPC

## Fase 5 — Layout sin scroll horizontal

- [x] `App.css`: `.main-content` → `min-width: 0` (sacar `width: 100%`); `.app-container` → sin `100vw`
- [x] `CollectionView.css`: `.table-container` → `overflow-x: auto`; revisar `min-width`/`nowrap` de celdas
- [x] Verificar tabla/compacta/cards y `Sidebar` en anchos chicos y en pantalla completa
      (verificación visual del usuario al correr la app; CSS aplicado)
- [x] Tests `vitest` (si aplica): el layout no fuerza overflow (cubierto por el render de CollectionView)

## Fase 6 — Documentación y cierre

- [x] `README.md` / `docs/desktop.md`: chequeo de actualizaciones (footer + Settings), y logging
- [x] `CHANGELOG.md`
- [x] Correr `npm test` (raíz) y la suite del renderer en verde
- [x] Verificación cruzada contra proposal (qué), design (cómo) y delta specs de este change
