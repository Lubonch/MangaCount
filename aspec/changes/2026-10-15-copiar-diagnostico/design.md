# Design: Copiar diagnóstico (exportar estado + log)

## Approach

Herramienta **manual** (la dispara el usuario) para exportar el diagnóstico ya recolectado por el
logging. Todo local; sin telemetría.

1. **Servicio de armado** en `electron/main/services/diagnostics.js`: `tailLines(text, n)` y
   `buildDiagnostics({ version, platform, arch, locale, logText, maxLines })`. Puro y testeable (recibe
   el texto del log, no lee el FS).
2. **IPC `diagnostics:copy`** (main): lee `app.txt`, arma el texto y lo copia con `clipboard.writeText`;
   devuelve `{ copied:true, preview }`.
3. **IPC `diagnostics:open-logs`**: abre la carpeta de logs con `shell.openPath`.
4. **Toggle `diagnosticsCopy`** (default **ON**) en `prefs.js`, expuesto por `app:config-*`.
5. **Settings → “Diagnóstico”**: toggle + botones (se muestran solo con el toggle ON).

## Architecture

```text
Electron main
├── index.js            ← ctx suma `clipboard`, `shell`, `app` (para el diagnóstico)
├── services/diagnostics.js ← NUEVO: buildDiagnostics + tailLines (puros)
├── ipc/handlers.js     ← NUEVO: diagnostics:copy · diagnostics:open-logs
│                       ← app:config-* extendido con `diagnosticsCopy`
└── services/prefs.js   ← nuevo pref `diagnosticsCopy` (default true)

Renderer (mangacount.client)
├── components/SettingsModal.jsx ← sección "Diagnóstico" (toggle + botones)
└── api/localAdapter.js          ← diagnosticsCopy(), openLogs(), appConfig*/set incluye diagnosticsCopy
```

## Servicio

```js
// services/diagnostics.js
export function tailLines(text, n) {
  return String(text ?? '').split(/\r?\n/).slice(-n).join('\n');
}

export function buildDiagnostics({ version, platform, arch, locale, logText, maxLines = 100, now = new Date() }) {
  return [
    `MangaCount v${version} · ${platform}/${arch} · ${locale}`,
    `Fecha: ${now.toISOString()}`,
    '--- últimas líneas de app.txt ---',
    tailLines(logText, maxLines) || '(log vacío)',
  ].join('\n');
}
```

## Handlers (ctx inyectado: `dataDir`, `app`, `clipboard`, `shell`, `logger`)

```js
'diagnostics:copy': ({ dataDir, app, clipboard }) => {
  const logPath = path.join(dataDir, 'logs', 'app.txt');
  const logText = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
  const text = buildDiagnostics({
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    locale: app.getLocale(),
    logText,
  });
  clipboard?.writeText?.(text);
  return { copied: true, preview: text.slice(0, 600) };
},

'diagnostics:open-logs': ({ dataDir, shell }) => {
  shell?.openPath?.(path.join(dataDir, 'logs'));
  return { opened: true };
},
```

## Preferencia

- `prefs.js`: `diagnosticsCopy: true` por defecto (en `DEFAULT_PREFS` / `resolvePrefs`).
- `app:config-get` devuelve `{ startInTray, diagnosticsCopy }`; `app:config-set` acepta ambos.

## Settings

```text
Diagnóstico
├── [✓] Habilitar diagnóstico            (default ON)
├── [ Copiar diagnóstico ]               ← diagnostics:copy  ("Copiado ✓")
└── [ Abrir carpeta de logs ]            ← diagnostics:open-logs
```

- Con el toggle **OFF**, los dos botones quedan ocultos/deshabilitados.

## Validation

- **Armado**: `buildDiagnostics` incluye versión/OS/arch/locale y **solo las últimas N líneas**; log
  vacío → `(log vacío)`.
- **Copia**: `diagnostics:copy` escribe al portapapeles (fake en test) y devuelve `preview`.
- **Abrir logs**: `diagnostics:open-logs` llama `shell.openPath` con `<userData>/logs`.
- **Toggle**: OFF oculta/deshabilita los botones; el valor persiste en `preferences.json`.
- **Sin secretos**: el log no contiene el token; el resumen no agrega datos sensibles.
- **Tests**: `node --test` (`tailLines`, `buildDiagnostics`, `diagnostics:copy` con `clipboard` fake) y
  `vitest` (toggle oculta/muestra botones; el botón llama `diagnosticsCopy`).
