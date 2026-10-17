# Tasks: Flag +18 en la entidad manga

## Fase 1 — Esquema y migración

- [x] `schema.sqlite.sql`: agregar `IsAdult INTEGER NOT NULL DEFAULT 0` a `CREATE TABLE Manga`.
- [x] `client.js`: subir `SCHEMA_VERSION` a 5, `ensureColumn` de `Manga.IsAdult` y backfill
      `UPDATE Manga SET IsAdult = 1 WHERE Id IN (SELECT MangaId FROM MangaExternalRef WHERE IsAdult = 1)`.
- [x] Tests de migración: base v4 con ref +18 → manga en 1; manga sin ref → 0; re-ejecución idempotente;
      base nueva incluye la columna.

## Fase 2 — Repositorio y servicio

- [x] `mangas.js`: exponer `isAdult` en `SELECT` y persistirlo en `createManga`/`updateManga`.
- [x] `catalog-base.js`: propagar `isAdult` (default `false`) en `saveOrUpdateManga`.
- [x] Tests de repositorio/servicio: DTO con `isAdult`, alta y edición lo persisten.

## Fase 3 — Vínculo de portada

- [x] `covers.js`: `coverMap` toma `isAdult` de `Manga` (JOIN) en vez del ref.
- [x] `covers.js`: `linkCover` promueve `Manga.IsAdult = true` cuando `candidate.isAdult === true`
      (sin apagarlo nunca); `linkLocalCover` no lo toca.
- [x] Tests: vincular candidato +18 deja el manga en true; candidato no adulto no lo apaga; el mapa
      refleja el flag del manga.

## Fase 4 — UI de alta/edición de manga

- [x] `AddMangaModal.jsx`: checkbox “Contenido +18”, prellenado desde `editManga.isAdult` y enviado en
      el payload de `manga:upsert`.
- [x] `AddMangaModal.test.jsx`: cubrir el checkbox (alta, edición y payload).

## Fase 5 — Gates y verificación

- [x] `npm test` en verde.
- [x] `npm run test:coverage` en verde (main ≥90%).
- [x] `npm run test:renderer:coverage` en verde (≥90%).
- [x] `npm run lint:renderer` sin errores.
- [x] `npm run build:renderer` sin errores.
- [x] Verificación manual: marcar un manga +18 sin portada adulta y ver el blur/badge en la colección;
      vincular una portada de AniList +18 y ver que el manga queda marcado.
