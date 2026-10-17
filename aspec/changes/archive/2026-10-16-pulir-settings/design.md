# Design: Pulido visual e idioma de Settings

## Approach

**A + B**, acotado al modal de Settings, sin tocar el Sidebar.

- **Clases propias sobre tokens**: se agregan en `SettingsModal.css` un set de botones del modal
  (`.settings-btn` + modificadores `--primary`/`--danger`) que consumen los **design tokens**
  (`tokens.css`: `--space-*`, `--radius-*`, `--text-*`, `--dur-*`, `--ease-out`; y `theme.css` para
  color/acento). **No** se define `width:100%` por defecto; el full-width solo se aplica cuando el
  diseño lo pida (p. ej. un contenedor que lo requiera), no como regla global.
- **Reemplazo de clases del Sidebar** en `SettingsModal.jsx`: `.action-button`, `.file-input-label`,
  `.import-section` y `.danger-button` dejan de usarse en el modal. La caja del bloque TSV usa el
  estilo de sección existente (`.settings-section`) más los controles propios, en vez de
  `.import-section` (fondo/borde de sidebar).
- **Padding consistente**: `.settings-body` pasa a `padding: var(--space-4)` (16px laterales) para
  alinear con el `padding` interno de `.settings-section` (16px) y evitar que las secciones toquen el
  borde del modal de 720px.
- **Naming**: la sección **"Intercambio"** se renombra a **"Importar / Exportar (TSV)"**.
- **Idioma**: todos los strings visibles del modal pasan a español (upload/exports/mensajes de estado/
  warning de Danger Zone), con los títulos de sección en español consistente.

No se modifican estilos globales ni `Sidebar.css`: el Sidebar conserva sus clases y su apariencia.

## Architecture

Solo dos archivos de producción más tests; ningún cambio de contrato IPC ni de servicios.

```
SettingsModal.jsx            SettingsModal.css                 tokens.css / theme.css
  clases propias ───────────► .settings-btn / .settings-btn--*  ──► variables (tokens)
  (sin .action-button,          .settings-body padding 16px
   .file-input-label,           (sección TSV con .settings-section)
   .import-section,
   .danger-button)
  strings en español
        │
        └─► Sidebar.css  (intacto; el Sidebar sigue usando sus clases)
```

Archivos:

- **Modificar**: `mangacount.client/src/components/SettingsModal.jsx`
- **Modificar**: `mangacount.client/src/components/SettingsModal.css`
- **Modificar**: `mangacount.client/src/test/components/SettingsModal.test.jsx`
- **NO tocar**: `mangacount.client/src/components/Sidebar.css` (ni `Sidebar.jsx`)

Criterio de reemplazo (mapeo conceptual, sin código):

| Uso actual (clase de Sidebar)     | Reemplazo en el modal                                |
|-----------------------------------|------------------------------------------------------|
| `.action-button` (Export TSV, bulk)| `.settings-btn` (+ variante primaria donde corresponda) |
| `.file-input-label`               | clase propia del modal para el label de archivo      |
| `.import-section`                 | estilo de sección (`settings-*`) ya existente        |
| `.danger-button`                  | `.settings-btn--danger` (sin `width:100%` forzado)   |

## Validation

- **Render (vitest + Testing Library)**:
  - La sección de intercambio aparece con el nombre **"Importar / Exportar (TSV)"** y **no** con
    "Intercambio".
  - Los controles de import/export siguen operando sobre el perfil activo (export dispara
    `entryExport`, import usa el flujo actual).
  - Los botones del modal no dependen de las clases del Sidebar para verse consistentes (los tests
    actualizados dejan de referenciar "Intercambio" y "Choose TSV File").
- **Gates**: `npm run test:renderer:coverage` y `npm run test:coverage` en verde (≥90%); `npm run
  lint:renderer` sin errores; `npm run build:renderer`.
- **Reconciliación de specs**: al archivar, actualizar (o emitir delta `MODIFIED`) los requirements de
  `frontend-web` ("Pantalla de Settings unificada") e `import-export` que hoy dicen **"Intercambio"**,
  para reflejar **"Importar / Exportar (TSV)"**.
- **Verificación visual**: Settings en tema claro y oscuro; botones de tamaño consistente, sin fila
  full-width forzada, y secciones con margen lateral.
