# Tasks: MangaDex como fuente secundaria de portadas

## Fase 1 — Cliente MangaDex

- [x] `covers.js`: constantes `MANGA_PROVIDER` y `MANGA_URL`.
- [x] `covers.js`: `searchMangaDexOnce(query, { fetchImpl, timeoutMs, includeAdult })` → candidatos con
      `source: 'mangadex'`, portada `uploads.mangadex.org/covers/<id>/<file>` e `isAdult` por
      `contentRating`.
- [x] `covers.js`: agregar `source: 'anilist'` a los candidatos de AniList.
- [x] Tests: mapeo de MangaDex (fake fetch), filtro +18 por `contentRating`.

## Fase 2 — Fallback en búsqueda y auto-match

- [x] `covers.js`: `searchManga` consulta MangaDex solo si AniList devolvió 0 candidatos.
- [x] `covers.js`: `autoMatchCover` intenta AniList y, si no hay match único, MangaDex.
- [x] `covers.js`: `linkCover` usa `candidate.provider ?? PROVIDER` (ref y `clearOtherRefs`).
- [x] Tests: fallback en `searchManga`, auto-match MangaDex, `linkCover` con provider `mangadex`.

## Fase 3 — UI

- [x] `LinkCoverModal.jsx`: badge de fuente (`AniList`/`MangaDex`) por candidato.
- [x] `LinkCoverModal.css`: estilo del badge de fuente.
- [x] `LinkCoverModal.test.jsx`: cubrir el badge.

## Fase 4 — Gates y verificación

- [x] `npm test` en verde.
- [x] `npm run test:coverage` en verde (main ≥90%).
- [x] `npm run test:renderer:coverage` en verde (≥90%).
- [x] `npm run lint:renderer` sin errores.
- [x] `npm run build:renderer` sin errores.
- [x] Verificación manual: buscar una serie que no esté en AniList y confirmar que aparecen candidatos
      de MangaDex con su badge; vincular uno y ver la portada en la colección.
