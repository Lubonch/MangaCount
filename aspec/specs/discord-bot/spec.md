
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

The system SHALL exponer slash commands guild-scoped de lectura `/perfil`, `/buscar`, `/pendientes` y
`/recomendar`, apoyados en `handlers['profile:list']`, `handlers['entry:list']` y
`getRecommendations(db, profileId, limit)`. `/recomendar` SHALL **esperar (`await`)** el resultado de
`getRecommendations(...)` antes de inspeccionar `isConfident`/`inferredCountry`/`items`. `/pendientes`
SHALL detallar prioridad, `cantidad/total (faltan N)`, el campo `pending` (tomos no consecutivos),
formato y editorial, y SHALL acotar la salida al límite de longitud de mensajes de Discord.
`/recomendar`, cuando no haya confianza de mercado, SHALL responder con el desglose (países detectados
y cantidad de series sin país) en vez de solo un mensaje genérico.

#### Scenario: Consultar la colección por Discord

- **WHEN** un usuario autorizado ejecuta `/buscar berserk`, `/pendientes` o `/recomendar`
- **THEN** el bot responde con los datos de la colección del perfil activo de ese usuario

#### Scenario: Recomendar devuelve resultados cuando el mercado es confiable

- **WHEN** el usuario ejecuta `/recomendar` con una colección cuyo mercado sí se infiere
- **THEN** el bot espera el resultado de `getRecommendations(...)` y responde con las recomendaciones (no con el mensaje de "sin confianza")

#### Scenario: Pendientes con detalle

- **WHEN** el usuario ejecuta `/pendientes`
- **THEN** cada serie incluye prioridad, `cantidad/total (faltan N)`, el campo `pending` cuando exista, formato y editorial

#### Scenario: Recomendación sin confianza muestra el desglose

- **WHEN** el usuario ejecuta `/recomendar` y el mercado no se puede inferir con confianza
- **THEN** el bot responde con el desglose (países detectados con series/volúmenes y cuántas series quedaron sin país) y qué cargar

### Requirement: Autorización por identidades de Discord

The system SHALL ignorar las interacciones de guilds o usuarios fuera de `bot.guildId` y
`bot.allowedUserIds`; con allowlist vacía no responde a nadie.

#### Scenario: Interacción no autorizada

- **WHEN** un usuario o guild fuera de la allowlist invoca un comando
- **THEN** el bot no responde

### Requirement: Sesión por usuario de Discord

The system SHALL recordar el perfil activo por usuario de Discord (clave = user ID) y SHALL validar
que ese perfil siga existiendo antes de operar; si no existe, SHALL responder pidiendo elegir el
perfil con `/perfil` (o auto-seleccionar si hay un único perfil), sin operar sobre un perfil
inexistente.

#### Scenario: Cambiar de perfil

- **WHEN** un usuario ejecuta `/perfil` y elige un perfil
- **THEN** los comandos siguientes de ese usuario usan ese perfil hasta que lo cambie

#### Scenario: Perfil de sesión inválido

- **WHEN** el perfil recordado por el usuario ya no existe (por ejemplo tras una Nuclear Option o un restore)
- **THEN** el bot responde pidiendo elegir el perfil con `/perfil` (o auto-selecciona si hay uno solo) y no opera con el id viejo

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

### Requirement: Comandos de escritura de la colección por Discord

The system SHALL exponer slash commands guild-scoped de escritura `/tomo`, `/actualizar`, `/pending`,
`/prioridad` y `/nuevo` (más `/ayuda`), reutilizando `handlers['entry:upsert']` y
`handlers['manga:upsert']` sobre la misma conexión SQLite. Las escrituras SHALL requerir
**confirmación explícita** y SHALL aplicarse solo si el título resuelve a una **única** entry (ante 0
o múltiples coincidencias NO SHALL escribir). `/nuevo` SHALL crear el **Manga** (con `total` opcional,
formato y editorial, `Unknown` si faltan) **y** un **Entry** con `quantity` 0 por defecto (o la
`cantidad` indicada), sin duplicar un Manga existente del mismo nombre.

#### Scenario: Sumar un tomo

- **WHEN** el usuario confirma `/tomo titulo:Berserk` y el título resuelve a una única entry
- **THEN** el bot incrementa `quantity` en 1 vía `entry:upsert` y responde con el cambio (`40 → 41`)

#### Scenario: Crear manga y entry

- **WHEN** el usuario confirma `/nuevo titulo:Dandadan total:0`
- **THEN** el bot crea el Manga y un Entry con `quantity` 0 en el perfil activo, y la serie queda visible en `/pendientes` y `/buscar`

#### Scenario: Título ambiguo o inexistente

- **WHEN** el título del comando coincide con 0 o con más de una entry de la colección
- **THEN** el bot no escribe y responde con las sugerencias o la lista de coincidencias para desambiguar

#### Scenario: Sin confirmación no escribe

- **WHEN** el usuario no confirma la operación (cancela o deja expirar el `pending`)
- **THEN** no se produce ninguna escritura en la base

### Requirement: Ayuda de comandos del bot

The system SHALL exponer `/ayuda`, que lista los comandos disponibles (lectura y escritura) con una
descripción breve.

#### Scenario: Ver la ayuda

- **WHEN** el usuario ejecuta `/ayuda`
- **THEN** el bot responde con la lista de comandos disponibles y qué hace cada uno
