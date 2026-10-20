# Tasks: Alta de manga buscando el título en AniList

## Fase 1 — Canal IPC

- [x] 1.1 Agregar `'manga:create-from-candidate'` en `electron/main/ipc/handlers.js`:
      valida `candidate.id` y `name` (o `candidate.title`), exige `formatId`/`publisherId`, crea el manga
      con `saveOrUpdateManga` y llama `linkCover` en `try/catch`.
- [x] 1.2 Devolver `{ manga, coverUrl, coverError }`; el manga se crea aunque falle la portada.
- [x] 1.3 Registrar el canal en `electron/preload.cjs`.
- [x] 1.4 Tests del handler: alta con candidato (manga + ref + portada cacheada), candidato +18 →
      `IsAdult`, fallo de descarga → `coverError: true` y manga creado, y validaciones.

## Fase 2 — Adaptador del renderer

- [x] 2.1 `mangaCreateFromCandidate` en `mangacount.client/src/api/localAdapter.js`.
- [x] 2.2 Entrada `POST /api/manga/from-candidate` en el shim de fetch y en el test del adaptador.

## Fase 3 — UI del modal de alta

- [x] 3.1 `AddMangaModal.jsx`: campo/botón de búsqueda (Enter/botón) que llama `coverSearch(query)`,
      con estados `searching`/`noResults`/`searchError` (sólo en creación).
- [x] 3.2 Lista de candidatos con portada, título, fuente, formato/año/volúmenes y badge `+18`, con el
      patrón reveal del contenido adulto cuando `showAdultCovers` está apagado.
- [x] 3.3 Selección de candidato: prefija nombre (editable), volúmenes y `isAdult`; ficha con la
      portada elegida y botón para quitar la selección.
- [x] 3.4 Submit: con candidato → `mangaCreateFromCandidate(...)`; sin candidato → `manga:upsert` actual;
      con `coverError` avisar y cerrar igual.
- [x] 3.5 Aviso no bloqueante de título duplicado contra el prop `mangas`.
- [x] 3.6 CSS mínimo para la búsqueda, la ficha de la portada y el aviso (`AddMangaModal.css`).

## Fase 4 — i18n

- [x] 4.1 Claves nuevas `addManga.*` (buscar/buscando/sin resultados/error, candidato, seleccionar,
      quitar, portada vinculada/no disponible, aviso de duplicado) en `shared/i18n/es.js` y `en.js`.
- [x] 4.2 Verificar paridad ES/EN (`shared/i18n/i18n.test.js`).

## Fase 5 — Verificación

- [x] 5.1 Tests de `AddMangaModal` (buscar, seleccionar, submit con/sin candidato, sin resultados, error,
      duplicado, sin buscador en edición).
- [x] 5.2 `npm test`
- [x] 5.3 `npm run test:renderer:coverage`
- [x] 5.4 `npm run lint:renderer`
- [x] 5.5 `npm run build:renderer`
- [x] 5.6 Prueba funcional: buscar un título real, elegirlo, confirmar y ver el manga con el título de
      AniList y su portada; buscar algo inexistente y crear el manga normalmente.
