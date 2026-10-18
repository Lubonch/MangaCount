# Tasks: Modal precargado para `/pending` y atajo al sumar tomo

- [x] `discord-bot.js`: `/pending` sin texto devuelve `{ kind: 'modal', entry }`.
- [x] `discord-bot.js`: `handleInteraction` abre el Modal (TextInput precargado) y maneja `isModalSubmit()`.
- [x] `discord-bot.js`: `/tomo` agrega `[Confirmar +1 y editar nota]` cuando hay `pending`; aplica el `+1` y abre el modal.
- [x] Tests: modal precargado, submit con/sin texto, atajo de `/tomo` y autorización.
- [x] `npm test` en verde y `npm run test:coverage` (main ≥90%).
