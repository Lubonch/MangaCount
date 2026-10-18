# Tasks: Botones de acción rápida en `/buscar`

- [ ] `discord-bot.js`: `/buscar` con match único devuelve `{ kind: 'entry', entry, components }`.
- [ ] `discord-bot.js`: `handleInteraction` responde con botones y `handleButton` maneja `mc:entry:*`.
- [ ] `discord-bot.js`: `[+1 Tomo]` usa la confirmación; `[⭐ Prioridad]` alterna; `[📝 Editar Pending]` abre el modal (#121).
- [ ] Tests: botones según coincidencias, cada acción y autorización.
- [ ] `npm test` en verde y `npm run test:coverage` (main ≥90%).
