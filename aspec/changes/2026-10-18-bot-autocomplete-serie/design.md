# Design: Autocomplete del parámetro de serie

## Approach

- `handleInteraction` agrega el primer branch: `if (interaction.isAutocomplete?.()) return handleAutocomplete(interaction);`
  (antes de `isChatInputCommand`).
- `handleAutocomplete(interaction)`: lee `interaction.commandName`, el parámetro enfocado
  (`interaction.options.getFocused(true)`), resuelve el perfil activo de la sesión del usuario y filtra
  `listMangas(db)` por `normalizeTitle`/contiene; responde
  `interaction.respond(opciones.slice(0, 25))` con `{ name, value }`.
- Definiciones: los parámetros `titulo`/`serie` pasan a `{ autocomplete: true }` (requiere re-registrar
  los comandos en la guild al conectar, que ya se hace).

## Architecture

```
interaction.isAutocomplete() ──► handleAutocomplete
    ├─ perfil activo (sesión)
    ├─ títulos de listMangas(db) que matchean el foco
    └─ respond([{name, value}].slice(0,25))
```

Archivos: **modificar** `electron/main/services/discord-bot.js`; **tests** `discord-bot.test.js`.

## Validation

- Con foco `"ber"` y mangas `Berserk`/`Berserk Oficial` → opciones que empiezan con el foco primero.
- Más de 25 coincidencias → exactamente 25 opciones.
- Sin coincidencias o sin perfil activo → lista vacía, sin error.
- `isAutocomplete()` no dispara el flujo de comandos ni la autorización de escritura.
- **Gates**: `npm test`, `npm run test:coverage`, `npm run lint:renderer`, `npm run build:renderer`.
