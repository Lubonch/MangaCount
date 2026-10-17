# Design: Espaciado propio del modal de Settings

## Approach

Reglas CSS acotadas al modal de Settings, sin tocar las globales:

```css
.settings-body {
  /* ya tenía padding/overflow; se agrega: */
  flex: 1 1 auto;
  min-height: 0;
}

.settings-modal-content .modal-actions {
  margin-top: 0;
  padding: var(--space-4);
}
```

- `flex: 1 1 auto` + `min-height: 0`: el body ocupa el alto disponible y scrollea; el pie queda fijo
  abajo y visible.
- `padding: var(--space-4)` (16px) en el pie: “Cerrar” deja de tocar la esquina (mismo aire que el
  header y el body). `margin-top: 0` evita el margen extra del `.modal-actions` global (el borde
  superior lo aporta el `border-top` existente).
- No se toca `.close-button` (el `×` del header ya tiene 24px de aire por el `padding` del
  `.modal-header`).

## Architecture

Un solo archivo de producción:

- **Modificar**: `mangacount.client/src/components/SettingsModal.css`.
- **Sin cambios**: `SettingsModal.jsx`, `.modal-actions`/`.close-button` globales, otros modales.

## Validation

- **Visual**: captura del modal de Settings; el botón “Cerrar” queda con ~16px respecto de los bordes
  inferior y derecho del modal.
- **Scroll**: con contenido largo (todas las secciones), el body scrollea y el pie permanece visible.
- **Regresión**: los otros modales (entry/manga/perfil) no cambian (reglas acotadas).
- **Gates**: `npm run test:renderer:coverage`, `npm run lint:renderer`, `npm run build:renderer`.
