## MODIFIED Requirements

### Requirement: Comandos de consulta de la colección por Discord

The system SHALL exponer slash commands guild-scoped de lectura `/perfil`, `/buscar`, `/pendientes` y
`/recomendar`, apoyados en `handlers['profile:list']`, `handlers['entry:list']` y
`getRecommendations(db, profileId, limit)`. `/recomendar` SHALL **esperar (`await`)** el resultado de
`getRecommendations(...)` antes de inspeccionar `isConfident`/`inferredCountry`/`items`. `/pendientes`
SHALL detallar prioridad, `cantidad/total (faltan N)`, el campo `pending` (tomos no consecutivos),
formato y editorial, y SHALL respetar un **tope configurable** de series listadas (default **20**); con
el tope **desactivado** SHALL listar **todas** las series. Cuando la respuesta supere el límite de
longitud de un mensaje de Discord, el bot SHALL repartirla en **varios mensajes** (respuesta +
seguimientos) con indicador de continuación, sin cortar líneas por la mitad. `/recomendar`, cuando no
haya confianza de mercado, SHALL responder con el desglose (países detectados y cantidad de series sin
país) en vez de solo un mensaje genérico.

#### Scenario: Consultar la colección por Discord

- **WHEN** un usuario autorizado ejecuta `/buscar berserk`, `/pendientes` o `/recomendar`
- **THEN** el bot responde con los datos de la colección del perfil activo de ese usuario

#### Scenario: Recomendar devuelve resultados cuando el mercado es confiable

- **WHEN** el usuario ejecuta `/recomendar` con una colección cuyo mercado sí se infiere
- **THEN** el bot espera el resultado de `getRecommendations(...)` y responde con las recomendaciones (no con el mensaje de "sin confianza")

#### Scenario: Pendientes con detalle

- **WHEN** el usuario ejecuta `/pendientes`
- **THEN** cada serie incluye prioridad, `cantidad/total (faltan N)`, el campo `pending` cuando exista, formato y editorial

#### Scenario: Pendientes con el tope activo

- **WHEN** el usuario ejecuta `/pendientes` con el tope activo y hay más series que el máximo configurado
- **THEN** el bot lista hasta el máximo y aclara cuántas series más hay

#### Scenario: Pendientes con el tope desactivado

- **WHEN** el usuario ejecuta `/pendientes` con el tope desactivado y hay más series de las que entran en un mensaje
- **THEN** el bot envía la lista **completa** repartida en varios mensajes, sin el recorte "…y N series más"

#### Scenario: Recomendación sin confianza muestra el desglose

- **WHEN** el usuario ejecuta `/recomendar` y el mercado no se puede inferir con confianza
- **THEN** el bot responde con el desglose (países detectados con series/volúmenes y cuántas series quedaron sin país) y qué cargar

### Requirement: Configuración y token seguro del bot

The system SHALL guardar la configuración del bot en `userData` (`bot.enabled`, `bot.guildId`,
`bot.allowedUserIds`, `bot.pendingLimitEnabled`, `bot.pendingLimit`) y el token de Discord cifrado con
`safeStorage`; el token NUNCA SHALL persistirse en texto plano ni en archivos rastreados. El límite de
`/pendientes` SHALL tener por defecto el tope activo en **20** series y SHALL aceptar solo valores
enteros entre **1 y 500** cuando está activo.

#### Scenario: Guardar el token

- **WHEN** el usuario carga el token en los ajustes
- **THEN** se persiste cifrado con `safeStorage` y no queda en claro en `preferences.json`

#### Scenario: Persistir el límite de /pendientes

- **WHEN** el usuario cambia el tope o la cantidad máxima en Settings y guarda
- **THEN** la preferencia queda en `preferences.json` y el bot la aplica en el siguiente `/pendientes`

#### Scenario: Cantidad inválida

- **WHEN** el usuario guarda una cantidad fuera del rango 1–500 (o no entera)
- **THEN** el sistema rechaza el guardado con un mensaje claro
