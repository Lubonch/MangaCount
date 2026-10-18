# Proposal: `/pendientes` con tope configurable y paginación por botones

> Merge de #116 (tope configurable + respuestas repartidas) y #119 (paginación con botones).

## Problem

`/pendientes` corta la lista con **“…y N series más.”** por un **tope fijo de 20**
(`electron/main/services/discord-bot.js`). No es el límite de caracteres de Discord. El tope se puso
por algo, pero **no se puede ajustar** y **no hay forma de ver el resto** desde Discord. Además, el bot
responde **un solo mensaje**, así que cualquier salida larga choca con el límite de 2000 caracteres
(`/buscar` no tiene tope y puede fallar).

## Proposed change

Convertir el tope en el **tamaño de página** y agregar **paginación interactiva**:

1. **Configurable** (Settings → Bot): `bot.pendingLimitEnabled` (default **true**) y
   `bot.pendingLimit` (default **20**, 1–500) pasan a ser el **tamaño de página**.
2. **Paginación con botones** (`[⬅️ Anterior]` / `[Siguiente ➡️]`) para recorrer **todas** las series:
   pie con `Página X de Y (Total: N series)`, botones deshabilitados en los extremos.
3. **Con el tope desactivado**: una sola página con todas las series.
4. **Seguridad**: los botones solo los puede usar **quien ejecutó el comando** o alguien de la
   **allowlist**; expiran a los N minutos sin crashear el bot.
5. Se mantiene el **helper de división en varios mensajes** para el resto de las respuestas (protege a
   `/buscar`), pero `/pendientes` pasa a paginar en lugar de partirse.

## Scope

**In scope**

- `electron/main/services/discord-bot.js`: `/pendientes` paginado; store de paginación y manejo de
  botones; `/pendientes` sin tope = página única.
- `electron/main/services/discord-messages.js`: se conserva para el resto de las respuestas.
- Tests: paginación (extremos, total, expiración, autorización) y compatibilidad con el tope.

**Out of scope**

- Paginación en otros comandos.
- Embeds (se mantiene texto plano).
- Cambiar el formato de cada línea.

## Risks

- **Estado de paginación en memoria**: mitigación → store con TTL y token por mensaje (mismo patrón que
  la confirmación de escrituras); al expirar, el bot avisa y no crashea.
- **Botones usados por terceros**: mitigación → validar `userId` contra el invocador/allowlist.
- **Rate limit** al pasar páginas rápido: mitigación → `interaction.update` (no mensajes nuevos).
- **Confusión con el tope**: mitigación → el tope se renombra en la UI a **“Series por página”**.
- **Convivencia con #117** (mismo requirement de comandos de consulta): mitigación → los delta specs de
  ambos changes llevan el texto unión (tope/paginación + efímeras).
