## ADDED Requirements

### Requirement: Recomendaciones dinámicas desde el grafo de AniList

The system SHALL obtener candidatas de recomendación desde el grafo de recomendaciones de AniList a
partir de las obras de la colección del perfil (semillas), agregando el `rating` colaborativo y
puntuando las candidatas por su similitud temática con el perfil de gustos. El sistema SHALL identificar
cada candidata por su `ExternalId` de AniList y SHALL incluir una portada y una razón que nombre la
semilla que la trajo.

#### Scenario: Recomendaciones derivadas de la colección

- **WHEN** el perfil tiene obras vinculadas a AniList y la fuente responde
- **THEN** `recommendation:get` devuelve hasta `limit` candidatas con `provider: 'anilist'`, ordenadas
  por `rating` agregado más similitud, cada una con su portada y su razón ("Porque tenés {semilla}")

#### Scenario: Una candidata recomendada por varias semillas sube de posición

- **WHEN** el mismo título es recomendado por dos o más semillas distintas
- **THEN** sus ratings se suman y su posición mejora respecto de una candidata con una sola semilla

### Requirement: Feedback del usuario sobre las recomendaciones

The system SHALL permitir marcar una recomendación como **"No viable"** (descarte persistente por
perfil) y como **"Ya lo tengo"** (vínculo con un manga propio). El descarte NO SHALL volver a
recomendarse para ese perfil. "Ya lo tengo" SHALL vincular la obra a un manga existente del usuario o
crear uno nuevo con el nombre que el usuario indique, y NO SHALL volver a recomendarse.

#### Scenario: Descartar una recomendación

- **WHEN** el usuario marca una recomendación como "No viable"
- **THEN** se registra el descarte para ese perfil y esa obra no vuelve a aparecer en recomendaciones
  posteriores

#### Scenario: "Ya lo tengo" con título distinto al registrado

- **WHEN** el usuario marca una recomendación como "Ya lo tengo" y elige (o crea) el manga
  correspondiente en su colección
- **THEN** se guarda el vínculo externo de ese manga y la obra no vuelve a recomendarse, aunque el
  nombre local difiera del nombre en AniList

#### Scenario: Auto-match por título

- **WHEN** una candidata coincide por título normalizado con un manga de la colección del perfil
- **THEN** se considera ya poseída y no se muestra

### Requirement: Lista de diez con relleno y refresco

The system SHALL mostrar hasta `limit` recomendaciones (default 10) y SHALL rellenar la lista cuando el
usuario descarta o marca una tarjeta, de modo que se sigan viendo `limit` mientras haya candidatas. El
sistema SHALL ofrecer un control de refresco que devuelva un lote nuevo sin repetir lo ya visto, y SHALL
indicar cuando no haya más candidatas disponibles.

#### Scenario: Relleno tras descartar

- **WHEN** el usuario descarta una recomendación de una lista de diez y hay más candidatas
- **THEN** entra la siguiente candidata y la lista sigue mostrando diez

#### Scenario: Refresco sin repetir

- **WHEN** el usuario pulsa refrescar
- **THEN** se devuelven hasta `limit` candidatas nuevas que excluyen lo ya visto, lo descartado y lo
  que ya está en la colección

#### Scenario: Sin más candidatas

- **WHEN** no quedan candidatas que pasen los filtros
- **THEN** el sistema devuelve las que haya con la marca de agotado y la UI lo indica deshabilitando el
  refresco

### Requirement: Memoria de lo ya visto con vencimiento

The system SHALL recordar las recomendaciones ya mostradas a un perfil durante un período configurable
(`seenTtlDays`, default 30) para no repetirlas, y SHALL volver a permitirlas una vez vencido el período
si el usuario no las marcó como "No viable" ni como "Ya lo tengo".

#### Scenario: No repetir lo visto dentro del período

- **WHEN** el usuario refresca dentro de `seenTtlDays` desde que se mostró una candidata
- **THEN** esa candidata no vuelve a aparecer

#### Scenario: Lo visto vuelve tras vencer el período

- **WHEN** una candidata se mostró hace más de `seenTtlDays` y el usuario no la marcó
- **THEN** puede volver a recomendarse

### Requirement: Fallback local obligatorio ante fallo de AniList

The system SHALL mantener el motor local de recomendaciones como respuesta cuando la fuente dinámica
esté deshabilitada, no haya semillas resolubles, o AniList no responda (sin red, timeout, error HTTP o
rate limit). El error NO SHALL propagarse al consumidor.

#### Scenario: AniList no disponible

- **WHEN** AniList no responde o falla para todas las semillas
- **THEN** la respuesta es la del motor local con `provider: 'local'` y sin error visible

#### Scenario: Fallo parcial de semillas

- **WHEN** falla la consulta de una semilla pero otras responden
- **THEN** las recomendaciones se arman con las semillas que sí respondieron
