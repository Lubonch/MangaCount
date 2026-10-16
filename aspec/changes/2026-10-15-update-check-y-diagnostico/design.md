# Design: Chequeo de actualizaciones, diagnóstico/logging y layout sin scroll horizontal

## Approach

Sin `electron-updater` (choca con `.deb`/`pacman`): el chequeo es un **cliente de GitHub Releases**
que **avisa y linkea**; la instalación la hace el canal del usuario.

1. **Cliente de updates** en `electron/main/services/updates.js`: `fetchLatestRelease({ fetchImpl })` y
   `compareVersions(current, latest)`. Aislado y testeable con `fetch` inyectado.
2. **IPC**: `update:check` (hace el chequeo y devuelve el estado), `app:info` (devuelve versión,
   plataforma, arch y si está empaquetada). El renderer no hace red.
3. **Footer** (`components/Footer.jsx`): muestra la versión; si hay update, `vX → vY` como enlace que
   abre el release con `shell.openExternal` (vía `setWindowOpenHandler` que ya abre `target=_blank`).
4. **Chequeo automático**: el renderer, al montar `App`, si la preferencia `updateCheck` está ON llama
   `update:check`. (No hay push del main; cubre el caso “se abre la ventana”.) El **botón** de Settings
   llama `update:check` manual. **Sin auto-chequeo al entrar a Settings.**
5. **Logging**: handlers globales en el main, puente `log:error` del renderer + `ErrorBoundary`, y una
   **línea de contexto** al iniciar (versión/OS/arch/locale).
6. **Layout**: corregir el overflow de `.main-content` y el scroll interno de la tabla.

## Architecture

```text
Electron main
├── index.js
│   ├── process.on('uncaughtException' | 'unhandledRejection')     ← NUEVO → logger.error
│   ├── app.on('render-process-gone' | 'child-process-gone')       ← NUEVO → logger.error
│   ├── initBackend(): logger.info(`MangaCount vX · platform/arch · locale`)   ← NUEVO contexto
│   └── registerHandlers(ctx)
├── services/updates.js   ← NUEVO: fetchLatestRelease + compareVersions (fetch inyectable)
├── ipc/handlers.js       ← NUEVO: update:check · app:info · log:error
├── services/prefs.js     ← nuevo pref `updateCheck` (default true)
└── services/logger.js    ← sin cambios (ya rota por día)

Renderer (mangacount.client)
├── components/Footer.jsx        ← NUEVO: MangaCount vX [→ vY (click)]
├── components/App.jsx           ← monta Footer + ErrorBoundary + auto-check (si updateCheck)
├── components/SettingsModal.jsx ← General: versión + [Buscar actualización] + toggle updateCheck
├── main.jsx                     ← window.onerror / unhandledrejection → log:error
└── api/localAdapter.js          ← updateCheck(), appInfo(), logError()
```

## Cliente de updates

```js
// services/updates.js
const RELEASES_URL = 'https://api.github.com/repos/Lubonch/MangaCount/releases/latest';

export function compareVersions(a, b) { /* semver numérico, saca 'v' y pre-release; >0 si b>a */ }

export async function fetchLatestRelease({ fetchImpl = fetch, timeoutMs = 5000 } = {}) {
  const res = await fetchImpl(RELEASES_URL, { headers: { 'User-Agent': 'MangaCount', Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const data = await res.json();
  return { latest: String(data.tag_name ?? '').replace(/^v/, ''), url: data.html_url, name: data.name, publishedAt: data.published_at };
}
```

`update:check` (handler):

```js
'update:check': async ({ logger }) => {
  const current = app.getVersion();          // inyectado por ctx (o app en index)
  if (!app.isPackaged) return { current, latest: current, hasUpdate: false, skipped: true };
  try {
    const rel = await fetchLatestRelease();
    return { current, ...rel, hasUpdate: compareVersions(current, rel.latest) > 0 };
  } catch (err) {
    logger?.warn?.(`update check falló: ${err?.message ?? err}`);
    return { current, hasUpdate: false, error: err?.message ?? String(err) };
  }
}
```

`app:info` → `{ version, platform, arch, packaged }`.

## Footer

```
┌───────────────────────────────────────────────┐
│  MangaCount v1.0.8                            │   sin update
│  MangaCount v1.0.8 → v1.1.0 (click)           │   con update → <a href={url} target="_blank">
└───────────────────────────────────────────────┘
```

- `App` pide `app:info` (versión) y, si `updateCheck` ON, `update:check`.
- El enlace usa `target="_blank"`; `index.js` ya hace `shell.openExternal` en `setWindowOpenHandler`.

## Logging / diagnóstico

- **Main** (`index.js`): 
  ```js
  process.on('uncaughtException', (e) => log?.error?.('uncaughtException', e));
  process.on('unhandledRejection', (e) => log?.error?.('unhandledRejection', e));
  app.on('render-process-gone', (_e, wc, d) => log?.error?.(`render-process-gone: ${d?.reason}`));
  app.on('child-process-gone', (_e, d) => log?.error?.(`child-process-gone: ${d?.type}/${d?.reason}`));
  ```
- **Renderer**: `main.jsx` instala `window.addEventListener('error'|'unhandledrejection')` → `logError({ scope:'renderer', message, stack })`; un `ErrorBoundary` en `App` captura el render y manda igual.
- **`log:error`** (handler) → `ctx.logger.error`.
- **Contexto**: en `initBackend`, primera línea `MangaCount v<app.getVersion()> · <platform>/<arch> · <locale>`.

## Layout sin scroll horizontal

```css
/* App.css */
.app-container { width: 100%; max-width: 100%; }      /* en vez de 100vw */
.main-content  { flex: 1; min-width: 0; }             /* sin width:100% */

/* CollectionView.css */
.table-container { overflow-x: auto; }                /* la tabla scrollea dentro */
/* revisar min-width/nowrap de celdas; opcional table-layout: fixed */
```

## Reuse map

| Necesidad | Fuente |
|---|---|
| Versión de la app | `app.getVersion()` |
| Abrir el release | `shell.openExternal` (ya en `setWindowOpenHandler`) |
| Persistir `updateCheck` | `prefs.js` + canales `app:config-*` |
| Logger | `services/logger.js` (`app.txt`) |
| Botón/estado en Settings | `SettingsModal.jsx` (sección General) |

## Validation

- **Comparación**: `compareVersions('1.0.8','1.1.0') > 0`; `('1.0.8','1.0.8') === 0`; pre-release ignorado.
- **`update:check`**: con GitHub mockeado devuelve `hasUpdate` correcto; en error de red devuelve
  `hasUpdate:false` + `error` y **no rompe**; en dev `skipped:true`.
- **Footer**: sin update solo muestra `vX`; con update muestra el enlace `vX → vY` y abre el release.
- **Settings**: el botón “Buscar actualización” dispara el chequeo y refleja “Estás al día” / “vY disponible”.
- **Toggle `updateCheck`**: OFF → no hay chequeo automático al abrir la app.
- **Logging**: `uncaughtException`/`unhandledRejection` y errores del renderer (window.onerror/
  ErrorBoundary) aparecen en `app.txt`; la primera línea trae versión/OS/arch/locale.
- **Layout**: a ancho chico y en pantalla completa **no** hay scroll horizontal de página; la tabla
  scrollea dentro de su caja; las tres vistas y el `Sidebar` se ven bien.
- **Tests**: `node --test` (compareVersions, fetchLatestRelease con fetch fake, `update:check` con app
  fake, `log:error` escribe) y `vitest` (Footer sin/con update; toggle en Settings; el bridge de
  errores llama al IPC).
