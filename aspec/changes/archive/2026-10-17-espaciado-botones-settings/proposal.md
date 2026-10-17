# Proposal: Espaciado del botón de cierre en Settings

## Problem

En la pantalla **Settings**, el botón **“Cerrar”** del pie queda pegado a la esquina inferior derecha
del modal (a ~3 px del borde). Se ve apretado contra el borde redondeado.

Causa raíz (verificada):

- `.settings-modal-content` (`mangacount.client/src/components/SettingsModal.css`) **no tiene padding**.
- El pie usa `.modal-actions`, definido globalmente en `AddMangaModal.css`: trae `margin-top: 28px` y
  `padding-top: 20px`, pero **no** padding lateral ni inferior.
- En los otros modales el `.modal-content` aporta el inset; en Settings el pie toca el borde.
- Además, `.settings-body` no tiene `min-height: 0`, así que con contenido largo el footer puede
  empujarse fuera del modal en vez de dejar scrollear el body.

## Proposed change

Dar a Settings reglas propias de espaciado, sin tocar el `.modal-actions` global (que otros modales
siguen usando tal cual):

- `.settings-body`: `flex: 1 1 auto; min-height: 0` para que scrollee sin empujar el pie.
- `.settings-modal-content .modal-actions`: `margin-top: 0` y `padding: var(--space-4)` para que
  “Cerrar” quede con el mismo aire que el resto del modal.

## Scope

**In scope**

- `mangacount.client/src/components/SettingsModal.css` (reglas propias del modal).
- Test/verificación visual del modal de Settings.

**Out of scope**

- Cambiar el `.modal-actions`/`.close-button` globales de otros modales.
- Rediseño del modal (secciones, orden, contenido).
- Mover el botón de cierre a otro lugar.

## Risks

- **Afectar otros modales**: mitigación → las reglas se acotan con `.settings-modal-content .modal-actions`.
- **Doble scroll**: mitigación → `min-height: 0` en el body y `overflow-y: auto` ya existente.
- **Diferencia con el diseño previo**: mitigación → sólo agrega padding; no cambia colores ni tipografía.
