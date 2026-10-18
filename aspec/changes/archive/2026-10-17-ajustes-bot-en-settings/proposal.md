# Proposal: Ajustes del bot configurables en Settings

## Problem

Varios comportamientos del bot están **hardcodeados** y no se pueden ajustar desde la app:

- **Respuestas de lectura públicas**: `/perfil`, `/buscar`, `/pendientes` y `/recomendar` responden en
  el canal (`interaction.reply(String(reply))`), así que todo lo que consultás queda visible para el
  resto del server. No hay opción de respuesta **efímera**.
- **TTL de confirmación de escrituras** fijo en **5 minutos** (`beginPendingWrite({ ttlMs = 300000 })`):
  si tardás más, la confirmación expira.
- **Default de `/recomendar`** fijo en **5** (la opción `limite` acepta 1–10 hardcodeado en la
  definición del comando).

## Proposed change

Agregar en **Settings → Bot** un bloque de ajustes, persistido en `prefs.bot`:

1. **Respuestas efímeras** (`bot.ephemeralReplies`, default **`false`** = comportamiento actual): los
   comandos de **lectura** responden solo al usuario.
2. **TTL de confirmación** (`bot.confirmTtlMinutes`, default **5**, rango 1–60): minutos que dura el
   botón Confirmar/Cancelar de las escrituras.
3. **Recomendaciones por defecto** (`bot.recommendLimit`, default **5**, rango 1–10): valor que usa
   `/recomendar` cuando no se pasa `limite`.

## Scope

**In scope**

- `electron/main/services/prefs.js`: los tres campos con defaults.
- `electron/main/ipc/handlers.js` (`bot:config-set`): validación de rangos.
- `electron/main/services/discord-bot.js`: respuestas efímeras en comandos de lectura; TTL desde la
  config; default de `/recomendar` desde la config.
- `mangacount.client/src/components/SettingsModal.jsx` (+ `.css`): los tres controles en la sección Bot.
- Tests: prefs/validación, bot (efímeras, TTL, default de recomendaciones) y `SettingsModal`.

**Out of scope**

- Cantidad de sugerencias de `/buscar` (poco valor).
- Idioma de las respuestas (no hay i18n).
- Multi-guild / alcance de registro de comandos.
- El **límite de `/pendientes`** — va en el change
  `2026-10-17-bot-pendientes-completo-en-varios-mensajes`.

## Risks

- **Cambio de comportamiento por default**: mitigación → los tres defaults preservan el comportamiento
  actual (`false`, `5`, `5`); todo es opt-in.
- **Efímeras y el mensaje de confirmación**: las escrituras ya usan `ephemeral: true`; el toggle solo
  afecta a los comandos de lectura. Mitigación → test explícito de que la confirmación sigue efímera.
- **Valores inválidos**: mitigación → validación por rango al guardar (1–60 y 1–10).
- **Acoplamiento con el otro change**: ambos tocan `prefs.bot` y la sección Bot. Mitigación → campos
  distintos y sin dependencias; se pueden implementar en cualquier orden.
