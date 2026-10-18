# Design: Recomendaciones dinámicas con AniList y feedback del usuario

## Approach

Agregar un provider `anilist` **antes** del motor local: el universo de candidatas deja de ser
`catalog.json` y pasa a ser el grafo de recomendaciones de AniList derivado de la colección del
usuario. El motor local (`recommendManga`) queda como **fallback** cuando AniList no responde.

Sobre eso, agregar el **feedback del usuario**, que es lo que hoy no existe: descartar ("No viable"),
vincular ("Ya lo tengo") y no repetir lo ya visto. El vínculo usa `MangaExternalRef`, que ya existe
para portadas: la misma fila sirve para excluir el título de futuras recomendaciones.

## Architecture

### Esquema — `electron/main/db/schema.sqlite.sql` (migración aditiva)

```sql
CREATE TABLE IF NOT EXISTS RecommendationDismissal (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    ProfileId INTEGER NOT NULL REFERENCES Profile(Id) ON DELETE CASCADE,
    Provider VARCHAR(32) NOT NULL,
    ExternalId VARCHAR(64) NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ProfileId, Provider, ExternalId)
);

CREATE TABLE IF NOT EXISTS RecommendationSeen (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    ProfileId INTEGER NOT NULL REFERENCES Profile(Id) ON DELETE CASCADE,
    Provider VARCHAR(32) NOT NULL,
    ExternalId VARCHAR(64) NOT NULL,
    SeenAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ProfileId, Provider, ExternalId)
);

CREATE INDEX IF NOT EXISTS IX_RecommendationDismissal_ProfileId ON RecommendationDismissal(ProfileId);
CREATE INDEX IF NOT EXISTS IX_RecommendationSeen_ProfileId ON RecommendationSeen(ProfileId);
```

Repos nuevos en `electron/main/db/repositories/recommendation-feedback.js`:
`dismiss(profileId, provider, externalId)`, `listDismissed(profileId)`, `clearDismissal(...)`,
`markSeen(profileId, provider, externalId)`, `listSeen(profileId, sinceIso)`, `pruneSeen(profileId,
beforeIso)`.

### Las tres memorias (semántica cerrada)

| Memoria | Tabla | Excluye | Duración |
|---|---|---|---|
| **No viable** | `RecommendationDismissal` | ese `externalId`, para siempre | hasta que el usuario lo revierta |
| **Ya lo tengo** | `MangaExternalRef` (ya existe) | ese manga, para siempre | permanente |
| **Ya visto** | `RecommendationSeen` | ese `externalId` | `seenTtlDays` (default 30), podado |

"Ya lo tengo" se evalúa por perfil: se excluye una recomendación si alguno de los **entries del
perfil** apunta a un manga cuyo `MangaExternalRef` coincide con el `externalId`. Así el vínculo es
metadato global del manga (sirve también para la portada) y la exclusión sigue siendo por perfil.

### Provider — `electron/main/services/anilist-recommendations.js` (nuevo)

```js
export async function getAnilistRecommendations(db, profileId, {
  limit = 10, seenTtlDays = 30, includeAdult = false,
  fetchImpl = fetch, timeoutMs = 12000, now = new Date(),
} = {}) { ... }   // => { provider: 'anilist', items, exhausted } | null
```

Pasos:

1. **Semillas** — mangas de los entries del perfil con `MangaExternalRef(provider='anilist')`. Los que
   no tengan vínculo se resuelven por búsqueda de título con `searchManga` de `covers.js`
   (`fallbackToMangaDex: false`); si tras eso no hay ninguna semilla resoluble → `return null`
   (fallback local). Tope de semillas (p. ej. 12, las más recientes) para acotar requests.
2. **Grafo** — para cada semilla, `Media(id) { recommendations(perPage: 25) { nodes { rating
   mediaRecommendation { id title {romaji english} genres tags {name rank} volumes coverImage {large}
   isAdult } } } }`, con concurrencia acotada (p. ej. 3) y `timeout`. Error/`429` en una semilla → se
   ignora esa semilla (no aborta el resto); si fallan todas → `return null`.
3. **Agregado** — por `mediaRecommendation.id`: `ratingTotal` (suma), `seedCount`, títulos de las
   semillas que la trajeron, unión de `genres` y `tags` (con `rank` máximo).
4. **Score** — `ratingScore` (log-dampen del `ratingTotal`, p. ej. `Math.log1p(ratingTotal)`) +
   `tagScore` (similitud coseno entre los tags/géneros de la candidata y el perfil de gustos que ya
   arma `buildUserTasteProfile`, reutilizado de `recommendationEngine.js`) + un bonus por `seedCount`.
   Se reutiliza `normalizeText`/`tokenizeText` de `shared/recommendations/normalize.js`.
5. **Filtro** — descartar si: está en `RecommendationDismissal` del perfil; pertenece a la colección
   del perfil (por `MangaExternalRef` **o** título normalizado coincidente con un manga del perfil);
   está en `RecommendationSeen` con `SeenAt` dentro de `seenTtlDays`; o es `isAdult` y el usuario no
   quiere contenido adulto.
6. **Relleno** — se pide un buffer (`limit * 3` candidatas ordenadas) y se devuelven las primeras
   `limit`. Las devueltas se marcan como **vistas** (`markSeen`) en el mismo paso. Si el buffer no
   alcanza para `limit`, se devuelve lo que haya y `exhausted: true`.
7. **Reason** — `"Porque tenés {semilla}"` (la semilla con mayor `rating` que trajo la candidata),
   traducido en la UI con i18n.

Cada item devuelto: `{ externalId, title, coverUrl, volumes, genres, score, reason }`.

**Relleno al descartar**: el renderer, tras `recommendation:dismiss`, llama a `recommendation:get`
con `limit: 1` para traer la siguiente candidata y reemplazar la tarjeta → la lista queda en 10 sin
que el usuario vea el salto.

### Cableado — `electron/main/ipc/handlers.js`

- `'recommendation:get'` pasa a: si `recommendations.enabled` → `getAnilistRecommendations(...)`; si
  devuelve `null` o `enabled: false` → `getRecommendations(db, profileId, limit)` (motor local, con el
  hook `providers` intacto).
- `'recommendation:dismiss'` → `{ profileId, provider, externalId }` → `dismiss(...)`; devuelve `{ ok: true }`.
- `'recommendation:own'` → `{ profileId, provider, externalId, mangaId?, title? }`:
  - con `mangaId`: crea/actualiza `MangaExternalRef(mangaId, provider, externalId)` (mismo camino que
    `cover:link`) y asegura que el perfil tenga el `Entry`;
  - sin `mangaId`: crea `Manga` (título = `title` que eligió el usuario, no el de AniList) + `Entry` +
    `MangaExternalRef`, y devuelve el manga creado.
  Devuelve el `manga` resultante (para refrescar la UI).
- `'recommendation:config-get'` / `'recommendation:config-set'` → `{ enabled, limit, seenTtlDays }`
  (valida `limit` 1–25 y `seenTtlDays` 1–365).

### UI — `mangacount.client/src/components/RecommendationModal.jsx`

- Cada tarjeta: botones **"Ya lo tengo"** y **"No viable"**.
  - "No viable" → `recommendation:dismiss` + `recommendation:get({ limit: 1 })` para rellenar.
  - "Ya lo tengo" → abre un picker (reusa `manga:list`) para elegir el manga propio; si no existe,
    ofrece crearlo con el nombre que el usuario escriba → `recommendation:own` + relleno.
- Cabecera: botón **↻** (`aria-label`) → `recommendation:get({ limit })` con un batch nuevo.
- Estado `exhausted` → mensaje "no hay más por ahora" y ↻ deshabilitado.
- Se mantiene el `provider` visible (`anilist` / `local`).

### i18n — `shared/i18n/en.js` y `es.js`

Claves nuevas en `rec.*` (es el mismo modal, sin colisión) para las acciones, el ↻, el picker y los
estados; y `settings.rec.*` para la sección de Settings. Paridad ES/EN obligatoria (`i18n.test.js`).

## Validation

- **Repos** (`recommendation-feedback.test.js`): dismiss/list/clear; markSeen/listSeen con `since`;
  pruneSeen; cascade al borrar el perfil.
- **Engine** (`anilist-recommendations.test.js`) con `fetchImpl` falso:
  - semillas con vínculo → grafo agregado y ordenado por score;
  - mismo `mediaRecommendation` en 2 semillas → suma rating y `seedCount`;
  - descartados / vistos (dentro del TTL) / ya en la colección / +18 → filtrados;
  - visto con `SeenAt` **fuera** del TTL → vuelve a aparecer;
  - fallo total de AniList → `null` (fallback local);
  - fallo de **una** semilla → el resto sigue;
  - buffer insuficiente → `exhausted: true` y menos de `limit` items.
- **Handlers** (`recommendations.test.js`): `enabled` → `provider: 'anilist'`; AniList caído → motor
  local; `recommendation:dismiss` persiste y la próxima `get` la excluye; `recommendation:own` con
  `mangaId` vincula y con `title` crea; validaciones de config.
- **Renderer** (`RecommendationModal.test.jsx`): "No viable" pide el relleno; ↻ pide batch nuevo;
  picker de "ya lo tengo"; estado `exhausted`.
- **Regresión**: tests existentes del motor local verdes.
- **Verificación manual**: `npm test`, `npm run test:renderer:coverage`, `npm run lint:renderer`,
  `npm run build:renderer`. Prueba funcional: con red → recomendaciones de AniList con "Porque tenés
  X"; descartar una y ver que entra otra (siguen 10); ↻ trae 10 nuevas; sin red → fallback local sin
  error visible.
