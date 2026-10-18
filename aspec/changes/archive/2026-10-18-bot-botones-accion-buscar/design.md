# Design: Botones de acción rápida en `/buscar`

## Approach

- `/buscar` con **un** resultado: devuelve `{ kind: 'entry', entry, content, components }` con una
  `ActionRowBuilder` de tres botones `mc:entry:<action>:<entryId>` (`tomo`, `prioridad`, `pending`).
- `handleInteraction` responde `{ content, components, ephemeral }` cuando el comando devuelve
  `kind: 'entry'`.
- `handleButton` maneja `mc:entry:*`: valida allowlist, aplica la acción y hace `interaction.update` con
  el contenido actualizado (para `tomo` reusa el flujo de confirmación; para `pending` delega en el
  modal de #121).
- Con 0 o >1 coincidencias, `/buscar` mantiene su respuesta de texto actual (sin botones).

## Architecture

```
/buscar <serie> ──► 1 match ──► { kind:'entry', components:[+1][⭐][📝] }
                                     │
              handleButton mc:entry:* ──► (allowlist) ──► applyWrite / modal ──► interaction.update
```

Archivos: **modificar** `electron/main/services/discord-bot.js`; **tests** `discord-bot.test.js`.

## Validation

- `/buscar` con match único → botones visibles; con 0 o varias coincidencias → sin botones.
- `[+1 Tomo]` aplica el flujo de confirmación y el mensaje queda actualizado.
- `[⭐ Prioridad]` alterna y se refleja en el mensaje.
- `[📝 Editar Pending]` abre el modal (o no se muestra si #121 no está).
- Usuario fuera de la allowlist no puede usar los botones.
- **Gates**: `npm test`, `npm run test:coverage`, `npm run lint:renderer`, `npm run build:renderer`.
