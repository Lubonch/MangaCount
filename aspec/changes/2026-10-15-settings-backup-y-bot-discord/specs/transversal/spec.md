## MODIFIED Requirements

### Requirement: Logging diario backend y bot

The system SHALL escribir logs diarios y rotarlos al cambiar el día solo si el archivo actual tiene
contenido; en desktop los logs van a `<userData>/logs/` con la misma política de rotación diaria. El
log del bot de Discord también va a `<userData>/logs/` con esa política, porque el bot corre dentro
del proceso main; el bot de WhatsApp se retira.

#### Scenario: Logging local de la app desktop y del bot de Discord

- **WHEN** la app desktop o el bot de Discord escriben logs
- **THEN** los guardan en `<userData>/logs/` con rotación diaria y la misma política (rotar solo si hay contenido)

### Requirement: Configuración sin secretos en frontend

The system SHALL configurar la app desktop con almacenamiento local (JSON en `userData`, más
localStorage para tema y perfil activo), sin `appsettings*.json`, connection strings,
`deployment/deploy.sh` ni schema PostgreSQL. La configuración del bot de Discord (`startInTray`,
`bot.enabled`, `bot.guildId`, `bot.allowedUserIds`) SHALL vivir en `userData` y el token de Discord
SHALL cifrarse con `safeStorage`, nunca en texto plano. Esta configuración SÍ se incluye con la app
empaquetada.

#### Scenario: Configuración 100% local sin servidor

- **WHEN** la app desktop necesita configuración o preferencias, incluida la del bot
- **THEN** usa almacenamiento local en `userData` (con el token cifrado con `safeStorage`) y no existen `appsettings*.json`, connection strings, `deployment/deploy.sh` ni schema PostgreSQL
