# Tasks: Pulir la pantalla Settings (estilos propios e idioma unificado)

## Fase 1 — Clases propias del modal (CSS)

- [ ] `SettingsModal.css`: agregar `.settings-btn` y modificadores (`--primary`, `--danger`) consumiendo
      design tokens (`--space-*`, `--radius-*`, `--text-*`, `--dur-*`, `--ease-out`), **sin** `width:100%`
      global.
- [ ] `SettingsModal.css`: agregar la clase propia del modal para el label del selector de archivo
      (reemplazo de `.file-input-label`).
- [ ] `SettingsModal.css`: ajustar `.settings-body` a padding consistente de 16px a los lados.

## Fase 2 — Reemplazo de clases del Sidebar (JSX)

- [ ] `SettingsModal.jsx`: reemplazar `.action-button` por las clases propias del modal (Export TSV y
      "Traer portadas faltantes").
- [ ] `SettingsModal.jsx`: reemplazar `.file-input-label` por la clase propia del modal.
- [ ] `SettingsModal.jsx`: dejar de usar `.import-section` y pasar la sección TSV al estilo de sección
      existente.
- [ ] `SettingsModal.jsx`: reemplazar `.danger-button` (Restaurar…, Nuclear Option, Detener) por las
      clases propias, sin full-width forzado.

## Fase 3 — Naming e idioma

- [ ] `SettingsModal.jsx`: renombrar la sección "Intercambio" a "Importar / Exportar (TSV)".
- [ ] `SettingsModal.jsx`: traducir al español los strings en inglés del modal ("Choose TSV File",
      "Export TSV", "Importing...", "Select a profile first", mensajes de import/export, warning de
      Danger Zone) y unificar los títulos de sección en español.

## Fase 4 — Tests

- [ ] `SettingsModal.test.jsx`: actualizar los tests que buscan "Intercambio" y "Choose TSV File" para
      reflejar el nuevo nombre y los strings en español.
- [ ] `SettingsModal.test.jsx`: agregar/ajustar un test que verifique la sección "Importar / Exportar
      (TSV)" presente y "Intercambio" ausente.
- [ ] `SettingsModal.test.jsx`: mantener en verde los tests de import/export/bot/etc. afectados por los
      cambios de texto.

## Fase 5 — Gates y verificación

- [ ] `npm run lint:renderer` sin errores (mirar la línea resumen completa de ESLint).
- [ ] `npm run test:renderer:coverage` en verde (≥90% stmts/branches/funcs/lines).
- [ ] `npm run test:coverage` (main) en verde (≥90%).
- [ ] `npm run build:renderer` sin errores.
- [ ] Verificación visual de Settings en tema claro y oscuro (botones consistentes, sin full-width
      forzado, padding alineado).
- [ ] `ancleto-security` + verificación cruzada contra proposal/design/specs.
- [ ] Al archivar, reconciliar los specs `frontend-web`/`import-export` que nombran "Intercambio".
