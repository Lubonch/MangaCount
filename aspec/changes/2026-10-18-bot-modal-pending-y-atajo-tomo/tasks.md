# Tasks: Modal precargado para `/pending` y atajo al sumar tomo

- [ ] `discord-bot.js`: `/pending` sin texto devuelve `{ kind: 'modal', entry }`.
- [ ] `discord-bot.js`: `handleInteraction` abre el Modal (TextInput precargado) y maneja `isModalSubmit()`.
- [ ] `discord-bot.js`: `/tomo` agrega `[Confirmar +1 y editar nota]` cuando hay `pending`; aplica el `+1` y abre el modal.
- [ ] Tests: modal precargado, submit con/sin texto, atajo de `/tomo` y autorización.
- [ ] `npm test` en verde y `npm run test:coverage` (main ≥90%).
