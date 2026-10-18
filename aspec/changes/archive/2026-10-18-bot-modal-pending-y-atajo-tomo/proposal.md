# Proposal: Modal precargado para `/pending` y atajo al sumar tomo

## Problem

El campo `pending` (tomos no consecutivos) es un **string de texto libre** (heredado del Excel). Para
actualizarlo cuando se compra un tomo colgado hay que **reescribir todo el string** desde cero en
`/pending`.

## Proposed change

1. `/pending <serie>` **sin** texto nuevo abre un **Modal** de Discord con un `TextInput` **precargado**
   con el `pending` actual.
2. En la confirmación de `/tomo <serie>`, si la entry tiene `pending` no vacío, agregar un botón
   **`[✅ Confirmar +1 y editar nota]`** que aplique el `+1` y abra el Modal con la nota actual.
3. Si el Modal se envía **vacío**, limpiar el `pending` (`null`).

## Scope

**In scope**

- `electron/main/services/discord-bot.js`: `ModalBuilder`/`TextInputBuilder`, `interaction.showModal`,
  manejo de `isModalSubmit()`, botón extra en la confirmación de `/tomo`.
- Tests: apertura del modal precargado, submit que guarda, submit vacío que limpia y `+1 + editar`.

**Out of scope**

- Cambiar el modelo de datos (`pending` sigue siendo `TEXT`).
- Modales para otros campos.

## Risks

- **`isModalSubmit` no manejado**: mitigación → branch explícito en `handleInteraction` antes de
  `isChatInputCommand`.
- **Autorización**: mitigación → validar la allowlist igual que los botones de confirmación.
- **TTL del modal**: mitigación → el `customId` lleva el token/entry y expira como el pending write.
- **Pérdida de la nota**: mitigación → el `TextInput` se precarga con el valor actual y el submit vacío
  es explícito.
