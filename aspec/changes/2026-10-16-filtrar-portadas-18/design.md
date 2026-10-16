# Design: Filtro de portadas +18

## Approach

- `searchManga(query, { fetchImpl, includeAdult = false, ... })` elige la **variante de query**:
  - `includeAdult === false` (default) → query con `isAdult: false` (oculta +18).
  - `includeAdult === true` → query **sin** el argumento (devuelve todos).
- La selección incluye el campo **`isAdult`** para poder marcar candidatos.
- Preferencia: `DEFAULT_PREFS.showAdultCovers = false` en `services/prefs.js`, expuesta por
  `app:config-get` / `app:config-set`.
- Los handlers `cover:search` y `cover:auto` leen `loadResolvedPrefs(dataDir).showAdultCovers` y lo pasan
  a `searchManga` como `includeAdult`. **Un solo punto** cubre buscar + auto-match + bulk.
- Renderer: cada candidato trae `isAdult`; `LinkCoverModal` muestra un **badge `+18`** cuando es true.

## Architecture

```
Settings toggle ─► app:config-set ─► preferences.json { showAdultCovers }
                                                 │
cover:search / cover:auto ─► loadResolvedPrefs ─► searchManga(q, { includeAdult })
                                                 │
                        includeAdult=false (default)   │   includeAdult=true (toggle ON)
                                                 ▼
                     candidates[{ …, isAdult }]  ─► LinkCoverModal  ([+18] si isAdult)
```

## Query variants

```graphql
# default — oculta +18
query ($search: String) {
  Page(page: 1, perPage: 10) {
    media(search: $search, type: MANGA, sort: SEARCH_MATCH, isAdult: false) {
      id title { romaji english native } coverImage { large medium } format volumes startDate { year } isAdult
    }
  }
}

# toggle ON — todos (misma query SIN `isAdult: false`)
```

Ambas variantes son constantes seleccionables (no se depende de `isAdult: null`).

## Validation

- **Unit (main)**: `searchManga` con `fetchImpl` fake verifica la variante de query/`variables` enviada
  según `includeAdult`, y que el mapeo incluye `isAdult`.
- **Handlers**: `cover:search` / `cover:auto` propagan el flag desde `preferences.json` (casos
  `showAdultCovers` false y true).
- **Renderer**: el toggle de Settings persiste (`app:config-set`); `LinkCoverModal` muestra el badge
  cuando `candidate.isAdult` y **no** cuando es false.
- **Coverage**: los gates existentes exigen ≥90% (main y renderer) → el nuevo camino debe quedar cubierto.
