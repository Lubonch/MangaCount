# Design: `/pendientes` paginado con tamaño de página configurable

## Approach

El tope configurable pasa a ser el **tamaño de página** y se agrega paginación por botones. El helper de
división en varios mensajes se conserva para el resto de las respuestas.

### 1. Store de paginación (`discord-pagination.js`, nuevo)

- `createPaginationStore({ ttlMs = 300000, now = Date.now })` → `{ create({ entries, pageSize, userId }), get(token), remove(token) }`.
- Cada entrada: `{ token, entries, pageSize, userId, expiresAt }`; `get` devuelve `null` si expiró.
- `renderPage(pagination, page)` → `{ content, components }`:
  - `content`: encabezado + líneas de la página + pie `Página X de Y (Total: N series)`.
  - `components`: `ActionRowBuilder` con `[⬅️ Anterior]` y `[Siguiente ➡️]` (`customId`
    `mc:pend:<token>:<page>`), deshabilitados en los extremos.

### 2. Comando `/pendientes`

- `pendingLimitEnabled`/`pendingLimit` = **tamaño de página** (default 20). Con el tope desactivado,
  `pageSize = total` (una sola página).
- Crea la entrada en el store (con `userId`) y devuelve `{ kind: 'paged', token }`.
- El texto de cada línea no cambia; se elimina el “y N series más.” (ahora se navega).

### 3. Dispatcher

- `createDiscordBot` crea `const pagination = createPaginationStore()` y lo pasa a `createCommands`
  (para crear páginas) y lo usa en `handleButton`.
- `handleInteraction`: si el comando devuelve `{ kind: 'paged', token }` → `renderPage(token, 1)` y
  `interaction.reply({ content, components, ephemeral })`.
- `handleButton`: reconoce `mc:pend:<token>:<page>` →
  - valida autorización: `interaction.user.id === entry.userId` o usuario de la allowlist;
  - si el token expiró → `interaction.update({ content: 'La paginación expiró; volvé a ejecutar /pendientes.', components: [] })`;
  - si no → `renderPage(token, page)` y `interaction.update(...)` (sin mensajes nuevos).
- El helper `splitMessage` sigue usándose para el resto de las respuestas (p. ej. `/buscar`).

## Architecture

```
/pendientes
   ├─ lista completa ordenada (prioridad, pendiente)
   ├─ pageSize = pendingLimitEnabled ? pendingLimit : total
   └─ pagination.create({ entries, pageSize, userId }) ─► token
                                    │
handleInteraction ── renderPage(token, 1) ──► reply({ content, components })
                                    │
botón mc:pend:<token>:<page> ── handleButton ──► (auth) ── renderPage ──► update()
```

Archivos:

- **Nuevo**: `electron/main/services/discord-pagination.js`, `discord-pagination.test.js`.
- **Modificar**: `electron/main/services/discord-bot.js`, `discord-bot.test.js`.
- **Sin cambios**: `discord-messages.js` (sigue para las demás respuestas).

## Validation

- **Paginación**: con 45 series y `pendingLimit` 20 → 3 páginas; el pie dice `Página 1 de 3 (Total: 45
  series)`; `Anterior` deshabilitado en la 1 y `Siguiente` en la última.
- **Tope desactivado**: una sola página con todas las series y sin botones de navegación (o ambos
  deshabilitados).
- **Autorización**: un usuario distinto (fuera de la allowlist) no puede cambiar de página.
- **Expiración**: con el store vencido, el botón responde con el aviso y no crashea.
- **Sin mensajes nuevos**: cambiar de página usa `interaction.update`.
- **Otras respuestas**: `/buscar` sigue partiéndose en varios mensajes si es larga.
- **Gates**: `npm test`, `npm run test:coverage`, `npm run test:renderer:coverage`,
  `npm run lint:renderer`, `npm run build:renderer`.
