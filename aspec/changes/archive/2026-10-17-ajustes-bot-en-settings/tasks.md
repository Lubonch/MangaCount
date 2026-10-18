# Tasks: Ajustes del bot en Settings

## Fase 1 — Preferencias y validación

- [x] `prefs.js`: `bot.ephemeralReplies: false`, `bot.confirmTtlMinutes: 5`, `bot.recommendLimit: 5` en
      los defaults.
- [x] `handlers.js` (`bot:config-set`): validar `confirmTtlMinutes` (1–60) y `recommendLimit` (1–10).
- [x] Tests de prefs/validación (defaults y rechazos).

## Fase 2 — Bot

- [x] `discord-bot.js`: `handleInteraction` responde los comandos de lectura con
      `ephemeral: config.ephemeralReplies === true` (las escrituras siguen efímeras siempre).
- [x] `discord-bot.js`: `beginPendingWrite` usa `ttlMs: config.confirmTtlMinutes * 60000`.
- [x] `discord-bot.js`: `/recomendar` usa `limite ?? config.recommendLimit ?? 5`.
- [x] Tests: efímeras ON/OFF, TTL configurado y default de recomendaciones.

## Fase 3 — Settings UI

- [x] `SettingsModal.jsx`: checkbox “Respuestas efímeras” + campos “Minutos para confirmar escrituras”
      (1–60) y “Recomendaciones por defecto” (1–10) en la sección Bot; incluirlos en `botConfigSet`.
- [x] `SettingsModal.css`: estilo del bloque.
- [x] `SettingsModal.test.jsx`: cubrir los tres controles y el payload.

## Fase 4 — Gates

- [x] `npm test` en verde.
- [x] `npm run test:coverage` en verde (main ≥90%).
- [x] `npm run test:renderer:coverage` en verde (≥90%).
- [x] `npm run lint:renderer` sin errores.
- [x] `npm run build:renderer` sin errores.
