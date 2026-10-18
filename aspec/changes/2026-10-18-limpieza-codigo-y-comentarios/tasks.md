# Tasks: Limpieza de código y comentarios innecesarios

## Fase 1 — Reglas y relevamiento

- [x] Fijar el criterio: comentarios que explican *por qué* se traducen al inglés; los que repiten *qué* o son banners se borran.
- [x] Relevar los comentarios en español (`rg` por acentos en `//`, `/*`, `*`) y anotar los que deben conservarse por carga técnica.

## Fase 2 — `electron/` (main, preload, db, ipc)

- [x] `electron/main/db/client.js` y `schema.sqlite.sql`: conservar/traducir el historial de migraciones `user_version` v3–v6 y el rationale de `ensureColumn`; borrar separadores decorativos.
- [x] `electron/main/db/migrate-from-postgres.js`: traducir cabecera de uso y comentarios de verificación; borrar los que repiten el `SELECT`/conteo.
- [x] `electron/main/db/repositories/*.js`: traducir comentarios con carga semántica; borrar banners.
- [x] `electron/main/services/covers.js`: conservar/traducir rate limit de AniList, magic bytes, cap de tamaño y TOCTOU; borrar los que repiten el flujo.
- [x] `electron/main/services/discord-bot.js` y `discord-*.js`: conservar/traducir timeouts, keep-alive y semántica de sesión/confirmación; borrar comentarios obvios.
- [x] `electron/main/services/` restantes (entries, search, backup, auto-backup, recommendations, anilist-recommendations, prefs, updates, update-controller, fs-worker, remote-fs, secrets, autostart, logger, diagnostics, database, files, catalog-base, local-file-grants): borrar redundantes y traducir los que explican decisiones.
- [x] `electron/main/index.js`, `lifecycle.js`, `ipc/handlers.js`, `preload.cjs`: quitar banners y traducir comentarios de plataforma (AppImage/Wayland, instancia única, CSP).
- [x] Tests de `electron/**/*.test.js`: borrar comentarios obvios y traducir los que explican el caso.

## Fase 3 — `mangacount.client/src/`

- [x] Componentes (`CollectionView.jsx`, `App.jsx`, `SettingsModal.jsx`, `ProfileSelector.jsx`, `Add*.jsx`, `LinkCoverModal.jsx`, etc.): borrar los que repiten el código (`// Load publishers`, `// Edit modal states`, `// Enhanced filtering logic`) y traducir los de comportamiento no obvio (reveal +18, shim de fetch, identidad visual sin portada).
- [x] `api/localAdapter.js`: conservar/traducir el contrato del adaptador y del shim de `window.fetch`; borrar cabeceras de filas de la parity-matrix.
- [x] `contexts/`, `styles/*.css` y `App.css`: borrar separadores decorativos; traducir los comentarios que explican decisiones de tema/design tokens.
- [x] `src/test/**`: borrar comentarios obvios y traducir los que explican el setup/helpers.

## Fase 4 — `shared/`, `scripts/` y configs

- [x] `shared/recommendations/recommendationEngine.js` y `shared/i18n/*.js`: quitar banners de sección (sin tocar las claves de traducción).
- [x] `scripts/sync-pkgbuild-version.mjs`, `vite.config.js`, `vitest.config.js`, `eslint.config.js`: limpiar cabeceras y comentarios redundantes, traducir el resto.

## Fase 5 — Código muerto

- [x] Eliminar imports y variables sin uso (sin tocar las excepciones ya declaradas en `eslint.config.js`).
- [x] Eliminar helpers y bloques de código comentado sin referencias, verificando con `rg` antes de borrar.

## Fase 6 — Verificación

- [x] `rg` por comentarios con acentos en el código de la app: sin resultados pendientes.
- [x] Revisar el diff: sin cambios en líneas ejecutables más allá de declaraciones sin uso.
- [x] `npm test` y `npm run test:coverage` verdes (≥90%).
- [x] `npm run lint:renderer`, `npm run test:renderer:coverage` y `npm run build:renderer` verdes.
