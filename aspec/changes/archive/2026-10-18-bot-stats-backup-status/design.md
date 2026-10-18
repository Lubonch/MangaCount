# Design: Comandos `/stats`, `/backup` y `/status`

## Approach

- `/stats`: calcula el resumen desde `entriesFor(perfilId)` + `listMangas` y devuelve un `EmbedBuilder`
  (campos: totales, completas/abiertas, formatos, top editoriales/países). Shape `{ kind: 'embed', embed }`.
- `/backup`: devuelve `{ kind: 'confirmBackup' }` → `handleInteraction` responde con botones
  Confirmar/Cancelar (token del pending write); al confirmar, corre `handlers['backup:create']` en
  background y edita el mensaje con OK/error (sin bloquear la interacción).
- `/status`: lee la versión (`app:info`), el estado de la DB (`database:statistics`) y el último backup
  (prefs `lastBackupAt`/`lastBackupStatus`); arma un embed sin datos sensibles.
- Registrar los tres comandos y sumarlos a `/ayuda`.

## Architecture

```
/stats   ──► resumen ──► EmbedBuilder
/backup  ──► botones Confirmar/Cancelar ──► backup:create (background) ──► update del mensaje
/status  ──► versión + estadísticas DB + último backup ──► Embed (sin secretos)
```

Archivos: **modificar** `electron/main/services/discord-bot.js`; **tests** `discord-bot.test.js`.

## Validation

- `/stats` devuelve un embed con los totales correctos y los top acotados.
- `/backup` pide confirmación; al confirmar reporta el resultado; al cancelar no ejecuta nada.
- `/backup` no bloquea el reply (responde “iniciado” y luego edita con el resultado).
- `/status` no incluye token, guild ni rutas.
- Usuario fuera de la allowlist no puede ejecutarlos.
- **Gates**: `npm test`, `npm run test:coverage`, `npm run lint:renderer`, `npm run build:renderer`.
