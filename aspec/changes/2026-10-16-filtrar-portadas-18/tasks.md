# Tasks: Filtrar portadas +18 (AniList)

## Fase 1 — Query y servicio (main)

- [x] `covers.js`: dos variantes de query (`SEARCH_FILTERED` con `isAdult: false`, `SEARCH_ALL` sin el
      argumento) y `searchManga(query, { includeAdult = false, ... })` que elige según el flag.
- [x] Incluir `isAdult` en la selección y mapearlo al candidato (`{ ..., isAdult: Boolean }`).
- [x] Mantener intactas las rutas existentes (rate limit/backoff, validación de imagen, `pickAutoMatch`).

## Fase 2 — Preferencia + IPC

- [x] `prefs.js`: `DEFAULT_PREFS.showAdultCovers = false`.
- [x] `handlers.js`: `app:config-get` devuelve `showAdultCovers`; `app:config-set` lo persiste.
- [x] `handlers.js`: `cover:search` y `cover:auto` leen `loadResolvedPrefs(dataDir).showAdultCovers` y lo
      pasan como `includeAdult` a `searchManga` / `autoMatchCover`.

## Fase 3 — UI (renderer)

- [x] `SettingsModal.jsx` (sección **Portadas (AniList)**): toggle "Incluir resultados +18" ligado a
      `showAdultCovers` (vía `app:config-get/set`), con hint de que por defecto están ocultos.
- [x] `LinkCoverModal.jsx`: mostrar un **badge `+18`** en el candidato cuando `candidate.isAdult`.
- [x] `LinkCoverModal.css`: estilo del badge.

## Fase 4 — Tests y verificación

- [x] `covers.test.js`: variante de query según `includeAdult` (fetch fake) + mapeo de `isAdult`.
- [x] `handlers` (roundtrip): `cover:search` respeta `showAdultCovers` (default filtra; ON sin filtro).
- [x] `SettingsModal.test.jsx`: el toggle lee/persiste `showAdultCovers`.
- [x] `LinkCoverModal.test.jsx`: badge `+18` presente/ausente según `candidate.isAdult`.
- [x] `npm run test:coverage` + `npm run test:renderer:coverage` en verde (≥90%); `npm run lint:renderer`
      sin errores; `npm run build:renderer`.
- [x] `ancleto-security` y verificación cruzada contra proposal/design/specs.
