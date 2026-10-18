# Tasks: Límite configurable de `/pendientes` y respuestas repartidas

## Fase 1 — Helper de división

- [x] Crear `electron/main/services/discord-messages.js` con `splitMessage(text, { limit })` (corta por
      líneas, nunca parte una línea salvo que supere el límite) y el indicador `(i/n)` cuando hay más
      de un bloque.
- [x] Tests de `splitMessage`: texto corto, multi-línea, línea larga y marcador de continuación.

## Fase 2 — Preferencias y validación

- [x] `prefs.js`: `bot.pendingLimitEnabled: true` y `bot.pendingLimit: 20` en los defaults.
- [x] `handlers.js` (`bot:config-set`): validar `pendingLimit` entero 1–500 y normalizarlo.
- [x] Tests de prefs/validación (default, valor inválido rechazado).

## Fase 3 — Bot

- [x] `discord-bot.js`: `handleInteraction` responde el primer bloque con `reply` y el resto con
      `followUp`, con pausa inyectable (`followUpDelayMs`, default 350; 0 en tests).
- [x] `discord-bot.js`: `pendientes` respeta `pendingLimitEnabled`/`pendingLimit` (con tope: actual;
      sin tope: lista completa).
- [x] Tests: `/pendientes` con tope (20/custom) y sin tope (lista completa); dispatcher multi-mensaje.

## Fase 4 — Settings UI

- [x] `SettingsModal.jsx`: checkbox “Limitar /pendientes” + campo “Series máximas” (1–500, deshabilitado
      si el checkbox está apagado) en la sección Bot; incluirlos en `botConfigSet`.
- [x] `SettingsModal.css`: estilo del bloque de límite.
- [x] `SettingsModal.test.jsx`: cubrir el checkbox, el campo y el payload.

## Fase 5 — Gates y verificación

- [x] `npm test` en verde.
- [x] `npm run test:coverage` en verde (main ≥90%).
- [x] `npm run test:renderer:coverage` en verde (≥90%).
- [x] `npm run lint:renderer` sin errores.
- [x] `npm run build:renderer` sin errores.
- [ ] Verificación manual (si hay bot configurado): `/pendientes` con tope de 5 y sin tope (lista
      completa en varios mensajes).
