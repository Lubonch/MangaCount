## REMOVED Requirements

### Requirement: Whitelist de remitentes del bot

**Reason**: El bot de WhatsApp se retira del proyecto; era cliente HTTP de la API .NET/PostgreSQL
eliminada en 1.0.1 (`MANGA_API_URL=http://localhost:3000/api`) y dependía de `whatsapp-web.js`, una
librería no oficial.

**Migration**: La autorización pasa a identidades de Discord (guild/user IDs) en la capability
`discord-bot` (`bot.guildId`, `bot.allowedUserIds`).

### Requirement: Comandos de colección vía WhatsApp

**Reason**: El bot de WhatsApp se retira del proyecto y su transporte (`api.js` → `MANGA_API_URL`)
ya no existe.

**Migration**: Los comandos de consulta se reimplementan como slash commands de Discord embebidos
en el proceso main (`discord-bot`), reusando la misma conexión SQLite y los handlers IPC. El comando
de escritura `actualizar` queda diferido.
