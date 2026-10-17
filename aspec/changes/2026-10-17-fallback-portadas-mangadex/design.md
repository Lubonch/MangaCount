# Design: Fallback de portadas con MangaDex

## Approach

MangaDex entra **solo como fallback**: si AniList no devuelve candidatos, se consulta su API pública y
se mapean los resultados al mismo shape de candidato, agregando `source`.

### API de MangaDex (verificada)

```
GET https://api.mangadex.org/manga
  ?title=<query>&limit=10
  &includes[]=cover_art
  &contentRating[]=safe&contentRating[]=suggestive   (+ erotica/pornographic si includeAdult)
```

- `data[].attributes.title` es un objeto multi-idioma; se usa `en`/`ja-ro`/primer valor.
- `data[].attributes.altTitles` → array de objetos multi-idioma → `altTitles` planos.
- `data[].attributes.contentRating` ∈ `safe | suggestive | erotica | pornographic`.
- Portada: relación `type: 'cover_art'` → `attributes.fileName`; URL
  `https://uploads.mangadex.org/covers/<mangaId>/<fileName>` (https → pasa `isAllowedCoverUrl`).

### Código

- `electron/main/services/covers.js`
  - `MANGA_PROVIDER = 'mangadex'` y `MANGA_URL = 'https://api.mangadex.org/manga'`.
  - `searchMangaDexOnce(query, { fetchImpl, timeoutMs, includeAdult })` → candidatos
    `{ id, title, altTitles, coverUrl, isAdult, source: 'mangadex' }`.
  - `searchManga(query, opts)`: AniList; si `results.length === 0` → MangaDex. Los candidatos de AniList
    suman `source: 'anilist'`.
  - `autoMatchCover`: `pickAutoMatch` sobre AniList; si `null`, `searchMangaDex` + `pickAutoMatch`; el
    vínculo usa el `provider` del candidato.
  - `linkCover`: `const provider = candidate.provider ?? PROVIDER`; `upsertRef`/`clearOtherRefs` con ese
    provider.
- `mangacount.client/src/components/LinkCoverModal.jsx`: badge de fuente por candidato
  (`AniList`/`MangaDex`) reusando el estilo de chip existente.
- `mangacount.client/src/components/LinkCoverModal.css`: estilo del badge de fuente.

## Architecture

```
cover:search / cover:auto
   └─ searchManga(query)
        ├─ AniList (GraphQL)  ──► candidatos { source: 'anilist' }
        └─ si 0 resultados ──► MangaDex (REST) ──► candidatos { source: 'mangadex' }
                                     │
                                     └─ linkCover(candidate.provider) ──► MangaExternalRef.Provider
```

`coverMap`/`statusCover`/`unlinkCover` no cambian: ya resuelven el ref activo sin fijar provider.

## Validation

- **Mapeo MangaDex**: con un `fetchImpl` fake, `searchMangaDex` devuelve título, altTitles, portada
  (`uploads.mangadex.org/covers/…`) e `isAdult` según `contentRating` (erotica/pornographic → true).
- **Fallback**: `searchManga` consulta AniList; con AniList vacío consulta MangaDex y devuelve sus
  candidatos con `source: 'mangadex'`; con AniList con resultados **no** consulta MangaDex.
- **Auto-match**: sin match en AniList, un match único en MangaDex vincula con `provider: 'mangadex'`;
  ambiguo → no vincula.
- **Vínculo**: `linkCover` con candidato `provider: 'mangadex'` guarda el ref con ese provider y
  `coverMap` lo expone igual.
- **+18**: con `includeAdult` apagado no se piden `erotica/pornographic`.
- **UI**: el modal muestra el badge de fuente.
- **Gates**: `npm test`, `npm run test:coverage`, `npm run test:renderer:coverage`,
  `npm run lint:renderer`, `npm run build:renderer`.
