# Proposal: Comandos `/stats`, `/backup` y `/status` en el bot

## Problem

La app ya tiene servicios locales de backup (`backup.js`), diagnóstico (`diagnostics.js`), updates e
inferencia de países/editoriales, pero **no son accesibles desde Discord**: para ver estadísticas, correr
un backup o saber el estado hay que abrir la app.

## Proposed change

Tres comandos para usuarios de la allowlist:

1. **`/stats [perfil]`**: resumen en **Embed** (total de tomos, series completas vs abiertas,
   distribución por formato y top editoriales/países).
2. **`/backup`**: dispara un backup manual con `backup.js`, **pidiendo confirmación por botones**
   (Confirmar/Cancelar) antes de ejecutar; reporta el resultado al terminar.
3. **`/status`**: versión de la app, estado de la base SQLite y fecha del último backup
   (`diagnostics.js`), **sin exponer tokens ni rutas sensibles**.

## Scope

**In scope**

- `electron/main/services/discord-bot.js`: los tres comandos + registro + `/ayuda`.
- Reuso de `handlers['backup:create']` y `database:statistics`/diagnóstico.
- Tests: `/stats`, confirmación y resultado de `/backup`, y `/status` sin datos sensibles.

**Out of scope**

- Restaurar backups desde Discord (solo crear).
- Programar backups desde el bot (los disparadores ya están en Settings).

## Risks

- **`/backup` lento** (destino remoto): mitigación → **confirmación primero**, ejecución en background
  (el I/O del destino ya corre en un worker) y edición del mensaje con el resultado; nunca bloquear el
  reply de la interacción.
- **Filtrar datos sensibles**: mitigación → `/status` solo expone versión, estado de la DB y fecha del
  último backup; nunca token, guild ni rutas.
- **Autorización**: mitigación → allowlist, igual que el resto de las escrituras.
- **Embeds con listas largas**: mitigación → top N acotado por sección.
