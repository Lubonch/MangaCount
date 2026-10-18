# Design: Filtros rápidos `/huecos` y `/a-punto`

## Approach

- En `search.js`, agregar `huecosEntries(entries)` (con `pending` no vacío) y `almostCompleteEntries(entries)`
  (`total > 0 && cantidad < total && total - cantidad <= 2`).
- En `createCommands`, agregar `huecos` y `a-punto` que arman las líneas y devuelven el mismo shape
  paginado que `/pendientes` (`{ kind: 'paged', token }`) o el string repartible.
- Registrar los slash commands y sumarlos a `/ayuda`.

## Architecture

```
/huecos   ──► huecosEntries(entriesFor(perfil))         ──► líneas ──► paginado
/a-punto  ──► almostCompleteEntries(entriesFor(perfil)) ──► líneas ──► paginado
```

Archivos: **modificar** `electron/main/services/discord-bot.js`, `electron/main/services/search.js`;
**tests** `discord-bot.test.js`, `search.test.js`; **README**.

## Validation

- `/huecos` lista solo series con `pending` no vacío, mostrando la nota.
- `/a-punto` lista solo series con `total` conocido y faltante de 1 o 2.
- Listas largas se paginan (o se reparten) sin truncar.
- `/ayuda` incluye ambos comandos.
- **Gates**: `npm test`, `npm run test:coverage`, `npm run lint:renderer`, `npm run build:renderer`.
