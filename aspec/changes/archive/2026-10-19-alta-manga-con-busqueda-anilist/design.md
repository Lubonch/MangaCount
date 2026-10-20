# Design: Alta de manga buscando el título en AniList

## Approach

Reutilizar el pipeline de portadas ya existente (`searchManga` + `linkCover`) y agregar **un único
canal nuevo** que combine la creación del manga con el vínculo de portada, para que elegir un candidato
deje el manga creado **con** portada y referencia externa en un solo paso. El modal de alta gana un
buscador, pero el **camino manual queda intacto**: sin candidato seleccionado, el submit sigue siendo
`manga:upsert` como hoy.

La clave es que `linkCover` ya crea el `MangaExternalRef` con `provider`/`externalId`, cachea la imagen
y promueve `Manga.IsAdult`: no hace falta ningún camino nuevo para el vínculo ni cambios de esquema.

## Architecture

### Reuso (sin cambios)

- `electron/main/services/covers.js`:
  - `searchManga(query, { includeAdult })` — AniList con fallback MangaDex, backoff por `Retry-After`.
  - `linkCover(db, dataDir, { mangaId, candidate })` — descarga + valida (content-type, magic bytes,
    tamaño), guarda en `<userData>/covers/<mangaId>.<ext>`, `upsertRef` y promueve `Manga.IsAdult`.
  - `normalizeTitle(title)` — para el aviso de duplicado.
- `cover:search` ya aplica `includeAdult = showAdultCovers` (preferencia existente).
- `MangaExternalRef(MangaId, Provider, ExternalId, CoverFile, IsAdult)` — el vínculo que deja el alta
  sirve también para "ya lo tengo" de recomendaciones.

### Canal nuevo — `electron/main/ipc/handlers.js`

```js
'manga:create-from-candidate': ({ db, dataDir }, { candidate, name, volumes, formatId, publisherId, isAdult } = {}) => { … }
```

Pasos:

1. Validar `candidate?.id` (candidato inválido → error) y `name` no vacío (o `candidate.title` como
   respaldo). Exigir `formatId`/`publisherId` igual que el alta actual.
2. Crear el manga por el camino existente:
   `saveOrUpdateManga(db, { id: 0, name, volumes, formatId, publisherId, isAdult })`.
3. `await linkCover(db, dataDir, { mangaId: manga.id, candidate })` dentro de `try/catch`: si falla,
   `coverUrl = null` y `coverError = true` (el alta se conserva; nunca se revierte el manga).
4. Devolver `{ manga, coverUrl, coverError }`.

Registro del canal en `electron/preload.cjs` (lista de canales permitidos).

> El payload se compone en el renderer con lo elegido por el usuario (`name` prefijado desde
> `candidate.title` pero editable, `volumes`, `formatId`, `publisherId`, `isAdult`). El candidato viaja
> completo para que `linkCover` tenga `coverUrl`, `provider` e `isAdult`.

### Adaptador — `mangacount.client/src/api/localAdapter.js`

```js
export const mangaCreateFromCandidate = (payload) =>
  apiCall('manga:create-from-candidate', '/api/manga/from-candidate', json(payload), payload);
```

+ entrada en el shim de fetch: `{ method: 'POST', pattern: /^\/api\/manga\/from-candidate$/, build: (_m, o) => ['manga:create-from-candidate', jsonBody(o)] }`.

### UI — `mangacount.client/src/components/AddMangaModal.jsx` (sólo `!editManga`)

- **Búsqueda**: input + botón Buscar arriba del campo Nombre; dispara con Enter/botón (sin búsqueda
  automática por tecleo, para no floodear AniList). Estados `searching` / `noResults` / `searchError`.
- **Resultados**: lista de candidatos reutilizando el estilo de `LinkCoverModal` (miniatura, título,
  formato/año/volúmenes, fuente `AniList`/`MangaDex`, badge `+18`), con el patrón "reveal" del
  contenido adulto cuando `showAdultCovers` está apagado.
- **Selección** (`selectedCandidate` en estado): prefija `formData.name = candidate.title`,
  `formData.volumes = candidate.volumes ?? ''`, `formData.isAdult = candidate.isAdult === true`; muestra
  una **ficha** con la portada elegida y un botón para quitar la selección. Formato y editorial quedan
  como estén.
- **Submit**: con `selectedCandidate` → `mangaCreateFromCandidate({ candidate, name, volumes, formatId,
  publisherId, isAdult })`; sin él → flujo actual `POST /api/manga` (`manga:upsert`). Si
  `coverError`, se llama `onSuccess()` igual y se avisa que la portada no se pudo descargar.
- **Duplicado**: comparar `name` (trim + lowercase) contra el prop `mangas`; si coincide, mostrar un
  aviso no bloqueante antes de enviar.
- **Edición** (`editManga`): sin buscador; el modal se comporta como hoy.

### i18n — `shared/i18n/en.js` y `es.js`

Claves nuevas bajo `addManga.*` (buscar, buscando, sin resultados, error de búsqueda, candidato,
seleccionar/quitar, portada vinculada, portada no disponible, aviso de duplicado) y las de error
necesarias bajo `err.*`. Paridad ES/EN obligatoria (`shared/i18n/i18n.test.js`).

## Validation

- **Handler** (`electron/main/ipc/handlers.test.js` / `covers.test.js`):
  - crea con candidato → manga persistido + `MangaExternalRef` + portada cacheada;
  - candidato +18 → `Manga.IsAdult` verdadero;
  - `fetchImpl` que falla al descargar → manga creado, `coverError: true`, sin ref, alta conservada;
  - validaciones: candidato inválido, sin nombre, sin formato/editorial.
- **Renderer** (`mangacount.client/src/test/components/AddMangaModal.test.jsx`):
  - buscar llama `coverSearch` con el query;
  - elegir prefija título/volúmenes/+18 y muestra la ficha;
  - submit con candidato llama `mangaCreateFromCandidate` con el payload correcto;
  - submit sin candidato usa `manga:upsert`;
  - `noResults`/`searchError` y aviso de duplicado muestran el texto i18n;
  - en edición no aparece el buscador.
- **i18n**: paridad de claves ES/EN.
- **Regresión**: tests de `LinkCoverModal`, `CollectionView` (auto-match) y `manga:upsert` verdes.
- **Gates**: `npm test`, `npm run test:renderer:coverage`, `npm run lint:renderer`,
  `npm run build:renderer`. Prueba funcional: buscar un título real, elegirlo, confirmar y ver en la
  colección el manga con el título de AniList y su portada; buscar algo inexistente y crear el manga
  normalmente.
