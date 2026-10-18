# Tasks: `/pendientes` con tope configurable y paginación por botones

## Fase 1 — Helper de división (hecho con #116)

- [x] `discord-messages.js` con `splitMessage` (corta por líneas, ≤1900, indicador `(i/n)`).
- [x] Tests de `splitMessage` (corto, multi-línea, línea larga, marcador).

## Fase 2 — Preferencias y validación (hecho con #116)

- [x] `prefs.bot.pendingLimitEnabled: true` y `pendingLimit: 20`.
- [x] `bot:config-set` valida `pendingLimit` entero 1–500.
- [x] Tests de prefs/validación.

## Fase 3 — Bot: tope configurable y respuestas repartidas (hecho con #116)

- [x] `handleInteraction` reparte respuestas largas en `reply` + `followUps`.
- [x] `pendientes` respeta `pendingLimitEnabled`/`pendingLimit`.
- [x] Tests: con tope, sin tope y dispatcher multi-mensaje.

## Fase 4 — Paginación por botones (pendiente)

- [ ] Crear `electron/main/services/discord-pagination.js` (`createPaginationStore`, `renderPage`) y sus
      tests (páginas, extremos, expiración, autorización).
- [ ] `discord-bot.js`: `/pendientes` devuelve `{ kind: 'paged', token }` (tamaño de página =
      `pendingLimit`, o una sola página si el tope está apagado).
- [ ] `discord-bot.js`: `handleInteraction` responde la página 1 con botones.
- [ ] `discord-bot.js`: `handleButton` maneja `mc:pend:<token>:<page>` (auth del invocador/allowlist,
      expiración con aviso, `interaction.update` sin mensajes nuevos).
- [ ] Tests: paginación completa, botón de usuario no autorizado y token expirado.
- [ ] Dejar de truncar con “y N series más.” en `/pendientes`.

## Fase 5 — Settings UI

- [x] Checkbox “Limitar /pendientes” + campo de cantidad (1–500).
- [ ] Renombrar el campo a **“Series por página”** (ahora es el tamaño de página) y ajustar el test.

## Fase 6 — Gates y verificación

- [ ] `npm test` en verde.
- [ ] `npm run test:coverage` en verde (main ≥90%).
- [ ] `npm run test:renderer:coverage` en verde (≥90%).
- [ ] `npm run lint:renderer` sin errores.
- [ ] `npm run build:renderer` sin errores.
- [ ] Verificación manual (si hay bot configurado): `/pendientes` con más de una página y navegación con
      los botones.
