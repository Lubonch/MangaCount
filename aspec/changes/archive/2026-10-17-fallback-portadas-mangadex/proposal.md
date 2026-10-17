# Proposal: MangaDex como fuente secundaria de portadas

## Problem

La búsqueda de portadas usa **solo AniList**. Cuando una serie no está en AniList (o el match falla),
el usuario queda sin candidatos y tiene que subir la portada a mano. AniList y MyAnimeList comparten
base, así que agregar Jikan/MAL no aportaría casi nada nuevo; **MangaDex** sí tiene catálogo propio
(manga, manhwa, manhua y ediciones que AniList no lista) y expone portadas por API pública sin key.

## Proposed change

Agregar **MangaDex** como **fallback** de AniList en la búsqueda y en el auto-match:

1. `searchMangaDex(query, { includeAdult })`: `GET https://api.mangadex.org/manga?title=…&limit=…&includes[]=cover_art`
   y mapea a los mismos candidatos (`{ id, title, altTitles, coverUrl, isAdult, source }`), con
   `source: 'mangadex'`. `isAdult` sale de `contentRating` (`erotica`/`pornographic` → verdadero).
2. `searchManga`: consulta **AniList primero**; si devuelve **0 candidatos**, consulta MangaDex.
3. `autoMatchCover`: intenta el match único de AniList; si no hay, intenta MangaDex (misma regla de
   match único por título normalizado).
4. `linkCover`: guarda la **procedencia** del candidato (`provider`), en vez de asumir siempre
   `anilist`. `clearOtherRefs` respeta ese provider. `coverMap`/`statusCover` ya son provider-agnósticos.
5. UI: el modal de portada muestra un badge chico con la **fuente** del candidato (`AniList`/`MangaDex`).

## Scope

**In scope**

- `electron/main/services/covers.js`: `searchMangaDex`, fallback en `searchManga`, `autoMatchCover` y
  `linkCover` provider-aware; `source` en los candidatos de AniList.
- `mangacount.client/src/components/LinkCoverModal.jsx` (+ `.css`): badge de fuente.
- Tests: `covers.test.js`, `handlers.test.js` y `LinkCoverModal.test.jsx`.

**Out of scope**

- Jikan/MyAnimeList (base compartida con AniList).
- `refreshCover`/bulk de Settings quedan **AniList-only** (`cover:fetch` no está cableado en la UI).
- Scraping de editoriales.
- Búsqueda por ISBN.

## Risks

- **Match incorrecto en MangaDex**: su búsqueda es difusa (probado: “berserk” devuelve títulos que no
  son). Mitigación → se reusa la regla de **match único por título normalizado** (`pickAutoMatch`); si
  hay 0 o >1, no vincula.
- **Rate limit**: MangaDex limita por IP (~5 req/s) y responde `429`. Mitigación → reusar el manejo de
  `Retry-After`/backoff existente y consultar MangaDex **solo** cuando AniList no dio nada.
- **Cobertura de títulos locales (ES/AR)**: MangaDex suele tener el título en inglés/japonés. Mitigación
  → es un **fallback**; el usuario siempre puede buscar por otro título o subir la portada local.
- **+18**: el `contentRating` de MangaDex se mapea a `isAdult` y respeta `showAdultCovers` igual que
  AniList. Mitigación → test explícito.
- **Procedencia en el vínculo**: guardar `provider` distinto cambia qué ref se considera “activo”.
  Mitigación → `getActiveRef` ya es provider-agnóstico y hay un solo ref por manga.
