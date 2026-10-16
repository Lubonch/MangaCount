# Proposal: Filtrar contenido +18 en la búsqueda de portadas (AniList)

## Problem

La búsqueda de portadas —**manual** (Manga Library → 🖼️), **auto-match** al agregar y **bulk**
("Traer portadas faltantes")— llama a AniList sin filtrar contenido para adultos: el query
`media(search: $search, type: MANGA, sort: SEARCH_MATCH)` **no** pasa `isAdult`. La propia API define
`isAdult` como filtro ("intended for 18+ adult audiences") y su página de browse lo usa por defecto en
`false`. Como consecuencia, aparecen resultados **+18 con nombres similares** que ensucian la elección y
pueden colarse en el **auto-match** (coincidencia por título normalizado).

## Proposed change

- **Filtrar por defecto** el contenido +18 en `searchManga` (variante de query con `isAdult: false`).
- Nueva preferencia **`showAdultCovers`** (default **OFF**) con un **toggle en Settings ▸ Portadas
  (AniList)**. Con el toggle **ON** se buscan **todos** los resultados y cada candidato +18 se marca con
  un **badge `+18`** en la lista, para elegir a conciencia.
- El filtro aplica a las **tres rutas** (buscar, auto-match, bulk) porque todas pasan por `searchManga`.

## Scope

**In scope**: `services/covers.js` (variante de query + mapeo del campo `isAdult`), `services/prefs.js`
(`showAdultCovers`), `ipc/handlers.js` (`app:config-get/set` + flag en `cover:search`/`cover:auto`),
`SettingsModal.jsx` (toggle en la sección Portadas), `LinkCoverModal.jsx` (badge +18), tests.

**Out of scope**: blur de miniaturas +18; filtros por `genre_not_in`/tags; cambios en el engine local de
recomendaciones o en `catalog.json`.

## Risks

- **Semántica de `isAdult` con `null`**: se evita usar `null`; se elige entre **dos variantes de query**
  (con `isAdult: false` / sin el argumento), que es determinista.
- **Ocultar de más**: `isAdult` mapea a contenido explícito 18+, **no** a demografía (seinen/josei no se
  ven afectados).
- **Rate limit**: sin cambio (sigue siendo **1 request** por búsqueda, con o sin el filtro).
- **Gate de cobertura ≥90%**: el nuevo camino (selección de query + flag desde prefs + badge) debe quedar
  cubierto por tests.
- **Prefs existentes**: sin `showAdultCovers` → `resolvePrefs` cae al default `false` (sin migración).
