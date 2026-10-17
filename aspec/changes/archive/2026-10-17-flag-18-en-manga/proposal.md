# Proposal: Flag +18 en la entidad manga

**Issue:** [#103](https://github.com/Lubonch/MangaCount/issues/103)

## Problem

Hoy el indicador de contenido adulto (`IsAdult`) vive en `MangaExternalRef`, es decir, en el **vínculo
de portada** (`electron/main/db/repositories/manga-external-refs.js`). El blur y el badge `+18` de la
colección se derivan de ahí (`coverMap` → `CollectionView`).

Consecuencias:

- Si el usuario **sube una portada desde su PC**, `linkLocalCover` guarda `isAdult: false`
  (`covers.js`) y no hay forma de marcar la serie como +18 → la portada queda **sin blur**.
- El flag depende de la portada: desvincular o cambiar la portada puede perder el dato.
- El TSV de import/export no transporta este dato, así que no hay otra vía para corregirlo.

## Proposed change

Mover el flag a la **entidad `manga`** como única fuente de verdad para la UI:

1. **Esquema**: nueva columna `Manga.IsAdult` (`INTEGER NOT NULL DEFAULT 0`), migración de
   `SCHEMA_VERSION` 4→5 con `ensureColumn` (idempotente, aditiva) y **backfill** de los mangas cuyo
   vínculo activo tenga `IsAdult = 1`.
2. **DTO y repositorio**: `listMangas`/`getMangaById` exponen `isAdult`; `createManga`/`updateManga` y
   `saveOrUpdateManga` lo aceptan.
3. **Asignación automática**: al vincular una portada de AniList cuyo candidato es `isAdult`, se
   **promueve** `Manga.IsAdult` a verdadero (aplica a `cover:link` y al auto-match). Nunca se apaga
   automáticamente.
4. **Asignación manual**: checkbox **“Contenido +18”** en el alta/edición de manga (`AddMangaModal`) que
   viaja en `manga:upsert`.
5. **UI**: el blur/badge de la colección se deriva del `isAdult` del manga (el mapa de portadas lo
   incluye desde la entidad manga).

## Scope

**In scope**

- `electron/main/db/schema.sqlite.sql` (columna en el `CREATE TABLE Manga`), `electron/main/db/client.js`
  (`SCHEMA_VERSION` 5 + backfill) y sus tests.
- `electron/main/db/repositories/mangas.js`, `electron/main/services/catalog-base.js` y tests.
- `electron/main/services/covers.js`: `coverMap` toma el flag del manga y `linkCover` promueve el flag
  cuando el candidato es +18; tests.
- `mangacount.client/src/components/AddMangaModal.jsx` (checkbox + payload) y tests.
- Delta specs de `mangas` y `frontend-web`.

**Out of scope**

- Quitar la columna `MangaExternalRef.IsAdult` (se mantiene por compatibilidad; deja de ser la fuente
  de la UI).
- Llevar el flag en el TSV de import/export.
- Cambiar el filtro de búsqueda de AniList (`showAdultCovers`) o el modo de revelado.
- Backfill re-consultando AniList.

## Risks

- **Regresión en el blur de las cards**: mitigación → `coverMap` sigue exponiendo `{ url, isAdult }`; solo
  cambia la fuente del flag, y el backfill conserva el estado actual de las portadas ya marcadas.
- **Pérdida de marcas manuales**: mitigación → el vínculo automático solo **promueve** a verdadero; apagar
  el flag es una acción manual explícita.
- **Consumidores del DTO de manga**: agregar `isAdult` es aditivo, pero tests con `deepEqual` sobre el
  DTO pueden romper; mitigación → actualizarlos en el mismo change.
- **Migración sobre bases existentes**: mitigación → `ensureColumn` + backfill idempotente, sin DROP ni
  rename, con la columna naciendo en 0.
- **Flag en mangas sin portada**: el mapa de portadas solo incluye mangas con archivo de portada; un manga
  marcado sin portada no tiene nada que difuminar (fuera de alcance).
