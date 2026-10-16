# Tasks: Copiar diagnóstico (exportar estado + log)

## Fase 1 — Servicio y canales IPC

- [x] `electron/main/services/diagnostics.js`: `tailLines(text, n)` y
      `buildDiagnostics({ version, platform, arch, locale, logText, maxLines })` (puros)
- [x] Handlers `diagnostics:copy` (lee `app.txt`, arma el texto, `clipboard.writeText`, devuelve
      `{ copied, preview }`) y `diagnostics:open-logs` (`shell.openPath` de `<userData>/logs`)
- [x] `index.js`: sumar `clipboard`, `shell`, `app` al `ctx`
- [x] Preferencia `diagnosticsCopy` (default `true`) en `prefs.js`; `app:config-*` la incluye
- [x] Registrar `diagnostics:*` en `preload.cjs` y `localAdapter.js` (`diagnosticsCopy`, `openLogs`)
- [x] Tests `node --test`: `tailLines`, `buildDiagnostics` (incluye versión/OS, límite N, log vacío) y
      `diagnostics:copy` (clipboard fake)

## Fase 2 — Settings

- [x] Sección **“Diagnóstico”** en `SettingsModal.jsx` (+ CSS): toggle **Habilitar diagnóstico**
      (default ON) + botones **Copiar diagnóstico** y **Abrir carpeta de logs**
- [x] Gate de UI: con el toggle OFF, ocultar/deshabilitar los botones
- [x] Feedback “Copiado ✓” tras copiar
- [x] Tests `vitest`: el toggle oculta/muestra los botones y persiste; el botón llama `diagnosticsCopy`

## Fase 2b — Layout responsive (sin espacio vacío a la derecha)

- [x] `index.css`: quitar `display: flex`/`place-items: center` de `body` y agregar `#root { width: 100% }`
- [x] Verificar que el contenido ocupe el ancho (sin hueco a la derecha) y sin scroll horizontal, en
      pantalla completa y en ventana angosta (tabla/compacta/cards)

## Fase 3 — Documentación y cierre

- [x] `README.md` / `docs/desktop.md`: botón “Copiar diagnóstico” (qué copia, límite de líneas, privacidad)
- [x] `CHANGELOG.md`
- [x] Correr `npm test` (raíz) y la suite del renderer en verde
- [x] Verificación cruzada contra proposal, design y delta specs de este change
