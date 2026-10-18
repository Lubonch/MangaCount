# Design: Límite configurable de `/pendientes` y respuestas repartidas

## Approach

Se mantiene el tope por defecto (**20**) pero pasa a ser **configurable**, y la salida larga se reparte
en varios mensajes cuando el tope está desactivado.

### 1. Preferencias (`prefs.js`)

```js
bot: {
  enabled: false,
  guildId: null,
  allowedUserIds: [],
  pendingLimitEnabled: true,   // default: comportamiento actual
  pendingLimit: 20,            // 1..500
}
```

- `resolvePrefs` ya mergea `DEFAULT_PREFS.bot` con lo guardado (los campos nuevos heredan el default).
- Validación en `bot:config-set` (handler): si `pendingLimitEnabled` y el valor no es un entero 1–500 →
  error claro; se normaliza a número.

### 2. Helper de división (`discord-messages.js`, nuevo)

- `splitMessage(text, { limit = 1900 })`: corta por líneas (nunca parte una línea salvo que ella sola
  supere el límite) y, si hay más de un bloque, agrega `(i/n)`.
- `DISCORD_MESSAGE_LIMIT = 2000`, `CHUNK_LIMIT = 1900`.

### 3. Bot (`discord-bot.js`)

- `createDiscordBot({ ..., followUpDelayMs = 350 })`: pausa entre `followUp`s (0 en tests).
- `handleInteraction`: `const chunks = splitMessage(String(reply))` → `interaction.reply(chunks[0])` y
  el resto con `interaction.followUp`.
- `pendientes`: lee la config; si `pendingLimitEnabled` → `slice(0, pendingLimit)` + “y N series más.”;
  si no → lista completa.
- La config del bot se resuelve con `getConfig()` (ya disponible en `createDiscordBot`).

### 4. Settings UI

En la sección **Bot (Discord)**, debajo de la allowlist:

- Checkbox **“Limitar /pendientes”** (`bot.pendingLimitEnabled`).
- Campo numérico **“Series máximas”** (`bot.pendingLimit`, 1–500), habilitado solo si el checkbox está
  activo.
- Ambos viajan en `botConfigSet({ ... })` con el resto de la config.

## Architecture

```
SettingsModal ──bot:config-set──► prefs.bot.pendingLimitEnabled / pendingLimit
                                          │
comando /pendientes ──getConfig()─────────┘
   ├─ tope activo  ──► slice(0, N) + "…y N más."     ──► reply
   └─ tope apagado ──► lista completa ──splitMessage──► reply + followUps
```

Archivos:

- **Nuevo**: `electron/main/services/discord-messages.js`, `discord-messages.test.js`.
- **Modificar**: `electron/main/services/prefs.js`, `electron/main/services/discord-bot.js`,
  `electron/main/ipc/handlers.js` (validación), `mangacount.client/src/components/SettingsModal.jsx`
  (+ `.css`), `discord-bot.test.js`, `prefs.test.js` (si aplica), `SettingsModal.test.jsx`.

## Validation

- **Defaults**: sin configurar, `/pendientes` mantiene el tope de 20 y el “y N series más.”.
- **Tope apagado**: `/pendientes` con 25+ series devuelve **todas**, repartidas en varios mensajes con
  `(i/n)`; `interaction.reply` + `followUp` (test con `followUpDelayMs: 0`).
- **Cantidad custom** (p. ej. 5): `/pendientes` lista 5 y dice “y N más”.
- **Validación**: `bot:config-set` rechaza `pendingLimit` 0, negativo, no entero o > 500.
- **Helper**: texto corto → 1 bloque; multi-línea → N bloques sin partir líneas; línea > límite → se
  parte; >1 bloque → `(i/n)`.
- **UI**: el campo de cantidad se deshabilita si el checkbox está apagado; al guardar viaja en la config.
- **Gates**: `npm test`, `npm run test:coverage` (main ≥90%), `npm run test:renderer:coverage`,
  `npm run lint:renderer`, `npm run build:renderer`.
