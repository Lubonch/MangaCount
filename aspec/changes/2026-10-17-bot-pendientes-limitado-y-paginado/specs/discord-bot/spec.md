## MODIFIED Requirements

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

- **WHEN** el usuario cambia el tamaño de página, las respuestas efímeras, el TTL o las recomendaciones por defecto y guarda
- **THEN** las preferencias quedan en `preferences.json` y el bot las aplica

#### Scenario: Valores fuera de rango

- **WHEN** el usuario guarda un valor numérico fuera del rango permitido
- **THEN** el sistema rechaza el guardado con un mensaje claro
