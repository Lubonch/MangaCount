# Proposal: Botones de acción rápida en los resultados de `/buscar`

## Problem

Cuando `/buscar` devuelve el detalle de una serie, para hacer un cambio hay que escribir **un segundo
comando** (`/tomo`, `/prioridad` o `/pending`).

## Proposed change

Cuando `/buscar` resuelve a una **única** entry y el usuario está en la allowlist, agregar una fila de
botones:

- **`[+1 Tomo]`** → dispara el flujo de confirmación habitual y refresca el mensaje.
- **`[⭐ Prioridad]`** → toggle de prioridad.
- **`[📝 Editar Pending]`** → abre el Modal precargado (depende del change
  `2026-10-18-bot-modal-pending-y-atajo-tomo`).

## Scope

**In scope**

- `electron/main/services/discord-bot.js`: `/buscar` devuelve `{ kind: 'entry', entry, components }`
  cuando hay match único; `handleButton` maneja `mc:entry:<action>:<entryId>`.
- Tests: botones presentes con match único, ausentes con 0/varias coincidencias, y cada acción.

**Out of scope**

- Botones en listas de múltiples coincidencias (se mantiene el texto de desambiguación).
- Nuevas acciones más allá de las tres.

## Risks

- **Dependencia con #121**: el botón “Editar Pending” requiere el modal. Mitigación → implementar #121
  antes (o mostrar el botón solo si el modal está disponible).
- **Acciones destructivas**: mitigación → `[+1]` usa la confirmación existente; `[Prioridad]` es
  reversible; el pending se edita por modal.
- **Refresco del mensaje**: mitigación → `interaction.update` con el estado actualizado tras cada acción.
