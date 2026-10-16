## ADDED Requirements

### Requirement: Bot de Discord embebido en el proceso main

The system SHALL ejecutar el bot de Discord dentro del proceso main de Electron, iniciándose y
deteniéndose junto con la app, reutilizando la misma conexión SQLite (`openDb`) y los handlers IPC
puros `(ctx = { db })`, sin abrir una segunda conexión ni un segundo escritor.

#### Scenario: Arranque del bot con la app

- **WHEN** la app arranca con el bot habilitado y token configurado
- **THEN** el cliente de Discord se inicia sobre la conexión `db` existente

#### Scenario: Parada del bot con la app

- **WHEN** la app se cierra desde el ítem *Salir* del tray
- **THEN** el bot se detiene y la conexión `db` se cierra

### Requirement: Comandos de consulta de la colección por Discord

The system SHALL exponer slash commands guild-scoped `/perfil`, `/buscar`, `/pendientes` y
`/recomendar`, de solo lectura, apoyados en `handlers['profile:list']`, `handlers['entry:list']` y
`getRecommendations(db, profileId, limit)`.

#### Scenario: Consultar la colección por Discord

- **WHEN** un usuario autorizado ejecuta `/buscar berserk`, `/pendientes` o `/recomendar`
- **THEN** el bot responde con los datos de la colección del perfil activo de ese usuario

#### Scenario: Solo lectura

- **WHEN** se ejecuta cualquier comando disponible
- **THEN** no se produce ninguna escritura en la base, porque el comando de escritura `actualizar` no está expuesto

### Requirement: Autorización por identidades de Discord

The system SHALL ignorar las interacciones de guilds o usuarios fuera de `bot.guildId` y
`bot.allowedUserIds`; con allowlist vacía no responde a nadie.

#### Scenario: Interacción no autorizada

- **WHEN** un usuario o guild fuera de la allowlist invoca un comando
- **THEN** el bot no responde

### Requirement: Sesión por usuario de Discord

The system SHALL recordar el perfil activo por usuario de Discord (clave = user ID), en reemplazo
de la sesión por número de teléfono del bot de WhatsApp.

#### Scenario: Cambiar de perfil

- **WHEN** un usuario ejecuta `/perfil` y elige un perfil
- **THEN** los comandos siguientes de ese usuario usan ese perfil hasta que lo cambie

### Requirement: Configuración y token seguro del bot

The system SHALL guardar la configuración del bot en `userData` (`bot.enabled`, `bot.guildId`,
`bot.allowedUserIds`) y el token de Discord cifrado con `safeStorage`; el token NUNCA SHALL
persistirse en texto plano ni en archivos rastreados.

#### Scenario: Guardar el token

- **WHEN** el usuario carga el token en los ajustes
- **THEN** se persiste cifrado con `safeStorage` y no queda en claro en `preferences.json`

### Requirement: Degradación del bot sin token o sin red

The system SHALL arrancar la app normalmente aunque falte el token, sea inválido o no haya red; el
bot queda apagado o desconectado, su estado se refleja en el tray, y la app no se rompe.

#### Scenario: Arranque sin token

- **WHEN** la app arranca sin token configurado o sin conexión
- **THEN** no se inicia el cliente de Discord y la app funciona normalmente

### Requirement: Registro de comandos preparado para escritura futura

The system SHALL despachar los comandos mediante un registro nombre → función, de modo que agregar
un comando de escritura (por ejemplo `actualizar` sobre `entry:upsert`) no requiera transporte, API
ni sincronización nuevos.

#### Scenario: Extensión futura con `actualizar`

- **WHEN** se agrega `actualizar` al registro de comandos
- **THEN** usa la misma conexión `db` y no se introduce infraestructura nueva
