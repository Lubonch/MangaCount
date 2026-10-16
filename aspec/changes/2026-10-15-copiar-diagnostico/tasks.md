# Tasks: Copiar diagnóstico (exportar estado + log)

## Fase 1 — Servicio y canales IPC

- [ ] `electron/main/services/diagnostics.js`: `tailLines(text, n)` y
      `buildDiagnostics({ version, platform, arch, locale, logText, maxLines })` (puros)
- [ ] Handlers `diagnostics:copy` (lee `app.txt`, arma el texto, `clipboard.writeText`, devuelve
      `{ copied, preview }`) y `diagnostics:open-logs` (`shell.openPath` de `<userData>/logs`)
- [ ] `index.js`: sumar `clipboard`, `shell`, `app` al `ctx`
- [ ] Preferencia `diagnosticsCopy` (default `true`) en `prefs.js`; `app:config-*` la incluye
- [ ] Registrar `diagnostics:*` en `preload.cjs` y `localAdapter.js` (`diagnosticsCopy`, `openLogs`)
- [ ] Tests `node --test`: `tailLines`, `buildDiagnostics` (incluye versión/OS, límite N, log vacío) y
      `diagnostics:copy` (clipboard fake)

## Fase 2 — Settings

- [ ] Sección **“Diagnóstico”** en `SettingsModal.jsx` (+ CSS): toggle **Habilitar diagnóstico**
      (default ON) + botones **Copiar diagnóstico** y **Abrir carpeta de logs**
- [ ] Gate de UI: con el toggle OFF, ocultar/deshabilitar los botones
- [ ] Feedback “Copiado ✓” tras copiar
- [ ] Tests `vitest`: el toggle oculta/muestra los botones y persiste; el botón llama `diagnosticsCopy`

## Fase 3 — Documentación y cierre

- [ ] `README.md` / `docs/desktop.md`: botón “Copiar diagnóstico” (qué copia, límite de líneas, privacidad)
- [ ] `CHANGELOG.md`
- [ ] Correr `npm test` (raíz) y la suite del renderer en verde
- [ ] Verificación cruzada contra proposal, design y delta specs de este change
