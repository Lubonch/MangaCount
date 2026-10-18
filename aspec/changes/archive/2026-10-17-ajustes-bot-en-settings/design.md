# Design: Ajustes del bot en Settings

## Approach

Tres campos nuevos en `prefs.bot` con defaults que preservan el comportamiento actual, expuestos en la
sección **Bot (Discord)** y consumidos por el bot vía `getConfig()`.

### Preferencias (`prefs.js`)

```js
bot: {
  enabled: false,
  guildId: null,
  allowedUserIds: [],
  ephemeralReplies: false,   // false = público (actual)
  confirmTtlMinutes: 5,      // 1..60
  recommendLimit: 5,         // 1..10
}
```

Validación en `bot:config-set`: `confirmTtlMinutes` entero 1–60 y `recommendLimit` entero 1–10; valores
inválidos → error claro.

### Bot (`discord-bot.js`)

- **Efímeras**: `handleInteraction` usa `ephemeral: config.ephemeralReplies === true` en el `reply` de
  los comandos de **lectura**. Las **escrituras** siguen con `ephemeral: true` siempre (la confirmación
  no cambia).
- **TTL**: `beginPendingWrite(userSession, reply)` recibe `ttlMs: config.confirmTtlMinutes * 60000`.
- **Recomendaciones**: `recomendar` usa `limite ?? config.recommendLimit ?? 5`.

### Settings UI

En la sección **Bot (Discord)**, debajo de la allowlist:

- Checkbox **“Respuestas efímeras”** (`ephemeralReplies`).
- Campo numérico **“Minutos para confirmar escrituras”** (`confirmTtlMinutes`, 1–60).
- Campo numérico **“Recomendaciones por defecto”** (`recommendLimit`, 1–10).
- Los tres viajan en `botConfigSet({ ... })` junto al resto.

## Architecture

```
SettingsModal ──bot:config-set──► prefs.bot.{ephemeralReplies, confirmTtlMinutes, recommendLimit}
                                        │
                       getConfig() ─────┴──► discord-bot
                          ├─ lectura  → reply({ ephemeral: ephemeralReplies })
                          ├─ escritura→ beginPendingWrite({ ttlMs: confirmTtlMinutes*60000 })
                          └─ /recomendar → limite ?? recommendLimit
```

Archivos:

- **Modificar**: `electron/main/services/prefs.js`, `electron/main/ipc/handlers.js`,
  `electron/main/services/discord-bot.js`,
  `mangacount.client/src/components/SettingsModal.jsx` (+ `.css`).
- **Tests**: `discord-bot.test.js`, `settings.test.js`/`handlers.test.js`, `SettingsModal.test.jsx`.

## Validation

- **Efímeras ON**: `/pendientes` (u otro comando de lectura) llama `reply` con `ephemeral: true`;
  **OFF** (default) → público. La confirmación de escritura sigue efímera en ambos casos.
- **TTL**: con `confirmTtlMinutes: 1`, el `pending` expira a los 60 s (test con reloj inyectable).
- **Recomendaciones**: `/recomendar` sin `limite` usa `recommendLimit`; con `limite` explícito lo respeta.
- **Validación**: `bot:config-set` rechaza `confirmTtlMinutes` 0/61 y `recommendLimit` 0/11.
- **UI**: los tres controles se cargan desde la config y viajan al guardar.
- **Gates**: `npm test`, `npm run test:coverage`, `npm run test:renderer:coverage`,
  `npm run lint:renderer`, `npm run build:renderer`.
