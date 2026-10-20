# Proposal: Alta de manga buscando el título en AniList

## Problem

Hoy el alta de un manga es **100% manual**: en `AddMangaModal` el usuario escribe el título y elige
formato/editorial, y el submit va a `manga:upsert` (`saveOrUpdateManga`). La portada se vincula recién
**después**, de forma best-effort: cuando `CollectionView` detecta un manga nuevo dispara `cover:auto`
(`autoMatchCover`), que **sólo vincula si hay un único candidato de AniList cuyo título normalizado
coincide exactamente**. Si el usuario escribió el título en español/diferente, o hay varias obras con
ese nombre, **no vincula** y queda la portada generada.

Consecuencias:

- El usuario tipea el título **dos veces** (una para crear y otra para buscar la portada en
  `LinkCoverModal`), en pantallas distintas.
- El "título adecuado" de AniList (romaji/english, portada, volúmenes, formato) se pierde: el manga
  suele quedar con un título local que no coincide con la fuente, y sin portada.
- El vínculo externo (`MangaExternalRef`) queda vacío, así que la obra tampoco se excluye de las
  recomendaciones como "ya la tengo".

La app **ya integra AniList** sin API key (`electron/main/services/covers.js`: `searchManga`,
`linkCover`, `pickAutoMatch`, `normalizeTitle`) y ya expone la búsqueda por el canal `cover:search`
(respetando la preferencia `showAdultCovers`). Falta únicamente aprovecharla **en el alta**.

## Proposed change

- **Buscador en el modal de alta** (`AddMangaModal`, sólo en modo creación): un campo de búsqueda que
  reutiliza `cover:search` (AniList + fallback MangaDex ya existentes) y muestra candidatos con portada,
  título, año, volúmenes, fuente y badge `+18`, con el mismo comportamiento de contenido adulto que
  `LinkCoverModal`.
- **Selección = alta completa en un paso**: al elegir un candidato se **prefijan** el título de AniList
  (editable), los volúmenes y el flag +18 del candidato. Al confirmar, un canal nuevo
  `manga:create-from-candidate` crea el manga **y** descarga/cachea la portada y deja el vínculo externo
  en la misma operación, todo desde una sola pantalla. El formato y la editorial quedan a cargo del
  usuario (AniList no sabe qué editorial local publicó cada título).
- **Alta manual intacta**: si el usuario no busca o no encuentra, crea el manga "normal" por
  `manga:upsert` exactamente como hoy.
- **Best-effort de portada**: si la descarga de la portada falla, el manga **igual se crea** y la UI lo
  avisa (la portada se puede vincular después en `LinkCoverModal`). El alta nunca se pierde.
- **Aviso de duplicado** no bloqueante cuando ya existe un manga con el mismo título normalizado.
- **i18n ES/EN** (paridad) y tests de handler, renderer e i18n.

## Scope

**In scope**

- Canal IPC `manga:create-from-candidate` (`createManga` + `linkCover` best-effort) en
  `electron/main/ipc/handlers.js`, registrado en `electron/preload.cjs` y en el adaptador
  (`mangacount.client/src/api/localAdapter.js` + shim de fetch).
- UI de búsqueda y selección de candidatos en `AddMangaModal.jsx` (reutilizando el estilo de
  `LinkCoverModal`), sólo en creación.
- Prefijado de título/volúmenes/+18 desde el candidato, con ficha de la portada elegida y opción de
  quitar la selección.
- Aviso no bloqueante de título duplicado.
- Claves i18n nuevas en `shared/i18n/en.js` y `es.js` (paridad obligatoria) y tests.

**Out of scope**

- Edición de manga: el buscador es sólo en el alta (la edición conserva el modal actual).
- Mapear formato/editorial de AniList a los catálogos locales (AniList no conoce editoriales locales).
- Importación masiva de mangas desde AniList.
- Recomendaciones: ya cubiertas por el change `recomendaciones`; acá sólo se usa la búsqueda de títulos.
- Cambiar el auto-match (`cover:auto`) o `LinkCoverModal`, que siguen igual para mangas ya creados.
- Cambios de esquema de base de datos: se reutiliza `MangaExternalRef`.

## Risks

- **Rate limit de AniList** (30 req/min degradado, ~90/min): la búsqueda del modal es **explícita**
  (una búsqueda por acción del usuario, no automática) y reutiliza el backoff/`Retry-After` de
  `searchManga`; ante `429` se muestra error y el alta manual sigue disponible.
- **Fallo de descarga de portada tras crear el manga**: mitigado con best-effort explícito — el manga se
  crea igual y se informa; el vínculo puede rehacerse luego en `LinkCoverModal`.
- **Título duplicado**: mitigado con un aviso no bloqueante contra la colección cargada; no impide un
  alta legítima con título repetido (p. ej. tomos de una misma serie).
- **Contenido +18**: el candidato adulto se marca y promueve `Manga.IsAdult` vía `linkCover`
  (comportamiento existente) y respeta `showAdultCovers`.
- **Regresión**: el alta manual (`manga:upsert`), el auto-match de `CollectionView` y `LinkCoverModal`
  deben seguir verdes.
