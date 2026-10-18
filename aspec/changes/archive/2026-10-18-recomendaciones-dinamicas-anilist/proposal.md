# Proposal: Recomendaciones dinámicas con AniList y feedback del usuario

## Problem

El recomendador actual (`shared/recommendations/recommendationEngine.js`) es puramente léxico y corre
sobre un **catálogo fijo de 26 títulos** (`shared/recommendations/catalog.json`: 16 Argentina, 10
España). Recomendar hoy = rankear esos 26. Consecuencias:

- Si el mercado inferido no es AR/ES, no hay candidatas.
- Los géneros/temas sólo cuentan para tomos que estén en ese catálogo; el resto aporta apenas
  título/editorial/formato.
- Las "razones" son tokens compartidos, no una explicación.
- El resultado es estático: siempre las mismas recomendaciones, y no hay forma de descartar lo que no
  interesa ni de decir "ya lo tengo" cuando el título local difiere del de la fuente.

Se evaluó (y descartó) un reranking con LLM (#127): requería tener `opencode serve` corriendo y no
ampliaba el universo de candidatas (el motor local seguía eligiendo entre las mismas 26).

**La app ya integra AniList** (`electron/main/services/covers.js:20-21`, GraphQL, sin API key) y ya
tiene la tabla de vínculo `MangaExternalRef(MangaId, Provider, ExternalId, CoverFile, IsAdult)`. AniList
expone un **grafo de recomendaciones colaborativas** (`Media.recommendations { nodes { rating
mediaRecommendation { … } } }`) más `tags { name rank }`. Verificado en vivo con "Monster" → Adolf ni
Tsugu, 20th Century Boys, PLUTO, Kirihito Sanka, The World Is Mine, MW. Es un recomendador dinámico
real, gratis y sin key.

## Proposed change

- **Fuente dinámica**: obtener candidatas de AniList a partir de la colección del usuario (semillas),
  agregar el grafo de recomendaciones y puntuar combinando el `rating` colaborativo con la similitud de
  tags/géneros del motor actual.
- **Feedback del usuario** (lo que falta hoy): por cada recomendación, **"Ya lo tengo"** (vincula con un
  manga propio vía `MangaExternalRef`) y **"No viable"** (descarte permanente). Con *auto-match* por
  título normalizado y confirmación manual para el resto.
- **Lista de 10 con relleno**: al descartar una tarjeta entra la siguiente candidata, así siempre se
  ven 10. Botón **↻** para pedir 10 nuevas.
- **Tres memorias** (ver Design): descarte permanente, "ya lo tengo" permanente, y "ya visto" con TTL
  persistido (para no repetir lo que el usuario ya revisó aunque no lo haya marcado).
- **Fallback**: si AniList no responde (sin red, rate limit, timeout), se usa el motor local actual
  (`catalog.json`) con `provider: 'local'`.

## Scope

**In scope**

- Provider `anilist` de recomendaciones (semillas → grafo → agregado → score) y su cableado en
  `recommendation:get`, con fallback al motor local.
- Tablas nuevas `RecommendationDismissal` y `RecommendationSeen` (migración aditiva, `ON DELETE
  CASCADE` por perfil) + sus repositorios.
- Canales IPC `recommendation:dismiss` y `recommendation:own` (vincular a un manga propio o crear uno).
- UI en `RecommendationModal`: acciones por tarjeta, botón ↻, estado "no hay más por ahora", picker de
  "ya lo tengo" reusando `manga:list`.
- Config en Settings (`settings.rec.*`): `enabled`, `limit` (default 10), `seenTtlDays` (default 30).
- i18n ES/EN (paridad) y tests de unidad.

**Out of scope**

- Reranking con LLM (#127): se descarta; AniList cubre el caso sin costo ni dependencias.
- Collaborative filtering entre usuarios de MangaCount (no hay backend compartido).
- Filtro de "comprable en tu mercado": AniList es global y no sabe qué editorial local publicó cada
  título; ese juicio lo aporta el usuario con "No viable".
- Nuevas fuentes además de AniList (MangaDex se usa sólo para portadas, como hoy).
- Edición masiva de la colección desde la lista de recomendaciones.

## Risks

- **Rate limit de AniList** (~90 req/min, 30 en degradado): se resuelve con buffer y concurrencia
  acotada, cache en memoria y `timeout`; ante `429`/error → fallback local (nunca rompe la UI).
- **Semillas sin vínculo**: los mangas sin `MangaExternalRef` se resuelven por búsqueda de título (con
  el mismo riesgo de nombre que ya asume `covers.js`); si no se resuelve ninguna semilla → fallback
  local.
- **+18**: AniList devuelve contenido adulto; se filtra con la preferencia de contenido adulto ya
  existente (`showAdultCovers`), igual que `covers.js` con `includeAdult`.
- **Crecimiento de `RecommendationSeen`**: la tabla se poda por TTL (y `ON DELETE CASCADE` al borrar el
  perfil).
- **Cambio de comportamiento de red**: por defecto `enabled: true` implica una llamada a AniList al
  abrir recomendaciones; degrada a local sin conexión.
- **Regresión**: los tests existentes del motor local y de `recommendation:get` deben seguir verdes.
