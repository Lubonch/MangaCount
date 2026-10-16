# Proposal: Chequeo de actualizaciones (footer + botón en Settings), diagnóstico/logging y layout sin scroll horizontal

## Problem

Tres cosas que salieron de usar la app como usuario:

**A) No hay forma de saber si hay una versión nueva.** Los usuarios quedan en versiones viejas sin
enterarse (vivimos la 1.0.1 inarrancable en Arch por permisos de `/opt`, la 1.0.5 con `/recomendar`
roto). La distribución es heterogénea: el tag `v*` dispara `release.yml` (electron-builder con
`--publish never` + `softprops/action-gh-release`, **draft**) que genera `.exe`, `.deb` y `.AppImage`;
en Arch se instala con `makepkg`. Hoy **no** hay `electron-updater`, `publish` ni `latest.yml`.

**B) Diagnóstico pobre.** El `logger` escribe a `app.txt` (rotación diaria) y ya logueamos errores de
IPC/bot/backup, pero: el **main no tiene handlers globales** (`uncaughtException`,
`unhandledRejection`, `render-process-gone`, `child-process-gone`); el **renderer solo hace
`console.error`** (DevTools, no se persiste); y las líneas **no dicen versión/OS/arch**. Los bugs
recientes fueron silenciosos (`Unknown interaction`, `await` faltante, `FOREIGN KEY` tras nuke).

**C) Scroll horizontal molesto.** Aun en pantalla completa, la vista de colección fuerza un mínimo de
scroll horizontal. Causa en el CSS: `.main-content` (`App.css:120`) es un ítem flex con `flex: 1` **y
`width: 100%`** junto al `Sidebar` fijo de 300 px → `300px + 100%` desborda `100vw`; además
`.table-container` (`CollectionView.css:132`) usa `overflow: hidden` (recorta la tabla en vez de
scrollear adentro) y las celdas tienen `white-space: nowrap` + `min-width`.

## Proposed change

### 1. Chequeo de actualizaciones — footer + botón en Settings

- **Footer** (siempre visible): `MangaCount v<actual>`; con update → `v<actual> → v<nueva> (click)` que
  abre la página del release.
- **Canal IPC `update:check`** (main): consulta
  `https://api.github.com/repos/Lubonch/MangaCount/releases/latest` (con `User-Agent`; **repo fijo**),
  compara el `tag_name` con `app.getVersion()` (semver) y devuelve
  `{ current, latest, hasUpdate, url, name, publishedAt }`. `/releases/latest` **excluye drafts/prereleases**.
- **`app:info`**: versión, plataforma, arch, empaquetado (para el footer).
- **Settings → General**: “Versión actual: X” + botón **Buscar actualización** (verifica **al
  apretarlo**; nada automático al entrar a Settings) + estado + **Descargar**.
- **Chequeo automático**: **una vez al abrir la app** con el toggle `updateCheck` (**default ON**,
  desactivable). Sin throttle.
- **Aviso = footer + estado en Settings.** Se omite en desarrollo (`!app.isPackaged`).

### 2. Diagnóstico / logging

- **Main — handlers globales**: `process.on('uncaughtException'|'unhandledRejection')` y
  `app.on('render-process-gone'|'child-process-gone')` → `logger.error`.
- **Puente renderer → main**: canal `log:error`; el renderer instala `window.onerror` +
  `unhandledrejection` y un **ErrorBoundary** que reportan a `app.txt` (componente + stack).
- **Contexto de sesión**: primera línea de cada arranque con `app.getVersion()`, plataforma/arch y locale.

### 3. Layout sin scroll horizontal (que se escale)

- `App.css`: `.main-content` → quitar `width: 100%` y agregar `min-width: 0`; `.app-container` → evitar `100vw`.
- `CollectionView.css`: `.table-container` → `overflow-x: auto`; revisar `min-width`/`nowrap` de celdas.
- Verificar tabla/compacta/cards y `Sidebar` en anchos chicos.

## Scope

In scope:

- IPC `update:check` + `app:info` (cliente GitHub Releases + comparación de versión).
- **Footer** con la versión y, si hay update, el enlace `v<actual> → v<nueva>`.
- Toggle `updateCheck` (default ON): chequeo automático **al abrir la app**; **botón manual** en Settings.
- Handlers globales de error en el main y `log:error` del renderer (+ ErrorBoundary).
- Línea de contexto (versión/OS/arch/locale) en el log.
- **Fix de layout**: sin scroll horizontal de página; tabla con scroll interno.
- Docs (`README`/`docs/desktop.md`) y `CHANGELOG`.
- Tests: cliente de updates y handlers (fetch/app fake); Footer; bridge de errores.

Out of scope:

- **Auto-descarga/auto-instalación** (`electron-updater`): en Linux choca con `makepkg`/`apt`; futuro.
- **Botón “Copiar diagnóstico”**: va en un change aparte (`2026-10-15-copiar-diagnostico`).
- Notificación/diálogo de update (alcanza el footer + Settings).
- Firma de código / notarización / stores.

## Risks

- **Red/rate-limit**: GitHub anónimo 60 req/h → `hasUpdate:false`, sin molestar. Cachear por sesión.
- **Falso “hay update”**: `tag_name` no semver o prerelease. Mitigación: parse robusto.
- **Logging de secretos**: no loguear token/IDs sensibles.
- **Fix de CSS con regresión**: revisar las tres vistas y el `Sidebar` en anchos chicos.

## Decisiones

- Sin throttle; automático **solo al abrir la app**; **botón manual** en Settings; aviso por **footer**;
  repo fijo `Lubonch/MangaCount`.
- “Copiar diagnóstico” queda en un change aparte, con **toggle en Settings**.
