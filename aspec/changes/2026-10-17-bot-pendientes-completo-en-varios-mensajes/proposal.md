# Proposal: Límite de `/pendientes` configurable (con lista completa opcional)

## Problem

`/pendientes` corta la lista con **“…y N series más.”** por un **tope fijo de 20** en el comando
(`electron/main/services/discord-bot.js:271`). No es el límite de caracteres de Discord. Ese tope se
puso por algo (evitar mensajes enormes), pero hoy **no se puede ajustar ni desactivar**.

Además el bot responde **un solo mensaje**, así que cualquier salida larga choca con el límite de 2000
caracteres por mensaje; `/buscar` no tiene tope y puede **fallar** si la lista de resultados es larga.

## Proposed change

1. **Tope configurable desde Settings** (en la sección Bot):
   - `bot.pendingLimitEnabled` — **default `true`** (se mantiene el comportamiento actual de 20).
   - `bot.pendingLimit` — **default `20`**, cantidad máxima de series que se listan.
2. **Con el tope desactivado**, `/pendientes` lista **todas** las series pendientes y la respuesta se
   reparte en **varios mensajes**.
3. **Helper de división de mensajes** aplicado a **cualquier** respuesta de comando, lo que también
   protege a `/buscar` (y a los comandos de escritura largos).
4. La UI de Settings muestra el checkbox **“Limitar /pendientes”** y, cuando está activo, un campo con
   la cantidad.

## Scope

**In scope**

- `electron/main/services/prefs.js`: `bot.pendingLimitEnabled` y `bot.pendingLimit` (defaults + validación).
- `electron/main/services/discord-bot.js`: `/pendientes` respeta el tope configurado; el dispatcher
  reparte respuestas largas en varios mensajes.
- Nuevo `electron/main/services/discord-messages.js` (helper de división) + tests.
- `mangacount.client/src/components/SettingsModal.jsx` (+ CSS): checkbox + cantidad en la sección Bot.
- Tests: prefs, bot (`/pendientes` con y sin tope), dispatcher y `SettingsModal`.

**Out of scope**

- Otros ajustes del bot (efímeras, TTL de confirmación, default de `/recomendar`) — cambio aparte.
- Paginación interactiva con botones.
- Embeds (se mantiene texto plano).
- Multi-guild.

## Risks

- **Cambiar el default sin querer**: mitigación → default `true` + `20` = comportamiento idéntico al
  actual; el cambio es opt-in.
- **Spam al desactivar el tope**: mitigación → es intencional; el indicador `(i/n)` deja claro cuántos
  mensajes son y el usuario puede reactivar el tope.
- **Rate limit de Discord** por ráfaga: mitigación → pausa corta entre `followUp`s y bloques de
  ≤ ~1900 caracteres.
- **Línea individual > límite** (título larguísimo): mitigación → el helper parte la línea como último
  recurso.
- **Valores inválidos** del campo cantidad: mitigación → validación (rango 1–500) al guardar.
