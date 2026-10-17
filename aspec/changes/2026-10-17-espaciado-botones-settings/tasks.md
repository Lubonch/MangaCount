# Tasks: Espaciado del botón de cierre en Settings

## Fase 1 — CSS

- [ ] `SettingsModal.css`: agregar `flex: 1 1 auto; min-height: 0` a `.settings-body`.
- [ ] `SettingsModal.css`: agregar `.settings-modal-content .modal-actions { margin-top: 0; padding: var(--space-4); }`.

## Fase 2 — Verificación

- [ ] Captura del modal de Settings: “Cerrar” con ~16px de aire respecto del borde inferior/derecho.
- [ ] Con todas las secciones cargadas, el body scrollea y el pie queda visible.
- [ ] Confirmar que los otros modales no cambian (reglas acotadas a `.settings-modal-content`).

## Fase 3 — Gates

- [ ] `npm run test:renderer:coverage` en verde (≥90%).
- [ ] `npm run lint:renderer` sin errores.
- [ ] `npm run build:renderer` sin errores.
