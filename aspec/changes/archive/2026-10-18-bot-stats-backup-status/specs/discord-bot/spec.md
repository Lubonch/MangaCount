## ADDED Requirements

### Requirement: Comandos de estadísticas y mantenimiento del bot

The system SHALL exponer, solo para usuarios autorizados, `/stats` (resumen del perfil en un Embed),
`/backup` (backup manual **con confirmación por botones**, ejecutado sin bloquear la interacción) y
`/status` (versión de la app, estado de la base y último backup, **sin** exponer tokens ni rutas
sensibles).

#### Scenario: Estadísticas del perfil

- **WHEN** el usuario autorizado ejecuta `/stats`
- **THEN** el bot responde un Embed con el total de tomos, series completas/abiertas y la distribución por formato y editoriales/países principales

#### Scenario: Backup con confirmación

- **WHEN** el usuario ejecuta `/backup`
- **THEN** el bot pide confirmación por botones y, al confirmar, ejecuta el backup y reporta el resultado; al cancelar, no ejecuta nada

#### Scenario: Estado sin datos sensibles

- **WHEN** el usuario ejecuta `/status`
- **THEN** el bot responde versión, estado de la base y fecha del último backup, sin token, guild ni rutas del sistema
