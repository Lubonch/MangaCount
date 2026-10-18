
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
`getRecommendations(...)` antes de inspeccionar `isConfident`/`inferredCountry`/`items`, y SHALL usar
como cantidad por defecto el valor configurado (`bot.recommendLimit`, default 5) cuando no se pase
`limite`. Los comandos de **lectura** SHALL responder de forma **efímera** (solo el usuario) cuando la
preferencia `bot.ephemeralReplies` esté activa. `/pendientes` SHALL detallar prioridad,
`cantidad/total (faltan N)`, el campo `pending` (tomos no consecutivos), formato y editorial, y SHALL
**paginar** el listado completo con botones (`Anterior`/`Siguiente`) usando como tamaño de página el
valor configurado (`bot.pendingLimit`, default **20**); con el tope desactivado SHALL mostrar todas las
series en una sola página. La página SHALL indicar `Página X de Y (Total: N series)`, los botones SHALL
deshabilitarse en los extremos, SHALL poder usarlos solo quien ejecutó el comando o alguien de la
allowlist, y SHALL expirar sin romper el bot. Cuando **otra** respuesta supere el límite de longitud de
un mensaje de Discord, el bot SHALL repartirla en varios mensajes con indicador de continuación, sin
cortar líneas por la mitad. `/recomendar`, cuando no haya confianza de mercado, SHALL responder con el
desglose (países detectados y cantidad de series sin país) en vez de solo un mensaje genérico.

#### Scenario: Consultar la colección por Discord

- **WHEN** un usuario autorizado ejecuta `/buscar berserk`, `/pendientes` o `/recomendar`
- **THEN** el bot responde con los datos de la colección del perfil activo de ese usuario

#### Scenario: Recomendar devuelve resultados cuando el mercado es confiable

- **WHEN** el usuario ejecuta `/recomendar` con una colección cuyo mercado sí se infiere
- **THEN** el bot espera el resultado de `getRecommendations(...)` y responde con las recomendaciones (no con el mensaje de "sin confianza")

#### Scenario: Pendientes con detalle

- **WHEN** el usuario ejecuta `/pendientes`
- **THEN** cada serie incluye prioridad, `cantidad/total (faltan N)`, el campo `pending` cuando exista, formato y editorial

#### Scenario: Pendientes paginados

- **WHEN** el usuario ejecuta `/pendientes` y hay más series que el tamaño de página
- **THEN** el bot muestra la primera página con `Página X de Y (Total: N series)` y los botones `Anterior`/`Siguiente`, con `Anterior` deshabilitado en la primera página

#### Scenario: Navegar entre páginas

- **WHEN** el usuario que ejecutó `/pendientes` pulsa `Siguiente`
- **THEN** el mensaje se actualiza a la página siguiente y `Siguiente` se deshabilita en la última página

#### Scenario: Paginación no autorizada o expirada

- **WHEN** otro usuario (fuera de la allowlist) pulsa los botones, o la paginación expiró
- **THEN** el bot no cambia de página y, si expiró, avisa que hay que volver a ejecutar el comando

#### Scenario: Pendientes con el tope desactivado

- **WHEN** el usuario ejecuta `/pendientes` con el tope desactivado
- **THEN** el bot muestra todas las series en una sola página, sin el recorte "…y N series más"

#### Scenario: Respuestas de lectura efímeras

- **WHEN** la preferencia de respuestas efímeras está activa y el usuario ejecuta un comando de lectura
- **THEN** la respuesta llega solo al usuario (efímera) y no queda visible en el canal

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
`bot.allowedUserIds`, `bot.pendingLimitEnabled`, `bot.pendingLimit`, `bot.ephemeralReplies`,
`bot.confirmTtlMinutes`, `bot.recommendLimit`) y el token de Discord cifrado con `safeStorage`; el token
NUNCA SHALL persistirse en texto plano ni en archivos rastreados. Los valores numéricos SHALL validarse
por rango: `pendingLimit` 1–500, `confirmTtlMinutes` 1–60 y `recommendLimit` 1–10.

#### Scenario: Guardar el token

- **WHEN** el usuario carga el token en los ajustes
- **THEN** se persiste cifrado con `safeStorage` y no queda en claro en `preferences.json`

#### Scenario: Persistir los ajustes del bot

- **WHEN** el usuario cambia el límite de `/pendientes`, las respuestas efímeras, el TTL o las recomendaciones por defecto y guarda
- **THEN** las preferencias quedan en `preferences.json` y el bot las aplica

#### Scenario: Valores fuera de rango

- **WHEN** el usuario guarda un valor numérico fuera del rango permitido
- **THEN** el sistema rechaza el guardado con un mensaje claro

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
**confirmación explícita** por botones efímeros y SHALL aplicarse solo si el título resuelve a una
**única** entry (ante 0 o múltiples coincidencias NO SHALL escribir). La confirmación SHALL expirar
según el TTL configurado (`bot.confirmTtlMinutes`, default 5, rango 1–60) y las respuestas de escritura
SHALL ser **efímeras** siempre, independientemente de la preferencia de respuestas efímeras de lectura.
`/nuevo` SHALL crear el **Manga** (con `total` opcional, formato y editorial, `Unknown` si faltan) **y**
un **Entry** con `quantity` 0 por defecto (o la `cantidad` indicada), sin duplicar un Manga existente
del mismo nombre.

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

#### Scenario: Expiración según el TTL configurado

- **WHEN** el TTL está configurado en 1 minuto y el usuario no confirma dentro de ese minuto
- **THEN** la confirmación expira y no se escribe nada

### Requirement: Ayuda de comandos del bot

The system SHALL exponer `/ayuda`, que lista los comandos disponibles (lectura y escritura) con una
descripción breve.

#### Scenario: Ver la ayuda

- **WHEN** el usuario ejecuta `/ayuda`
- **THEN** el bot responde con la lista de comandos disponibles y qué hace cada uno


### Requirement: Autocomplete del parámetro de serie

The system SHALL ofrecer **autocomplete** en el parámetro de serie de los comandos del bot que lo usan,
respondiendo a las interacciones de autocomplete con hasta 25 títulos de la biblioteca del perfil activo
que coincidan con el texto tipeado, sin bloquear ni fallar cuando no haya perfil o coincidencias.

#### Scenario: Sugerencias al tipear

- **WHEN** el usuario empieza a tipear el título de una serie en un comando que lo acepta
- **THEN** el bot ofrece hasta 25 títulos de su biblioteca que coinciden, priorizando los que empiezan con el texto

#### Scenario: Sin coincidencias o sin perfil

- **WHEN** el texto no coincide con ninguna serie o no hay perfil activo
- **THEN** el bot responde con una lista vacía de sugerencias y no muestra error


### Requirement: Botones de acción rápida en `/buscar`

The system SHALL mostrar botones de acción rápida en el resultado de `/buscar` cuando el título resuelve
a una **única** entry y el usuario está autorizado: `[+1 Tomo]`, `[⭐ Prioridad]` y `[📝 Editar Pending]`.
Cada botón SHALL aplicar la acción correspondiente y actualizar el mensaje; con 0 o múltiples
coincidencias NO SHALL mostrar botones.

#### Scenario: Acciones rápidas con coincidencia única

- **WHEN** `/buscar` resuelve a una única serie y el usuario está en la allowlist
- **THEN** el bot muestra los botones `[+1 Tomo]`, `[⭐ Prioridad]` y `[📝 Editar Pending]`

#### Scenario: Sumar un tomo desde el resultado

- **WHEN** el usuario pulsa `[+1 Tomo]` y confirma
- **THEN** el bot incrementa la cantidad y el mensaje queda actualizado

#### Scenario: Alternar prioridad

- **WHEN** el usuario pulsa `[⭐ Prioridad]`
- **THEN** el bot alterna la prioridad de la serie y actualiza el mensaje

#### Scenario: Sin coincidencia única

- **WHEN** `/buscar` no encuentra la serie o encuentra varias
- **THEN** el bot responde con el texto de desambiguación y no muestra botones de acción


### Requirement: Filtros rápidos de pendientes

The system SHALL exponer los comandos de consulta `/huecos` (series con `pending` no vacío, mostrando la
nota) y `/a-punto` (series con total conocido a las que les faltan 1 o 2 tomos), paginados como los
listados largos y disponibles para usuarios autorizados.

#### Scenario: Series con huecos

- **WHEN** el usuario ejecuta `/huecos`
- **THEN** el bot lista solo las series cuyo `pending` no está vacío, mostrando la nota de cada una

#### Scenario: Series a punto de completarse

- **WHEN** el usuario ejecuta `/a-punto`
- **THEN** el bot lista solo las series con `total > 0`, `cantidad < total` y faltante de 1 o 2 tomos

#### Scenario: Lista larga

- **WHEN** el resultado de `/huecos` o `/a-punto` supera el tamaño de página
- **THEN** el bot lo pagina (o lo reparte en varios mensajes) sin truncarlo


### Requirement: Edición del pending por modal y atajo al sumar tomo

The system SHALL permitir editar el campo `pending` (texto libre) mediante un **Modal de Discord
precargado** con el valor actual, y SHALL ofrecer desde la confirmación de `/tomo`, cuando la entry tiene
`pending` no vacío, un atajo que aplique el `+1` y abra ese Modal. Un envío vacío SHALL limpiar el
`pending`. El modal SHALL respetar la allowlist.

#### Scenario: Editar el pending con modal precargado

- **WHEN** el usuario ejecuta `/pending <serie>` sin un texto nuevo
- **THEN** el bot abre un Modal con el `pending` actual precargado y, al enviarlo, guarda el texto ingresado

#### Scenario: Limpiar el pending

- **WHEN** el usuario envía el Modal con el campo vacío
- **THEN** el `pending` de la serie queda vacío (`null`)

#### Scenario: Sumar un tomo y editar la nota

- **WHEN** el usuario confirma `/tomo <serie>` en una serie con `pending` no vacío y elige el atajo
- **THEN** el bot aplica el `+1` y abre el Modal con la nota actual


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
