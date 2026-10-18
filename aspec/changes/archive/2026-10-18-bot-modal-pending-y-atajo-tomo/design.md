# Design: Modal precargado para `/pending` y atajo al sumar tomo

## Approach

- `pending` sin texto → el comando devuelve `{ kind: 'modal', entry, value }`; `handleInteraction` abre
  el Modal con `customId` `mc:pending:<entryId>` y un `TextInput` con `value = pending ?? ''`.
- `handleInteraction` maneja `isModalSubmit()`: lee el valor del `TextInput` y aplica
  `handlers['entry:upsert']` con `pending` (string vacío → `null`).
- `/tomo`: la confirmación (`beginPendingWrite`) suma un segundo botón
  `mc:confirmedit:<token>`; `handleButton` aplica el `+1` y luego abre el Modal de `pending` con el valor
  vigente.
- Reusa la autorización de `handleButton` (allowlist) y el patrón de tokens con TTL.

## Architecture

```
/pending <serie> (sin texto) ──► { kind:'modal' } ──► interaction.showModal(TextInput(value=pending))
modal submit ──► entry:upsert({ pending })
/tomo <serie> ──► confirmación [+1] [+1 y editar nota] ──► (+1) ──► showModal(pending)
```

Archivos: **modificar** `electron/main/services/discord-bot.js`; **tests** `discord-bot.test.js`.

## Validation

- `/pending Berserk` abre un modal con el `pending` actual precargado.
- Submit con texto → `entry:upsert` guarda ese texto; submit vacío → `pending` queda `null`.
- `/tomo` en una serie con `pending` muestra el botón extra; al usarlo aplica `+1` y abre el modal.
- Usuario fuera de la allowlist no puede abrir ni enviar el modal.
- **Gates**: `npm test`, `npm run test:coverage`, `npm run lint:renderer`, `npm run build:renderer`.
