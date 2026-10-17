# Tasks: Blur y badge de portadas +18

## Fase 1 — Esquema y migración (main)

- [x] `schema.sqlite.sql`: agregar `IsAdult INTEGER NOT NULL DEFAULT 0` al `CREATE TABLE MangaExternalRef`
      (bases nuevas).
- [x] `client.js`: subir `SCHEMA_VERSION` a `4` y agregar el helper idempotente
      `ensureColumn(db, 'MangaExternalRef', 'IsAdult', 'IsAdult INTEGER NOT NULL DEFAULT 0')`
      (`PRAGMA table_info` antes del `ALTER`); ejecutarlo dentro del bloque `version < SCHEMA_VERSION`,
      tras `db.exec(schema)`.
- [x] `client.js`: actualizar el comentario de versión documentando que v4 es el **primer `ALTER`
      no aditivo** del proyecto y por qué es seguro (idempotente, `DEFAULT 0`, sin backfill).

## Fase 2 — Repositorio y servicio de portadas (main)

- [x] `manga-external-refs.js`: agregar `IsAdult AS isAdult` al `SELECT` del DTO y persistir `isAdult`
      en `upsertRef` (columna + `excluded.IsAdult` en el `ON CONFLICT`).
- [x] `covers.js`: `linkCover` pasa `candidate.isAdult === true` a `upsertRef`.
- [x] `covers.js`: `linkLocalCover` pasa `isAdult: false` a `upsertRef`.
- [x] `covers.js`: `coverMap(db)` devuelve `{ [mangaId]: { url, isAdult } }` (el indicador desde el
      `ref.isAdult` del vínculo activo).

## Fase 3 — Consumidores del `coverMap` (renderer)

- [x] `CollectionView.jsx`: usar `coverMap[entry.manga.id]?.url` para render y `?.isAdult` para el blur;
      actualizar `handleCoverLinked(mangaId, cover)` para aceptar `{ url, isAdult }` o `null`.
- [x] `SettingsModal.jsx`: en el bulk, tratar faltantes con `!covers[manga.id]?.url` (no depender de la
      forma del valor).
- [x] `CollectionView.css`: clases `.card-cover--adult` (`filter: blur(...)`) + variantes de reveal
      (hover/click) y estilo del badge `+18` sobre la card, usando design tokens y respetando
      `prefers-reduced-motion`.

## Fase 4 — Blur y reveal (renderer)

- [x] `LinkCoverModal.jsx`: envolver la miniatura del candidato +18 con la clase de blur (blur **siempre**,
      independiente del toggle) y reutilizar el badge `+18`; agregar reveal (hover o click según el pref).
- [x] `LinkCoverModal.css`: clases de blur/reveal del candidato sobre tokens.
- [x] `App.jsx`: cargar `showAdultCovers` vía `appConfigGet()` y pasarlo a `CollectionView` y `Sidebar`;
      recargarlo al cerrar `SettingsModal`.
- [x] `Sidebar.jsx`: recibir `showAdultCovers` y pasarlo a `LinkCoverModal`.
- [x] `CollectionView.jsx` / `LinkCoverModal.jsx`: implementar el modo de reveal según el prop
      (`hover` con pref ON; `click` con pref OFF), asegurando que el click de reveal no rompa la acción
      real de la card.

## Fase 5 — Tests main

- [x] Migración: base **v3** sin `IsAdult` → se agrega la columna, `user_version` = 4, filas existentes en
      `0`; reabrir es idempotente (no falla si la columna ya está).
- [x] Base **nueva**: la tabla nace con la columna `IsAdult`.
- [x] `manga-external-refs`: `upsertRef` persiste y devuelve `isAdult`.
- [x] `covers.test.js`: `linkCover` guarda `isAdult` true y false; `linkLocalCover` guarda `false`;
      `coverMap` devuelve `{ url, isAdult }` por manga.

## Fase 6 — Tests renderer

- [x] `CollectionView.test.jsx`: card con `isAdult` true → clase de blur + badge `+18`; false → sin blur
      ni badge; reveal por hover (pref ON) y por click (pref OFF); actualizar mocks de `coverAll` a la
      nueva forma.
- [x] `LinkCoverModal.test.jsx`: candidato +18 → miniatura difuminada con badge, con el pref ON y OFF.
- [x] `App.test.jsx` / `Sidebar.test.jsx`: el pref se carga al montar y se refresca al cerrar Settings;
      `Sidebar` lo propaga al modal.

## Fase 7 — Gates y verificación

- [x] `npm run lint:renderer` sin errores (mirar la línea resumen completa de ESLint).
- [x] `npm run test:coverage` (main) en verde (≥90% stmts/branches/funcs/lines).
- [x] `npm run test:renderer:coverage` en verde (≥90%).
- [x] `npm run build:renderer` sin errores.
- [ ] Verificación manual: un manga con portada +18 vinculada se ve difuminado con badge en la card y en
      los candidatos; el reveal cambia de hover a click al alternar el toggle de Settings y cerrar.
- [ ] `ancleto-security` + verificación cruzada contra proposal/design/specs.
- [x] Al archivar, reconciliar los specs `mangas`/`frontend-web` afectados.
